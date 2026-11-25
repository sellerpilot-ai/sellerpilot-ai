import assert from 'node:assert/strict';
import {createHandler,safePortalURL,safeConfig} from '../supabase/functions/sellerpilot-stripe-portal/handler.mjs';
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',customer='cus_fixture123',sid='sub_fixture123',cid='bpc_fixture123',price='price_fixtureStarter',url='https://billing.stripe.com/p/session/test_fixture123456789',ret='https://sellerpilot-ai.github.io/sellerpilot-ai/?v=44&billing=portal-return';
const cfg={SUPABASE_URL:'https://example.invalid',SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture_service',SELLERPILOT_STRIPE_BETA_USER_IDS:uid,SELLERPILOT_STRIPE_PORTAL_ENABLED:'true',SELLERPILOT_STRIPE_PORTAL_CONFIG:cid,SELLERPILOT_STRIPE_TEST_KEY:'sk_test_fixture_not_real',SELLERPILOT_STRIPE_STARTER_PRICE:price,SELLERPILOT_STRIPE_PRO_PRICE:'price_fixtureProfessional'};
const sub={object:'subscription',id:sid,customer,livemode:false,status:'past_due',metadata:{sellerpilot_mode:'sandbox',sellerpilot_user_id:uid,sellerpilot_plan:'starter'},items:{has_more:false,data:[{quantity:1,price:{id:price,livemode:false,currency:'gbp',unit_amount:999,recurring:{interval:'month',interval_count:1}}}]}};
const config={object:'billing_portal.configuration',id:cid,livemode:false,active:true,login_page:{enabled:false},features:{invoice_history:{enabled:true},payment_method_update:{enabled:true},subscription_cancel:{enabled:true,mode:'at_period_end',proration_behavior:'none'},subscription_update:{enabled:false},customer_update:{enabled:false}}};
const session={object:'billing_portal.session',customer,configuration:cid,livemode:false,return_url:ret,url};
let expectedReturn=ret;
let calls=[],user=uid,mapping=customer,list={object:'list',data:[sub],has_more:false},conf=config,response=session;
const mock=async(u,init)=>{calls.push([u,init.method||'GET']);if(u.endsWith('/auth/v1/user'))return Response.json({id:user,email_confirmed_at:'2026-01-01'});if(u.endsWith('/sellerpilot_v44_unique_customer')){assert.deepEqual(JSON.parse(init.body),{p_user_id:uid});return Response.json(mapping)}if(u.includes('/subscriptions?')){assert.equal(new URL(u).searchParams.get('customer'),customer);assert.equal(new URL(u).searchParams.get('status'),'all');return Response.json(list)}if(u.endsWith('/configurations/'+cid))return Response.json(conf);assert.ok(u.endsWith('/billing_portal/sessions'));assert.equal(init.method,'POST');assert.equal(init.body.get('customer'),customer);assert.equal(init.body.get('configuration'),cid);assert.equal(init.body.get('return_url'),expectedReturn);return Response.json(response)};
const call=(body={action:'status'},env=cfg,origin='https://sellerpilot-ai.github.io')=>createHandler(k=>env[k]||'',mock)(new Request('https://example.invalid/f',{method:'POST',headers:{origin,authorization:'Bearer fixture'},body:JSON.stringify(body)}));
const open={action:'open_portal',consent:true};
let res=await call();assert.equal((await res.json()).enabled,true);assert.ok(!calls.some(x=>x[0].endsWith('/billing_portal/sessions')));
calls=[];res=await call(open);assert.equal(res.status,200);assert.deepEqual(await res.json(),{ok:true,sandbox:true,production_access:false,url});assert.equal(calls.filter(x=>x[0].endsWith('/billing_portal/sessions')).length,1);
for(const body of [{...open,customer:'cus_attacker'},{...open,return_url:'https://evil.invalid'},{...open,consent:false}]){calls=[];assert.equal((await call(body)).status,400);assert.equal(calls.length,1)}
calls=[];assert.equal((await call(open,{...cfg,SELLERPILOT_STRIPE_PORTAL_ENABLED:'false'})).status,503);assert.equal(calls.length,1);
assert.equal((await call(open,{...cfg,SELLERPILOT_STRIPE_TEST_KEY:'sk_live_fixture_not_real'})).status,503);
user=other;assert.equal((await call(open)).status,403);user=uid;
mapping=null;assert.equal((await call(open)).status,409);mapping=customer;
for(const bad of [{...list,has_more:true},{...list,data:[]},{...list,data:[sub,{...sub,id:'sub_fixture456',metadata:{...sub.metadata,sellerpilot_user_id:other}}]},{...list,data:[{...sub,livemode:true}]}]){list=bad;assert.equal((await call(open)).status,409)}list={object:'list',data:[sub],has_more:false};
for(const bad of [{...config,livemode:true},{...config,login_page:{enabled:true}},{...config,features:{...config.features,subscription_update:{enabled:true}}},{...config,features:{...config.features,subscription_cancel:{enabled:true,mode:'immediately',proration_behavior:'none'}}}]){conf=bad;assert.equal((await call(open)).status,409)}conf=config;
for(const bad of [{...session,livemode:true},{...session,customer:'cus_wrong'},{...session,url:'https://billing.stripe.com.evil.invalid/p/session/test_fixture123456789'},{...session,url:'https://billing.stripe.com/p/session/live_fixture123456789'}]){response=bad;assert.equal((await call(open)).status,502)}response=session;
assert.equal(safePortalURL('https://billing.stripe.com@evil.invalid/p/session/test_fixture123456789'),false);assert.equal(safeConfig(config,cid),true);

{const config={...cfg,SELLERPILOT_STRIPE_BETA_USER_IDS:'',SELLERPILOT_AI_BETA_USER_IDS:uid};calls=[];assert.equal((await call(open,config)).status,403);assert.equal(calls.length,1);console.log('PASS: AI-only testers cannot access Stripe operator endpoint.');}
console.log('PASS: sandbox portal with server-derived customer, full bounded subscription ownership review, safe configuration, fixed return and test URL, disabled default and no production grants.');

const opaque='https://billing.stripe.com/p/session/new_fixture~opaque?locale=en#fragment';
response={...session,url:opaque};res=await call(open);assert.equal(res.status,200);assert.equal((await res.json()).url,opaque);
for(const bad of ['http://billing.stripe.com/p/session/test_fixture123456789','https://billing.stripe.com:444/p/session/test_fixture123456789','https://user@billing.stripe.com/p/session/test_fixture123456789','https://billing.stripe.com/','https://billing.stripe.com.evil.invalid/p/session/test_fixture123456789','https://billing.stripe.com/p/session/live_fixture123456789','javascript:alert(1)','https://billing.stripe.com/p/\nfixture','https://billing.stripe.com/p/\\fixture']){assert.equal(safePortalURL(bad),false);response={...session,url:bad};res=await call(open);assert.equal(res.status,502);assert.match((await res.json()).detail,/hosted URL/)}
for(const [field,value,category] of [['configuration','bpc_wrong','configuration'],['return_url','https://evil.invalid','return URL'],['livemode',true,'sandbox mode'],['customer','cus_wrong','customer']]){response={...session,[field]:value};res=await call(open);assert.equal(res.status,502);assert.ok((await res.json()).detail.includes(category))}
response=session;console.log('PASS: opaque Stripe-hosted portal URL and safe diagnostic categories.');

// Cloudflare sandbox return is fixed server-side; no provider requests.
expectedReturn='https://sellerpilot-ai-21c.pages.dev/?v=44&billing=portal-return';
response={...session,return_url:expectedReturn};
res=await call(open,cfg,'https://sellerpilot-ai-21c.pages.dev');assert.equal(res.status,200);
response={...session,return_url:ret};res=await call(open,cfg,'https://sellerpilot-ai-21c.pages.dev');assert.equal(res.status,502);
console.log('PASS V121: Cloudflare portal return pinned to approved origin.');
