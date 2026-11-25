import assert from 'node:assert/strict';
import {createHandler,verifySignature,observation} from '../supabase/functions/sellerpilot-stripe-webhook/handler.mjs';
const now=1795543200000,t=Math.floor(now/1000),secret='whsec_fixture_signing_secret',uid='11111111-1111-4111-8111-111111111111',sid='sub_fixture123',cid='cus_fixture123',price='price_fixtureStarter';
const env={SELLERPILOT_STRIPE_WEBHOOK_ENABLED:'true',SELLERPILOT_STRIPE_WEBHOOK_SECRET:secret,SELLERPILOT_STRIPE_TEST_KEY:'sk_test_fixture_not_real',SUPABASE_URL:'https://example.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture_service',SELLERPILOT_STRIPE_STARTER_PRICE:price,SELLERPILOT_STRIPE_PRO_PRICE:'price_fixtureProfessional'};
const evt={object:'event',id:'evt_fixture123',type:'invoice.paid',livemode:false,created:t,data:{object:{object:'invoice',livemode:false,parent:{subscription_details:{subscription:sid}},private:'not stored'}}};
const sub={object:'subscription',id:sid,livemode:false,customer:cid,status:'active',metadata:{sellerpilot_user_id:uid,sellerpilot_mode:'sandbox',sellerpilot_plan:'starter'},items:{has_more:false,data:[{quantity:1,current_period_end:t+2592000,price:{id:price,livemode:false,currency:'gbp',unit_amount:999,recurring:{interval:'month',interval_count:1}}}]},latest_invoice:{object:'invoice',livemode:false,customer:cid,currency:'gbp',amount_paid:999,status:'paid'},cancel_at_period_end:false};
const enc=new TextEncoder(),signing=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
const sign=async(raw,ts=t)=>'t='+ts+',v1='+Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',signing,enc.encode(ts+'.'+raw))),x=>x.toString(16).padStart(2,'0')).join('');
let calls=[],rows=new Map(),change={},dbFail=false;
const fetcher=async(url,init)=>{calls.push([url,init.method]);if(url.startsWith('https://api.stripe.com/')){assert.equal(init.method,'GET');return Response.json({...sub,...change})}assert.match(url,/sellerpilot_stripe_sandbox_events\?on_conflict=event_id$/);assert.equal(init.method,'POST');assert.equal(init.headers.Prefer,'resolution=ignore-duplicates,return=minimal');const row=JSON.parse(init.body);if(dbFail)return new Response(null,{status:500});if(!rows.has(row.event_id))rows.set(row.event_id,row);return new Response(null,{status:201})};
const call=async(event=evt,{config=env,header,raw,ts=t}={})=>{raw??=JSON.stringify(event);header??=await sign(raw,ts);return createHandler(k=>config[k]||'',fetcher,()=>now)(new Request('https://example.invalid/webhook',{method:'POST',headers:{'stripe-signature':header},body:raw}))};
const raw=JSON.stringify(evt);assert.equal(await verifySignature(enc.encode(raw),await sign(raw),secret,now),true);
calls=[];assert.equal((await call(evt,{header:'t='+t+',v1='+'0'.repeat(64)})).status,400);assert.equal(calls.length,0);
assert.equal((await call(evt,{ts:t-301})).status,400);assert.equal((await call(evt,{ts:t+301})).status,400);
assert.equal((await call(evt,{header:await sign(raw),raw:raw+' '})).status,400);
assert.equal((await call(evt,{config:{...env,SELLERPILOT_STRIPE_WEBHOOK_ENABLED:'false'}})).status,503);
assert.equal((await call(evt,{config:{...env,SELLERPILOT_STRIPE_TEST_KEY:'sk_live_fixture_not_real'}})).status,503);
assert.equal((await call({...evt,livemode:true})).status,400);assert.equal(calls.length,0);
assert.equal((await call({...evt,type:'charge.succeeded'})).status,200);assert.equal(calls.length,0);
assert.equal((await call()).status,200);assert.equal(rows.size,1);const row=rows.get(evt.id);assert.equal(row.latest_invoice_paid,true);assert.equal(row.price_matches,true);assert.equal(row.user_id,uid);assert.equal(row.period_end,new Date((t+2592000)*1000).toISOString());assert.ok(!JSON.stringify(row).includes('not stored'));assert.ok(!('access_granted' in row));
await call();assert.equal(rows.size,1);
change={status:'canceled',cancel_at_period_end:true,latest_invoice:{...sub.latest_invoice,status:'open'}};
assert.equal((await call({...evt,id:'evt_fixture456',type:'customer.subscription.deleted',data:{object:{id:sid,livemode:false}}})).status,200);assert.equal(rows.get('evt_fixture456').subscription_status,'canceled');assert.equal(rows.get('evt_fixture456').latest_invoice_paid,false);
change={metadata:{}};await call({...evt,id:'evt_fixture789'});assert.equal(rows.size,2);
change={livemode:true};assert.equal((await call()).status,502);
change={};dbFail=true;assert.equal((await call({...evt,id:'evt_fixture999'})).status,503);assert.equal(rows.size,2);
console.log('PASS: signed sandbox snapshot events, tamper/time checks, provider reconciliation, minimal append-only records, duplicate retries, failure handling, no entitlements.');

const priceMap={starter:price,professional:env.SELLERPILOT_STRIPE_PRO_PRICE};
const end=sub.items.data[0].current_period_end;
const updated={...evt,id:'evt_fixtureCancel',type:'customer.subscription.updated',data:{object:{id:sid,livemode:false}}};
for(const [fields,expected] of [[{cancel_at:end,cancel_at_period_end:false},true],[{cancel_at:null,cancel_at_period_end:true},true],[{cancel_at:null,cancel_at_period_end:false},false],[{cancel_at:end+3600,cancel_at_period_end:false},false],[{cancel_at:end-3600,cancel_at_period_end:false},false],[{cancel_at:String(end),cancel_at_period_end:false},false]]){const result=observation(updated,{...sub,...fields},priceMap,now);assert.equal(result.cancel_at_period_end,expected);assert.equal(result.subscription_status,'active');assert.equal(result.period_end,new Date(end*1000).toISOString())}
dbFail=false;change={cancel_at:end,cancel_at_period_end:false};assert.equal((await call(updated)).status,200);assert.equal(rows.get(updated.id).cancel_at_period_end,true);
change={cancel_at:null,cancel_at_period_end:false};assert.equal((await call({...updated,id:'evt_fixtureResume'})).status,200);assert.equal(rows.get('evt_fixtureResume').cancel_at_period_end,false);assert.equal(rows.get(updated.id).cancel_at_period_end,true);
console.log('PASS: scheduled cancellation via matching cancel_at, reversal and append-only history.');

// Explicit renewal failure, retry and recovery sequence; observations never confer entitlements.
const failedRenewal={...evt,id:'evt_fixtureRenewalFailed',type:'invoice.payment_failed'};
change={status:'past_due',latest_invoice:{...sub.latest_invoice,status:'open',amount_paid:0}};
assert.equal((await call(failedRenewal)).status,200);
assert.equal(rows.get(failedRenewal.id).subscription_status,'past_due');
assert.equal(rows.get(failedRenewal.id).latest_invoice_paid,false);
const beforeRetry=rows.size;assert.equal((await call(failedRenewal)).status,200);assert.equal(rows.size,beforeRetry);
const recovered={...evt,id:'evt_fixtureRenewalRecovered',type:'invoice.paid'};
change={};assert.equal((await call(recovered)).status,200);assert.equal(rows.get(recovered.id).latest_invoice_paid,true);
assert.equal(rows.get(recovered.id).subscription_status,'active');
assert.equal(rows.get(failedRenewal.id).latest_invoice_paid,false);
assert.ok([...rows.values()].every(r=>!('access_granted' in r)&&r.sandbox===true));
console.log('PASS YuviList: failed renewal, duplicate event, successful recovery and immutable sandbox observations.');
