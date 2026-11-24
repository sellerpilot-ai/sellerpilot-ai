import assert from 'node:assert/strict';
import {createHandler,validateInput,transform} from '../supabase/functions/sellerpilot-google-demand/handler.mjs';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222',rid='33333333-3333-4333-8333-333333333333';
const env={SUPABASE_URL:'https://mock.invalid',SUPABASE_ANON_KEY:'fixture',SUPABASE_SERVICE_ROLE_KEY:'fixture-service',DATAFORSEO_LOGIN:'fixture-login',DATAFORSEO_PASSWORD:'fixture-password',SELLERPILOT_DEMAND_ENABLED:'true',SELLERPILOT_DEMAND_BETA_USER_IDS:id};
let user=id,claim='reserved',calls=[],cache=null,providerError=false;
const payload={status_code:20000,tasks:[{status_code:20000,result:[{keyword:'gold bracelet',location_code:2826,language_code:'en',search_partners:false,search_volume:120,competition:'LOW',monthly_searches:[{year:2025,month:9,search_volume:70},{year:2025,month:10,search_volume:0}]},{keyword:'silver bracelet',location_code:2840,language_code:'en',search_partners:false,search_volume:999,competition:'HIGH'}]}]};
const json=x=>new Response(JSON.stringify(x),{status:200});
const mock=async(url,opts)=>{
 calls.push(url);
 if(url.endsWith('/auth/v1/user'))return json({id:user,email_confirmed_at:'2026-01-01',is_anonymous:false});
 const body=JSON.parse(opts.body);
 if(url.endsWith('/rpc/sellerpilot_demand_begin')){assert.equal(body.p_user_id,id);assert.match(body.p_cache_key,/^[a-f0-9]{64}$/);return json({state:claim,request_id:rid,result:cache});}
 if(url.endsWith('/rpc/sellerpilot_demand_finish')){assert.equal(body.p_user_id,id);assert.equal(body.p_request_id,rid);cache=body.p_result;return json(true);}
 if(url.startsWith('https://api.dataforseo.com/')){assert.equal(url,'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live');assert.equal(opts.headers.Authorization,'Basic '+btoa('fixture-login:fixture-password'));assert.deepEqual(body,[{keywords:['gold bracelet','silver bracelet'],location_code:2826,language_code:'en',search_partners:false}]);if(providerError)return new Response('fixture secret should not leak',{status:401});return json(payload);}
 throw Error('unexpected network');
};
const h=createHandler(k=>env[k]||'',mock),call=(body,auth=true,origin='https://sellerpilot-ai.github.io')=>h(new Request('https://mock.invalid',{method:'POST',headers:{origin,...(auth?{authorization:'Bearer fixture'}:{})},body:JSON.stringify(body)}));
const input={action:'research',region:'UK',keywords:['Silver bracelet','gold bracelet','Gold Bracelet'],consent:true,user_id:other};
assert.deepEqual(validateInput(input),{region:'UK',keywords:['gold bracelet','silver bracelet']});
assert.equal(validateInput({...input,keywords:['a@example.com']}),null);
assert.equal(validateInput({...input,region:'DE'}),null);
assert.equal(validateInput({...input,consent:false}),null);
assert.equal((await call(input,false)).status,401);
assert.equal((await call(input,true,'https://untrusted.invalid')).status,403);
assert.equal(calls.length,0);
assert.equal((await call({action:'status'})).status,200);
assert.equal(calls.length,1);
user=other;calls=[];assert.equal((await call(input)).status,503);assert.equal(calls.length,1);
assert.deepEqual(await (await call({action:'status'})).json(),{ok:true,enabled:false});
user=id;env.SELLERPILOT_DEMAND_ENABLED='false';assert.equal((await call(input)).status,503);
env.SELLERPILOT_DEMAND_ENABLED='true';calls=[];assert.equal((await call({...input,consent:false})).status,400);assert.equal(calls.length,1);
for(const state of ['pending','exhausted','invalid']){claim=state;calls=[];assert.equal((await call(input)).status, state==='pending'?409:state==='exhausted'?429:503);assert.equal(calls.length,2);}
claim='reserved';calls=[];let r=await call(input);assert.equal(r.status,200);const result=await r.json();assert.equal(result.cached,false);assert.equal(result.report.rows[0].average_monthly_searches,120);assert.equal(result.report.rows[0].monthly[1].searches,0);assert.equal(result.report.rows[1].average_monthly_searches,null);assert.equal(calls.filter(x=>x.startsWith('https://api.dataforseo.com/')).length,1);
claim='cached';calls=[];r=await call({...input,keywords:['gold bracelet','silver bracelet']});assert.equal(r.status,200);assert.equal((await r.json()).cached,true);assert.equal(calls.length,2);
claim='reserved';providerError=true;calls=[];r=await call(input);assert.equal(r.status,503);assert.ok(!(await r.text()).includes('fixture secret'));assert.equal(calls.filter(x=>x.startsWith('https://api.dataforseo.com/')).length,1);assert.equal(cache,null);
assert.equal(transform({status_code:20000,tasks:[{status_code:40000}]},validateInput(input)),null);
console.log('PASS: isolated DataForSEO gate, verified identity, consent, input validation, fixed endpoint, mock provider, region and null handling, private cache, quota and no retries.');
