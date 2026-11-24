import assert from 'node:assert/strict';
import {createHandler,validateDraft} from '../supabase/functions/sellerpilot-ai-copy/handler.mjs';
const id='11111111-1111-4111-8111-111111111111',pid='22222222-2222-4222-8222-222222222222';
const draft={title:'Gold tone bracelet',description:'Simple bracelet for everyday wear.',tags:['bracelet','gold tone'],explanations:['Removed repeated tags.'],missing_facts:['Confirm dimensions.']};
const env={SUPABASE_URL:'https://mock.invalid',SUPABASE_ANON_KEY:'anon-fixture',SUPABASE_SERVICE_ROLE_KEY:'service-fixture',SELLERPILOT_OPENAI_KEY:'test-only',SELLERPILOT_OPENAI_MODEL:'gpt-6.1-terra',SELLERPILOT_OPENAI_IMAGE_MODEL:'gpt-6-luna',SELLERPILOT_AI_BETA_USER_IDS:'11111111-1111-4111-8111-111111111111',SELLERPILOT_AI_ENABLED:'true',SELLERPILOT_AI_DAILY_CAP:'2',SELLERPILOT_AI_MONTHLY_CAP:'5',SELLERPILOT_AI_USER_DAILY_CAP:'1'};
let calls=[],quota=true,owner=true,responseDraft=draft,providerError=0;
let allowance={personal_daily_limit:1,personal_daily_remaining:0,available_requests:0,daily_reset_utc:'2026-11-25T00:00:00Z',monthly_reset_utc:'2026-12-01T00:00:00Z',monthly_exhausted:false};
const json=x=>new Response(JSON.stringify(x),{status:200,headers:{'Content-Type':'application/json'}});
const mock=async(url,opts)=>{
 calls.push(url);
 if(url.endsWith('/auth/v1/user'))return json({id,email_confirmed_at:'2026-01-01',is_anonymous:false});
 if(url.includes('/rest/v1/products?')){assert.match(url,new RegExp('user_id=eq\\.'+id));assert.equal(opts.headers.Authorization,'Bearer mock-token');return json(owner?[{id:pid,title:'Gold tone bracelet',description:'Simple bracelet for everyday wear.',tags:'bracelet,bracelet',attributes:{sellerpilot:{market:'Etsy'}},updated_at:'2026-01-01T00:00:00Z'}]:[])}
 if(url.endsWith('/rpc/sellerpilot_ai_allowance')){assert.deepEqual(JSON.parse(opts.body),{p_user_id:id,p_daily_cap:2,p_monthly_cap:5,p_user_cap:1});return json(allowance)}
 if(url.endsWith('/rpc/sellerpilot_reserve_ai_request')){assert.equal(JSON.parse(opts.body).p_user_id,id);return json(quota)}
 if(url==='https://api.openai.com/v1/responses'){if(providerError)return new Response(JSON.stringify({error:{code:'invalid_api_key',message:'SECRET_FIXTURE_MUST_NOT_LEAK'}}),{status:providerError});const body=JSON.parse(opts.body);assert.equal(body.store,false);assert.equal(body.model,'gpt-6.1-terra');assert.equal(body.service_tier,'default');assert.equal(body.max_output_tokens,2400);assert.ok(!body.input.includes(id));assert.ok(!body.input.includes(pid));return json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(responseDraft)}]}]})}
 throw Error('Unexpected network request');
};
const h=createHandler(k=>env[k]||'',mock);
const call=async(body,auth=true,origin='https://sellerpilot-ai.github.io')=>h(new Request('https://mock.invalid/function',{method:'POST',headers:{origin,...(auth?{authorization:'Bearer mock-token'}:{}),'content-type':'application/json'},body:JSON.stringify(body)}));
const req={action:'generate',product_id:pid,consent:true};
assert.equal((await call(req,false)).status,401);assert.equal(calls.length,0);
assert.equal((await call(req,true,'https://untrusted.invalid')).status,403);assert.equal(calls.length,0);
env.SELLERPILOT_AI_ENABLED='false';assert.equal((await call(req)).status,503);assert.ok(!calls.includes('https://api.openai.com/v1/responses'));env.SELLERPILOT_AI_ENABLED='true';calls=[];
env.SELLERPILOT_AI_BETA_USER_IDS='';assert.equal((await call(req)).status,503);env.SELLERPILOT_AI_BETA_USER_IDS=id;
env.SELLERPILOT_OPENAI_MODEL='gpt-6.2-astra';assert.equal((await call(req)).status,503);env.SELLERPILOT_OPENAI_MODEL='gpt-6.1-terra';
env.SELLERPILOT_AI_MONTHLY_CAP='101';assert.equal((await call(req)).status,503);env.SELLERPILOT_AI_MONTHLY_CAP='5';
assert.ok(!calls.includes('https://api.openai.com/v1/responses'));
assert.equal((await call({...req,consent:false})).status,400);assert.ok(!calls.some(x=>x.includes('/rpc/')));
owner=false;assert.equal((await call(req)).status,404);owner=true;
quota=false;assert.equal((await call(req)).status,429);assert.ok(!calls.includes('https://api.openai.com/v1/responses'));quota=true;
const response=await call(req);assert.equal(response.status,200);assert.deepEqual((await response.json()).draft,draft);
responseDraft={...draft,tags:['bracelet','BRACELET']};assert.equal((await call(req)).status,502);
assert.equal(validateDraft({...draft,title:'x'.repeat(141)}),null);
providerError=401;const failed=await call(req);assert.equal(failed.status,503);const failure=await failed.json();assert.match(failure.detail,/AI_401_invalid_api_key/);assert.ok(!failure.detail.includes('SECRET_FIXTURE_MUST_NOT_LEAK'));
console.log('PASS: mocked AI endpoint authentication, origin, disable switch, consent, ownership, atomic quota requirement, output validation and no user identifiers sent to AI.');

calls=[];
let snapshot=await call({action:'allowance',user_id:pid});
assert.equal(snapshot.status,200);assert.deepEqual(await snapshot.json(),{ok:true,enabled:true,allowance});
assert.equal(calls.length,2);assert.ok(!calls.some(x=>x.includes('reserve_ai_request')||x.includes('api.openai.com')));
env.SELLERPILOT_AI_BETA_USER_IDS='';calls=[];snapshot=await call({action:'allowance'});
assert.deepEqual(await snapshot.json(),{ok:true,enabled:false});assert.equal(calls.length,1);
env.SELLERPILOT_AI_BETA_USER_IDS=id;allowance={...allowance,available_requests:2};snapshot=await call({action:'allowance'});assert.equal(snapshot.status,503);
console.log('PASS: own read-only AI allowance, exhausted quota, disabled account, malformed response, no paid request or reservation.');
