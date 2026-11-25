import assert from 'node:assert/strict';
import {createHandler} from '../supabase/functions/sellerpilot-etsy-preview/handler.mjs';
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const oldOrigin='https://sellerpilot-ai.github.io',newOrigin='https://sellerpilot-ai-21c.pages.dev',oldCallback=oldOrigin+'/sellerpilot-ai/etsy-return.html',newCallback=newOrigin+'/etsy-return.html';
const env={SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI:oldCallback,SUPABASE_URL:'https://mock.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',SELLERPILOT_ETSY_KEYSTRING:'fixture-key',SELLERPILOT_ETSY_SHARED_SECRET:'fixture-secret',SELLERPILOT_ETSY_PREVIEW_ENABLED:'false'};
const json=x=>new Response(JSON.stringify(x),{status:200});
let pending=null,uid=id,calls=[],quota=true,wrongOwner=false,badListing=false;
const fetcher=async(url,opts)=>{
 calls.push(url);
 if(url.endsWith('/auth/v1/user'))return json({id:uid,email_confirmed_at:'2026-01-01'});
 if(url.endsWith('/rpc/sellerpilot_etsy_begin')){if(!quota)return json(false);pending=JSON.parse(opts.body);return json(true)}
 if(url.endsWith('/rpc/sellerpilot_etsy_consume')){const p=JSON.parse(opts.body);if(!pending||p.p_user_id!==pending.p_user_id||p.p_state_hash!==pending.p_state_hash)return json(null);const v=pending.p_verifier;pending=null;return json(v)}
 if(url.endsWith('/oauth/token')){assert.equal(opts.body.get('grant_type'),'authorization_code');assert.equal(opts.body.get('redirect_uri'),env.SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI);assert.equal(opts.headers['x-api-key'],'fixture-key:fixture-secret');return json({access_token:'123.fake-token',refresh_token:'never-return',token_type:'Bearer',scope:'listings_r'})}
 if(url.endsWith('/users/123/shops'))return json({shop_id:456,user_id:wrongOwner?789:123,shop_name:'Sample Shop'});
 if(url.includes('/shops/456/listings?')){assert.equal(opts.headers.Authorization,'Bearer 123.fake-token');const q=new URL(url).searchParams;assert.equal(q.get('sort_on'),'created');assert.equal(q.get('sort_order'),'desc');assert.equal(q.get('limit'),'50');return json({count:1,results:[{listing_id:99,shop_id:456,user_id:123,title:'Sample bracelet',state:badListing?'draft':'active',description:'Not retained'}]})}
 throw Error('Unexpected request');
};
const h=createHandler(k=>env[k]||'',fetcher),call=(body,auth=true,origin=oldOrigin)=>h(new Request('https://mock.invalid/function',{method:'POST',headers:{...(origin?{origin}:{}),...(auth?{authorization:'Bearer fixture'}:{})},body:JSON.stringify(body)}));
assert.equal((await call({action:'status'},false)).status,401);
assert.equal((await (await call({action:'status'})).json()).enabled,false);
assert.equal((await call({action:'begin',consent:true})).status,503);
env.SELLERPILOT_ETSY_PREVIEW_ENABLED='true';
assert.equal((await (await call({action:'status'})).json()).enabled,false);
assert.equal((await call({action:'begin',consent:true})).status,503);
env.SELLERPILOT_ETSY_APPROVED='true';
assert.equal((await (await call({action:'status'})).json()).enabled,false);
env.SELLERPILOT_AI_BETA_USER_IDS=id;
assert.equal((await call({action:'begin',consent:true})).status,503);
env.SELLERPILOT_MARKETPLACE_BETA_USER_IDS=other;
assert.equal((await (await call({action:'status'})).json()).enabled,false);
assert.equal((await call({action:'finish',state:'a'.repeat(64),code:'sample'})).status,503);
assert.ok(calls.every(u=>u.endsWith('/auth/v1/user')));
env.SELLERPILOT_MARKETPLACE_BETA_USER_IDS=' '+id+' , '+other+' ';
assert.equal((await (await call({action:'status'})).json()).enabled,true);
assert.equal((await call({action:'begin'})).status,400);
quota=false;assert.equal((await call({action:'begin',consent:true})).status,429);quota=true;
const begin=async(origin=oldOrigin)=>{const r=await call({action:'begin',consent:true},true,origin);assert.equal(r.status,200);const data=await r.json(),u=new URL(data.authorization_url);assert.equal(u.origin,'https://www.etsy.com');assert.equal(u.searchParams.get('scope'),'listings_r');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('redirect_uri'),env.SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI);assert.ok(!data.authorization_url.includes('fixture-secret'));return u.searchParams.get('state')};
let state=await begin();
assert.equal((await call({action:'finish',state:'a'.repeat(64),code:'sample'})).status,400);
uid=other;assert.equal((await call({action:'finish',state,code:'sample'})).status,400);uid=id;
assert.ok(!calls.some(u=>u.endsWith('/oauth/token')));
const response=await call({action:'finish',state,code:'sample'});assert.equal(response.status,200);
const out=await response.json();assert.equal(out.shop_name,'Sample Shop');assert.equal(out.listings[0].title,'Sample bracelet');assert.ok(!JSON.stringify(out).includes('fake-token'));assert.ok(!JSON.stringify(out).includes('never-return'));assert.ok(!JSON.stringify(out).includes('Not retained'));
assert.equal((await call({action:'finish',state,code:'sample'})).status,400);
state=await begin();wrongOwner=true;assert.equal((await call({action:'finish',state,code:'sample'})).status,403);
wrongOwner=false;badListing=true;state=await begin();assert.equal((await call({action:'finish',state,code:'sample'})).status,502);
console.log('PASS: disabled gate, consent, quota, read-only PKCE, user-bound single-use state, verified shop and minimal response.');

badListing=false;
for(const origin of [oldOrigin,newOrigin]){
 const pre=await h(new Request('https://mock.invalid/function',{method:'OPTIONS',headers:{origin}}));
 assert.equal(pre.status,204);assert.equal(pre.headers.get('access-control-allow-origin'),origin);
}
const beforeHostile=calls.length;
for(const origin of [null,'null','https://evil.invalid',newOrigin+'.evil.invalid','https://preview.sellerpilot-ai-21c.pages.dev','http://sellerpilot-ai-21c.pages.dev']){
 const headers=origin?{origin}:{};
 const pre=await h(new Request('https://mock.invalid/function',{method:'OPTIONS',headers}));
 assert.equal(pre.status,403);assert.equal(pre.headers.get('access-control-allow-origin'),null);
 assert.equal((await call({action:'status'},true,origin)).status,403);
}
assert.equal(calls.length,beforeHostile);
for(const redirect of ['',newCallback+'/',newCallback+'?x=1','https://evil.invalid/etsy-return.html']){
 env.SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI=redirect;
 for(const origin of [oldOrigin,newOrigin]){
  assert.equal((await (await call({action:'status'},true,origin)).json()).enabled,false);
  assert.equal((await call({action:'begin',consent:true},true,origin)).status,503);
 }
}
env.SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI=newCallback;
assert.equal((await (await call({action:'status'})).json()).enabled,false);
assert.equal((await (await call({action:'status'},true,newOrigin)).json()).enabled,true);
state=await begin(newOrigin);
const beforeMismatch=calls.length;
assert.equal((await call({action:'finish',state,code:'sample'})).status,503);
assert.ok(calls.slice(beforeMismatch).every(u=>u.endsWith('/auth/v1/user')));
assert.equal((await call({action:'finish',state,code:'sample'},true,newOrigin)).status,200);
console.log('PASS V186: exact CORS origins, explicit callback configuration, same-origin token exchange, hostile and unconfigured origins rejected.');
