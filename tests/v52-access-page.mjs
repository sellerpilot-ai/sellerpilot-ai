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

 const dashboard=await b.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});let dashMode='starter',dashCalls=[],dashErrors=[];
 dashboard.on('pageerror',e=>dashErrors.push(e.message));
 await dashboard.exposeFunction('fixtureInvoke',(name,body)=>{
  assert.equal(name,'sellerpilot-stripe-access');assert.deepEqual(body,{action:'dashboard'});dashCalls.push(body);
  const pro=dashMode==='professional',d={ok:true,sandbox:true,production_access:false,eligible:true,plan:pro?'professional':'starter',period_end:'2026-12-24T18:58:49Z',cancel_at_period_end:true,monthly_credits:pro?100:30,daily_credits:pro?15:5,usage:{daily_used:5,monthly_used:5,daily_remaining:pro?10:0,monthly_remaining:pro?95:25,daily_resets_at:'2026-11-25T00:00:00Z',monthly_resets_at:'2026-12-01T00:00:00Z'}};
  if(dashMode==='none')return {data:{...d,eligible:false,plan:null,period_end:null,cancel_at_period_end:false,monthly_credits:0,daily_credits:0,usage:null}};
  if(dashMode==='unsafe')d.production_access=true;
  if(dashMode==='malformed')d.usage.daily_remaining=99;
  return {data:d};
 });
 await dashboard.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='https://sellerpilot-test.invalid'){const path=u.pathname.slice(1);if(!['subscription-dashboard.html','js/subscription-dashboard.mjs'].includes(path))return r.abort();return r.fulfill({status:200,contentType:path.endsWith('.html')?'text/html':'application/javascript',body:await readFile(path,'utf8')})}if(u.hostname==='esm.sh')return r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});return r.abort()});
 await dashboard.goto('https://sellerpilot-test.invalid/subscription-dashboard.html');
 await dashboard.waitForFunction(()=>document.querySelector('#status').textContent.includes('Verified'));
 assert.equal(await dashboard.locator('#daily').textContent(),'0 remaining');assert.equal(await dashboard.locator('#monthly').textContent(),'25 remaining');assert.match(await dashboard.locator('#photo-feature').textContent(),/Professional only/);assert.match(await dashboard.locator('#period').textContent(),/Scheduled cancellation/);
 assert.equal(await dashboard.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 dashMode='professional';await dashboard.locator('#refresh').tap();await dashboard.waitForFunction(()=>document.querySelector('#plan').textContent.includes('Professional'));assert.equal(await dashboard.locator('#daily').textContent(),'10 remaining');assert.match(await dashboard.locator('#photo-feature').textContent(),/Available for testing/);
 dashMode='none';await dashboard.locator('#refresh').tap();await dashboard.waitForFunction(()=>document.querySelector('#status').textContent.includes('No eligible'));assert.equal(await dashboard.locator('#details').isHidden(),true);
 dashMode='unsafe';await dashboard.locator('#refresh').tap();await dashboard.waitForFunction(()=>document.querySelector('#status').textContent.includes('Unexpected'));assert.equal(await dashboard.locator('#details').isHidden(),true);
 dashMode='malformed';await dashboard.locator('#refresh').tap();await dashboard.waitForFunction(()=>document.querySelector('#status').textContent.includes('Inconsistent'));assert.equal(await dashboard.locator('#details').isHidden(),true);
 assert.equal(dashCalls.length,5);assert.deepEqual(dashErrors,[]);
 console.log('PASS: V53 mobile dashboard, current usage, Starter and Professional, no subscription and fail-closed invalid response.');
}finally{await b.close()}