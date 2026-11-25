import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {transform} from 'esbuild';
const old='https://sellerpilot-ai.github.io',next='https://sellerpilot-ai-21c.pages.dev',yuvi='https://yuvilist.com';
const roots=['ai-copy','google-demand','stripe-test','stripe-access','stripe-checkout','stripe-portal'];
let calls=0;
const blocked=()=>{calls++;throw Error('Unexpected network call')};
const env=()=>{throw Error('Unexpected environment access before authentication')};
const handlers=[];
for(const name of roots){
 const {createHandler}=await import('../supabase/functions/sellerpilot-'+name+'/handler.mjs');
 handlers.push([name,createHandler(env,blocked)]);
}
// Transpile only the two Deno entrypoints and substitute dependencies with fail-closed fixtures.
for(const name of ['shop-listings','competitor-search']){
 const path='supabase/functions/sellerpilot-'+name+'/index.ts';
 let src=await readFile(path,'utf8');
 src=src.replace(/^import .*;\s*$/gm,'');
 const {code}=await transform(src,{loader:'ts',format:'esm',target:'es2022'});
 let handler;
 const capture={serve:h=>{handler=h},env:{get:env}};
 new Function('Deno','fetch','createClient','providerAccess',code)(capture,blocked,blocked,blocked);
 assert.equal(typeof handler,'function');
 handlers.push([name,handler]);
}
for(const [name,handler] of handlers){
 for(const origin of [old,next,yuvi]){
  const pre=await handler(new Request('https://fixture.invalid',{method:'OPTIONS',headers:{origin}}));
  assert.equal(pre.status,204,name);
  assert.equal(pre.headers.get('access-control-allow-origin'),origin,name);
  assert.equal(pre.headers.get('vary'),'Origin',name);
 }
 for(const origin of ['https://evil.invalid',next+'.evil.invalid','https://preview.sellerpilot-ai-21c.pages.dev','http://sellerpilot-ai-21c.pages.dev','https://yuvilist.com.evil.invalid','https://www.yuvilist.com','http://yuvilist.com','https://yuvilist.com:8443','null']){
  const pre=await handler(new Request('https://fixture.invalid',{method:'OPTIONS',headers:{origin}}));
  assert.ok([204,403].includes(pre.status),name);
  assert.equal(pre.headers.get('access-control-allow-origin'),null,name);
  const post=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{origin,'content-type':'application/json'},body:'{}'}));
  assert.equal(post.status,403,name);
  assert.equal(post.headers.get('access-control-allow-origin'),null,name);
 }
}
assert.equal(calls,0);
console.log('PASS V121: eight browser functions accept all three exact hosting origins; hostile origins denied, no external calls.');
