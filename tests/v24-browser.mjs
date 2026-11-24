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
 functions:{async invoke(name,{body}){if(name!=='sellerpilot-ai-copy')return {error:{message:'Mock provider unavailable'}};if(body.action==='status'||body.action==='image_status')return {data:{ok:true,enabled:true}};if(body.action==='image_analyse')return {data:{ok:true,review:{summary:'Product is centred.',lighting:'Soft light.',background:'Plain background.',composition:'Leave more space.',thumbnail:'Product is visible.',recommended_shots:['Detail view'],alt_text:'Product against a plain background',caveats:['Only one photo reviewed']}}};return {data:{ok:true,updated_at:get().updated_at,draft:{title:'Gold tone bracelet for everyday wear',description:'Simple bracelet for everyday wear.',tags:['bracelet','gold jewellery'],explanations:['Removed repeated tags.'],missing_facts:['Confirm dimensions.']}}}}},
 auth:{onAuthStateChange(){},async getSession(){return{data:{session:{user}},error:null}},async getUser(){return{data:{user},error:null}}},
 from(table){let update=null,insert=null;const q={select(){return q},order(){return q},eq(){return q},update(v){update=v;return q},insert(v){insert=v;return q},async single(){return q.maybeSingle()},
 async range(){if(table!=='products')throw Error('unexpected range');return{data:[get()],error:null}},
 async maybeSingle(){if(table==='sellerpilot_workspace_v19'){if(update||insert){const v=update||insert;const saved={data:v.data,updated_at:v.updated_at||new Date().toISOString()};localStorage.setItem('test-weekly-workspace',JSON.stringify(saved));return{data:saved,error:null}}return{data:JSON.parse(localStorage.getItem('test-weekly-workspace')||'null'),error:null}};
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
 await page.goto(origin+'/index.html');await ready();assert.match(await page.title(),/v35/);await open();
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
 assert.equal(preview[0].error,'');assert.equal(preview[1].duplicate,true);assert.equal(preview[2].error,'');
 await page.locator('[data-view="products"]:visible').first().click();
 await page.locator('#csv-input').setInputFiles({name:'etsy.csv',mimeType:'text/csv',buffer:Buffer.from('TITLE,DESCRIPTION,TAGS,PRICE,CURRENCY_CODE,SKU\nGift mug,Description,mug,12.50,GBP,M1')});
 const currencyChecks=await page.evaluate(async()=>{const {prepareImport}=await import('./js/csv.js');return prepareImport('title,description,tags,price,currency\nUS mug,Description,mug,$12.50,USD\nMismatch,Description,mug,£10,USD\nUnsupported,Description,mug,10,EUR\nLegacy,Description,mug,10,',[]).map(r=>({currency:r.item.attributes.sellerpilot.currency,error:r.error,price:r.item.price}))});
 assert.deepEqual(currencyChecks,[{currency:'USD',error:'',price:12.5},{currency:'USD',error:'Price symbol conflicts with currency column',price:10},{currency:'EUR',error:'Unsupported currency EUR — use GBP or USD',price:10},{currency:'GBP',error:'',price:10}]);
 await page.locator('.v26-import-dialog').waitFor({state:'visible'});assert.match(await page.locator('.v26-import-dialog').innerText(),/1 ready/);await page.locator('[data-cancel]').click();await page.locator('.v26-import-dialog').waitFor({state:'detached'});
 await page.locator('[data-view="ai"]:visible').first().click();
 await page.locator('#ai-product').selectOption('fixture-product');
 await page.locator('#v27-status-check').click();
 await page.waitForFunction(()=>document.querySelector('#v27-ai-status')?.textContent.includes('available'));
 await page.locator('#v27-consent').check();
 await page.locator('#v27-generate').click();
 await page.locator('#v27-ai-result').waitFor({state:'visible'});
 assert.match(await page.locator('#v27-ai-result').innerText(),/Gold tone bracelet for everyday wear/);
 assert.equal(await page.locator('#v27-apply').isDisabled(),true);
 await page.locator('#v27-review').check();
 page.once('dialog',d=>d.accept());
 await page.locator('#v27-apply').click();
 assert.equal(await page.locator('#edit-title').inputValue(),'Gold tone bracelet for everyday wear');
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-fixture')).title),'Minimalist Gold Tone Bracelet');
 await page.locator('[data-view="ai"]:visible').first().click();
 await page.locator('[data-go="image"]').click();
 const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;const ctx=c.getContext('2d');ctx.fillStyle='#e6f5ef';ctx.fillRect(0,0,320,240);ctx.fillStyle='#075b4a';ctx.fillRect(80,40,160,160);return c.toDataURL('image/png').split(',')[1]});
 await page.locator('#v28-file').setInputFiles({name:'sample.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
 await page.locator('#v28-preview-box').waitFor({state:'visible'});
 assert.equal(await page.locator('#v28-run').isDisabled(),true);
 await page.locator('#v28-consent').check();await page.locator('#v28-run').click();
 await page.waitForFunction(()=>document.querySelector('#v28-result')?.textContent.includes('Product is centred.'));
 assert.match(await page.locator('#v28-result').innerText(),/Product against a plain background/);
 await page.locator('#v28-clear').click();assert.equal(await page.locator('#v28-preview-box').isVisible(),false);
 await page.locator('[data-view="settings"]:visible').first().click();await page.locator('#view-settings [data-go="reports"]').click();
 await page.locator('[data-v19-action="save-week"]').waitFor({state:'visible'});await page.locator('[data-v19-action="save-week"]').click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')||'{}').data?.weekly?.length===1);
 assert.match(await page.locator('#v30-history').innerText(),/1 listings/);assert.match(await page.locator('#v30-history').innerText(),/62\/100/);
 await page.locator('[data-v19-action="save-week"]').click();await page.waitForFunction(()=>document.querySelector('#v30-week-status')?.textContent.includes('Saved for this week'));
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.weekly.length),1);
 await page.reload();await ready();await page.locator('[data-view="settings"]:visible').first().click();await page.locator('#view-settings [data-go="reports"]').click();await page.locator('#v30-history').waitFor({state:'visible'});assert.match(await page.locator('#v30-history').innerText(),/62\/100/);
 const autoChecks=await page.evaluate(async()=>{const {autoSnapshotDue,weekStart}=await import('./js/weekly-health.js');const now=new Date('2026-11-23T00:00:00Z');return [weekStart(now),autoSnapshotDue({enabled:false},[],[{}],now),autoSnapshotDue({enabled:true},[],[],now),autoSnapshotDue({enabled:true},[{week:'2026-11-23'}],[{}],now),autoSnapshotDue({enabled:true},[{week:'2026-11-16'}],[{}],now)]});assert.deepEqual(autoChecks,['2026-11-23',false,false,false,true]);
 await page.locator('[data-v19-action="toggle-monitoring"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.monitoring?.enabled===true);
 await page.evaluate(()=>{const x=JSON.parse(localStorage.getItem('test-weekly-workspace'));x.data.weekly[0].week='2020-01-06';localStorage.setItem('test-weekly-workspace',JSON.stringify(x))});
 await page.reload();await ready();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.weekly.length===2);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.weekly[0].source),'auto');
 await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.weekly.length),2);
 await page.locator('[data-view="settings"]:visible').first().click();await page.locator('#view-settings [data-go="reports"]').click();await page.locator('[data-v19-action="toggle-monitoring"]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.monitoring?.enabled===false);await page.waitForFunction(()=>!document.querySelector('[data-v19-action="toggle-monitoring"]').disabled);assert.equal(await page.locator('#v31-start').isDisabled(),true);
 await page.locator('[data-view="shop"]:visible').first().click();await page.locator('#v31-check').click();await page.waitForFunction(()=>document.querySelector('#v31-status')?.textContent.includes('unavailable'));assert.equal(await page.locator('#v31-start').isDisabled(),true);
 await page.locator('[data-view="settings"]:visible').first().click();assert.match(await page.locator('#v32-beta').innerText(),/Paid subscriptions are not available/);
 await page.locator('#v32-notes').fill('Example test only');await page.locator('#v32-clear').click();assert.equal(await page.locator('#v32-notes').inputValue(),'');
 await page.locator('#v32-notes').fill('Example test only');const downloadEvent=page.waitForEvent('download');await page.locator('#v32-download').click();assert.equal((await downloadEvent).suggestedFilename(),'sellerpilot-beta-feedback.txt');
 await open();assert.equal(await page.locator('#edit-currency').inputValue(),'GBP');await page.locator('#edit-currency').selectOption('USD');await page.locator('#save-product').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-fixture')||'{}').attributes?.sellerpilot?.currency==='USD'&&document.querySelector('#editor-state')?.textContent==='Saved in cloud');await page.reload();await ready();await page.locator('[data-view="products"]:visible').first().click();assert.match(await page.locator('#product-mobile').innerText(),/US\$18\.50/);await open();assert.equal(await page.locator('#edit-currency').inputValue(),'USD');
 await page.goto(origin+'/demo.html');await page.locator('#demo-fix').waitFor({state:'visible'});assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.locator('#demo-fix').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/62\/100/);await page.locator('#demo-reset').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.goto(origin+'/home.html');assert.match(await page.locator('h1').innerText(),/Find listing problems/);
 assert.equal(await page.locator('a[href="./demo.html"]').count()>0,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.locator('a[href="./privacy.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not a final privacy notice/);
 await page.locator('a[href="./terms.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not final commercial terms/);
 assert.deepEqual(errors,[]);
 console.log('PASS: module startup, mocked authentication, mobile navigation, guided apply, immediate score refresh, undo, mocked save and reload. No real cloud requests.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
