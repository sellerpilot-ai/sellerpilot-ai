import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true});
try{
 const p=await b.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));let calls=[],seen=new Set(),mode='starter';
 const mock="export function createClient(){return {auth:{async getUser(){return {data:{user:{id:'11111111-1111-4111-8111-111111111111'}}}}},functions:{async invoke(name,{body}){return window.fixtureInvoke(name,body)}}}}";
 const base=()=>({ok:true,sandbox:true,production_access:false,eligible:true,plan:mode,period_end:'2026-12-24T18:58:49Z',cancel_at_period_end:true,monthly_credits:mode==='starter'?30:100,daily_credits:mode==='starter'?5:15});
 const fail=detail=>({error:{message:detail}}); // transport fallback exercised; no live network
 await p.exposeFunction('fixtureInvoke',(name,body)=>{assert.equal(name,'sellerpilot-stripe-access');calls.push(body);if(body.action==='status')return {data:mode==='unsafe'?{...base(),production_access:true}:base()};assert.equal(body.action,'simulate');assert.match(body.request_id,/^[a-f0-9-]{36}$/);if(body.feature==='photo'&&mode==='starter')return fail('blocked');if(seen.has(body.request_id))return fail('duplicate');seen.add(body.request_id);return {data:{...base(),simulated:true,credits:body.feature==='photo'?3:1}}});
 await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='https://sellerpilot-test.invalid'){const path=u.pathname.slice(1);if(!['sandbox-access.html','js/sandbox-access.mjs'].includes(path))return r.abort();return r.fulfill({status:200,contentType:path.endsWith('.html')?'text/html':'application/javascript',body:await readFile(path,'utf8')})}if(u.hostname==='esm.sh')return r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});return r.abort()});
 await p.goto('https://sellerpilot-test.invalid/sandbox-access.html');
 assert.equal(await p.locator('#text').isDisabled(),true);await p.locator('#check').tap();await p.waitForFunction(()=>document.querySelector('#summary').textContent.includes('30 credits/month'));assert.equal(await p.locator('#text').isDisabled(),true);
 await p.locator('#consent').check();await p.locator('#photo').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('unavailable'));assert.equal(seen.size,0);
 await p.locator('#text').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Test accepted'));assert.equal(seen.size,1);const id=calls.at(-1).request_id;
 await p.locator('#retry').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('unavailable'));assert.equal(calls.at(-1).request_id,id);assert.equal(seen.size,1);
 mode='professional';await p.locator('#check').tap();await p.waitForFunction(()=>document.querySelector('#summary').textContent.includes('100 credits/month'));await p.locator('#photo').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('3 simulated'));assert.equal(seen.size,2);
 mode='unsafe';await p.locator('#check').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Unexpected'));assert.equal(await p.locator('#text').isDisabled(),true);assert.deepEqual(errors,[]);
 console.log('PASS: private access page, consent, server restrictions, replay ID, Professional photo simulation and fail-closed production flag.');
}finally{await b.close()}