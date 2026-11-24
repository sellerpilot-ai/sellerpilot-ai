// Sandbox-only signed snapshot webhooks. Append-only observations, never feature entitlements.
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const validId=(x,prefix)=>typeof x==='string'&&x.startsWith(prefix)&&/^[A-Za-z0-9_]{8,180}$/.test(x);
const types=new Set(['checkout.session.completed','customer.subscription.created','customer.subscription.updated','customer.subscription.deleted','invoice.paid','invoice.payment_failed']);
const statuses=new Set(['incomplete','incomplete_expired','trialing','active','past_due','canceled','unpaid','paused']);
async function readBounded(req,max=262144){const reader=req.body?.getReader();if(!reader)throw Error('Missing body');let n=0;const chunks=[];try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>max){await reader.cancel();throw Error('Too large')}chunks.push(value)}const out=new Uint8Array(n);let pos=0;for(const c of chunks){out.set(c,pos);pos+=c.byteLength}return out}finally{reader.releaseLock()}}
export async function verifySignature(bytes,header,secret,now=Date.now()){
 if(!header||header.length>4096||!/^whsec_[A-Za-z0-9_]{12,200}$/.test(secret))return false;
 const fields=header.split(',').map(x=>x.trim()),timestamps=fields.filter(x=>x.startsWith('t='));
 if(timestamps.length!==1||!/^t=\d{1,12}$/.test(timestamps[0]))return false;
 const stamp=timestamps[0].slice(2),t=Number(stamp);
 if(!Number.isSafeInteger(t)||Math.abs(Math.floor(now/1000)-t)>300)return false;
 const prefix=encoder.encode(stamp+'.'),signed=new Uint8Array(prefix.length+bytes.length);signed.set(prefix);signed.set(bytes,prefix.length);
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 for(const field of fields.filter(x=>/^v1=[0-9a-fA-F]{64}$/.test(x))){const sig=Uint8Array.from(field.slice(3).match(/../g),x=>parseInt(x,16));if(await crypto.subtle.verify('HMAC',key,sig,signed))return true}
 return false;
}
function serviceKey(env){try{const v=JSON.parse(env('SUPABASE_SECRET_KEYS')||'{}').default;if(typeof v==='string'&&v)return v}catch{}return env('SUPABASE_SERVICE_ROLE_KEY')}
function subscriptionId(event){const o=event?.data?.object;if(!o||o.livemode!==false)return null;const id=event.type.startsWith('customer.subscription.')?o.id:event.type.startsWith('invoice.')?(o.parent?.subscription_details?.subscription??o.subscription):o.subscription;const s=typeof id==='string'?id:id?.id;return validId(s,'sub_')?s:null}
export function observation(event,sub,prices,now){
 const id=subscriptionId(event);
 if(!id||sub?.object!=='subscription'||sub.id!==id||sub.livemode!==false||!validId(sub.customer,'cus_'))return null;
 const meta=sub.metadata||{},user=meta.sellerpilot_user_id;
 if(meta.sellerpilot_mode!=='sandbox'||!uuid.test(user||''))return null;
 const plan=meta.sellerpilot_plan;
 if(!['starter','professional'].includes(plan)||!validId(prices[plan],'price_'))return null;
 const items=sub.items?.data;
 const item=Array.isArray(items)&&items.length===1&&!sub.items.has_more?items[0]:null;
 const price=item?.price,expected=plan==='starter'?999:1999;
 const valid=!!item&&item.quantity===1&&price?.id===prices[plan]&&price.livemode===false&&price.currency==='gbp'&&price.unit_amount===expected&&price.recurring?.interval==='month'&&price.recurring?.interval_count===1;
 const period=item?.current_period_end??sub.current_period_end;
 const periodEnd=Number.isSafeInteger(period)&&period>0&&period<4102444800?new Date(period*1000).toISOString():null;
 const invoice=sub.latest_invoice;
 const paid=invoice?.object==='invoice'&&invoice.livemode===false&&invoice.customer===sub.customer&&invoice.status==='paid'&&invoice.currency==='gbp'&&invoice.amount_paid===expected;
 return {event_id:event.id,event_type:event.type,event_created_at:new Date(event.created*1000).toISOString(),observed_at:new Date(now).toISOString(),user_id:user,stripe_subscription_id:id,stripe_customer_id:sub.customer,plan,subscription_status:statuses.has(sub.status)?sub.status:'unknown',price_matches:valid,latest_invoice_paid:paid,period_end:periodEnd,cancel_at_period_end:sub.cancel_at_period_end===true||(Number.isSafeInteger(period)&&period>0&&period<4102444800&&Number.isSafeInteger(sub.cancel_at)&&sub.cancel_at===period),sandbox:true};
}
export function createHandler(env,fetcher,clock=Date.now){return async req=>{
 const reply=(status,detail)=>Response.json({ok:status<400,detail},{status,headers:{'Cache-Control':'no-store'}});
 if(req.method!=='POST')return reply(405,'POST required.');
 const secret=env('SELLERPILOT_STRIPE_WEBHOOK_SECRET'),key=env('SELLERPILOT_STRIPE_TEST_KEY'),base=env('SUPABASE_URL'),service=serviceKey(env);
 if(env('SELLERPILOT_STRIPE_WEBHOOK_ENABLED')!=='true'||!/^whsec_[A-Za-z0-9_]{12,200}$/.test(secret)||!/^sk_test_[A-Za-z0-9_]{12,}$/.test(key)||!base||!service)return reply(503,'Sandbox webhook disabled or incomplete.');
 try{
 const bytes=await readBounded(req);
 if(!await verifySignature(bytes,req.headers.get('stripe-signature'),secret,clock()))return reply(400,'Invalid signature.');
 let event;try{event=JSON.parse(decoder.decode(bytes))}catch{return reply(400,'Invalid payload.')}
 if(event?.object!=='event'||event.livemode!==false||!validId(event.id,'evt_')||!Number.isSafeInteger(event.created)||event.created<1||event.created>=4102444800)return reply(400,'Sandbox event required.');
 if(!types.has(event.type))return reply(200,'Ignored event type.');
 const sid=subscriptionId(event);if(!sid)return reply(200,'No sandbox subscription reference.');
 const prices={starter:env('SELLERPILOT_STRIPE_STARTER_PRICE'),professional:env('SELLERPILOT_STRIPE_PRO_PRICE')};
 if(!validId(prices.starter,'price_')||!validId(prices.professional,'price_')||prices.starter===prices.professional)return reply(503,'Price configuration incomplete.');
 // Use current provider state rather than rely on event arrival order.
 const sr=await fetcher('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(sid)+'?expand%5B%5D=latest_invoice',{method:'GET',headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!sr.ok)return reply(502,'Provider verification unavailable; retry.');
 const sub=await sr.json();
 if(sub?.object!=='subscription'||sub.id!==sid||sub.livemode!==false)return reply(502,'Unexpected provider response.');
 const row=observation(event,sub,prices,clock());
 if(!row)return reply(200,'Unrelated subscription ignored.');
 // Database unique constraint plus ignore-duplicates makes retries atomic. No raw body stored.
 const headers={apikey:service,...(service.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+service}),'Content-Type':'application/json',Prefer:'resolution=ignore-duplicates,return=minimal'};
 const db=await fetcher(base+'/rest/v1/sellerpilot_stripe_sandbox_events?on_conflict=event_id',{method:'POST',headers,body:JSON.stringify(row),redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!db.ok)return reply(503,'Record not saved; retry.');
 return reply(200,'Sandbox observation recorded or already received. No access granted.');
 }catch{console.warn('STRIPE_WEBHOOK_RETRY');return reply(503,'Temporary webhook processing failure; retry.')}
}}
