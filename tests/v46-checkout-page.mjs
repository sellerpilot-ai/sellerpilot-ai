import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
const b=await chromium.launch({headless:true});
try{
 const p=await b.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 let mode='enabled',calls=[];
 const mock="export function createClient(){return {auth:{async getUser(){return {data:{user:{id:'11111111-1111-4111-8111-111111111111'}}}}},functions:{async invoke(name,{body}){return window.fixtureInvoke(name,body)}}}}";
 await p.exposeFunction('fixtureInvoke',(name,body)=>{assert.equal(name,'sellerpilot-stripe-checkout');calls.push(body);if(body.action==='status')return {data:{ok:true,sandbox:true,enabled:mode==='enabled'}};return {error:{message:'fixture',context:null}}});
 await p.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin==='https://sellerpilot-test.invalid'){const path=u.pathname==='/'?'sandbox-checkout.html':u.pathname.slice(1);if(!['sandbox-checkout.html','js/sandbox-checkout.js'].includes(path))return r.abort();return r.fulfill({status:200,contentType:path.endsWith('.html')?'text/html':'application/javascript',body:await readFile(path,'utf8')})}if(u.hostname==='esm.sh')return r.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});return r.abort()});
 await p.goto('https://sellerpilot-test.invalid/sandbox-checkout.html');
 await p.locator('#start').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Tick the test'));assert.equal(calls.length,0);
 await p.locator('#consent').check();mode='disabled';await p.locator('#start').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('disabled on the server'));assert.equal(calls.length,1);
 mode='enabled';await p.locator('#start').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Checkout service unavailable'));assert.equal(calls.at(-1).action,'create_checkout');const id=calls.at(-1).request_id;assert.equal(calls.at(-1).consent,true);assert.equal(calls.at(-1).plan,'starter');
 await p.locator('#start').tap();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('Checkout service unavailable'));assert.equal(calls.at(-1).request_id,id);assert.equal(await p.locator('#start').isDisabled(),false);assert.deepEqual(errors,[]);
 console.log('PASS: standalone mobile touch checkout, explicit consent, server flag, retry ID, visible errors.');
}finally{await b.close()}