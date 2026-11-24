import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(), types={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{
 try {
  const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!path.startsWith(root+sep)){res.writeHead(403).end();return}
  res.writeHead(200,{'Content-Type':types[extname(path)]||'text/plain'}).end(await readFile(path));
 }catch{if(!res.headersSent)res.writeHead(404);res.end()}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const mock=`
const user={id:'mock-user',email:'fixture@example.invalid'};
const initial={id:'fixture-product',user_id:user.id,title:'Minimalist Gold Tone Bracelet',description:'Simple bracelet for everyday wear.',tags:'bracelet,gold jewellery,bracelet',price:18.5,sku:'',attributes:{},created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'};
const get=()=>JSON.parse(localStorage.getItem('test-fixture')||JSON.stringify(initial));
export function createClient(){return{
 auth:{onAuthStateChange(){},async getSession(){return{data:{session:{user}},error:null}},async getUser(){return{data:{user},error:null}}},
 from(table){let update=null;const q={select(){return q},order(){return q},eq(){return q},update(v){update=v;return q},
 async range(){if(table!=='products')throw Error('unexpected range');return{data:[get()],error:null}},
 async maybeSingle(){if(table==='sellerpilot_workspace_v19')return{data:{data:{},updated_at:null},error:null};
 if(table!=='products')throw Error('unexpected table');if(update){const p={...get(),...update};localStorage.setItem('test-fixture',JSON.stringify(p));return{data:p,error:null}}return{data:get(),error:null}}
 };return q}
}}
`;
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin+'/'))return route.continue();
  if(url.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});
  return route.abort();
 });
 const ready=()=>page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 const open=async()=>{await page.locator('[data-view="products"]:visible').first().click();await page.locator('#view-products [data-edit="fixture-product"]:visible').first().click();await page.locator('#v23-guide').waitFor({state:'visible'})};
 await page.goto(origin+'/index.html');await ready();assert.match(await page.title(),/v26/);await open();
 assert.equal(await page.locator('#edit-market option:not([hidden])').allTextContents().then(x=>x.join(',')),'Etsy');
 await page.locator('[data-view="settings"]:visible').first().click();
 await page.locator('#v25-legacy').check();
 assert.equal(await page.locator('#pref-market option:not([hidden])').count(),4);
 await page.locator('#v25-legacy').uncheck();
 assert.equal(await page.locator('#pref-market option:not([hidden])').count(),1);
 await open();
 const score=()=>page.locator('.v23-guide-score').innerText();
 const fix=()=>page.locator('#v23-guide [data-v23-heading="Repeated tags"]').click();
 const apply=()=>page.locator('[data-v23-action="apply"]').click();
 assert.match(await score(),/^51\/100/);
 await fix();await page.locator('#v23-workbench').waitFor({state:'visible'});await apply();
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet, gold jewellery');
 assert.match(await score(),/^62\/100/);
 assert.match(await page.locator('#audit-output .ring-inner').innerText(),/62/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),null);
 await page.locator('[data-v23-action="undo"]').click();
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet,gold jewellery,bracelet');
 assert.match(await score(),/^51\/100/);
 await fix();await apply();await page.locator('[data-v23-action="save"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-fixture')||'{}').tags==='bracelet, gold jewellery'&&document.querySelector('#editor-state')?.textContent==='Saved in cloud');
 await page.reload();await ready();await open();assert.match(await score(),/^62\/100/);
 const preview=await page.evaluate(async()=>{const {prepareImport}=await import('./js/csv.js');return prepareImport('TITLE,DESCRIPTION,TAGS,PRICE,CURRENCY_CODE,SKU\nGift mug,Description,mug,12.50,GBP,M1\nGift mug,Description,mug,12.50,GBP,M2\nUS listing,Description,gift,10,USD,U1',[]).map(x=>({duplicate:x.duplicate,error:x.error,score:x.score}))});
 assert.equal(preview[0].error,'');assert.equal(preview[1].duplicate,true);assert.match(preview[2].error,/Unsupported currency USD/);
 await page.locator('[data-view="products"]:visible').first().click();
 await page.locator('#csv-input').setInputFiles({name:'etsy.csv',mimeType:'text/csv',buffer:Buffer.from('TITLE,DESCRIPTION,TAGS,PRICE,CURRENCY_CODE,SKU\nGift mug,Description,mug,12.50,GBP,M1')});
 await page.locator('.v26-import-dialog').waitFor({state:'visible'});assert.match(await page.locator('.v26-import-dialog').innerText(),/1 ready/);await page.locator('[data-cancel]').click();assert.equal(await page.locator('.v26-import-dialog').count(),0);
 await page.goto(origin+'/demo.html');await page.locator('#demo-fix').waitFor({state:'visible'});assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.locator('#demo-fix').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/62\/100/);await page.locator('#demo-reset').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 assert.deepEqual(errors,[]);
 console.log('PASS: module startup, mocked authentication, mobile navigation, guided apply, immediate score refresh, undo, mocked save and reload. No real cloud requests.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
