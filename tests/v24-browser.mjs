import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const root=process.cwd(), types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css'};
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
 functions:{async invoke(name,{body}){if(name==='sellerpilot-stripe-access'){if(body.action!=='dashboard')throw Error('Unexpected subscription action');const mode=localStorage.getItem('test-v54-mode')||'starter';if(mode==='delay')await new Promise(r=>setTimeout(r,600));if(mode==='error')return {error:{message:'fixture unavailable'}};const pro=mode==='professional',d={ok:true,sandbox:true,production_access:mode==='unsafe',eligible:true,plan:pro?'professional':'starter',period_end:'2026-12-24T18:58:49Z',cancel_at_period_end:true,monthly_credits:pro?100:30,daily_credits:pro?15:5,usage:{daily_used:5,monthly_used:5,daily_remaining:pro?10:0,monthly_remaining:pro?95:25,daily_resets_at:'2026-11-25T00:00:00Z',monthly_resets_at:'2026-12-01T00:00:00Z'}};if(mode==='monthly'){d.usage.monthly_used=30;d.usage.monthly_remaining=0;}if(mode==='none')return {data:{...d,eligible:false,plan:null,period_end:null,cancel_at_period_end:false,daily_credits:0,monthly_credits:0,usage:null}};return {data:d}};if(name==='sellerpilot-stripe-portal')return {data:{ok:true,sandbox:true,enabled:false,production_access:false}};if(name==='sellerpilot-stripe-checkout'){if(body.action==='status')return {data:{ok:true,sandbox:true,enabled:localStorage.getItem('test-stripe-enabled')==='true'}};if(body.action==='create_checkout'){localStorage.setItem('test-checkout-body',JSON.stringify(body));return {error:{context:{async json(){return {detail:'Fixture checkout received; no network call.'}}}}}}return {error:{message:'Unexpected fixture action'}}};if(name==='sellerpilot-stripe-test')return {data:{ok:true,sandbox:true,checkout_enabled:false,plans:[{plan:'Starter',amount:999,currency:'GBP',interval:'month'},{plan:'Professional',amount:1999,currency:'GBP',interval:'month'}]}};if(name!=='sellerpilot-ai-copy')return {error:{message:'Mock provider unavailable'}};if(body.action==='status'||body.action==='image_status')return {data:{ok:true,enabled:true}};if(body.action==='image_analyse')return {data:{ok:true,review:{summary:'Product is centred.',lighting:'Soft light.',background:'Plain background.',composition:'Leave more space.',thumbnail:'Product is visible.',recommended_shots:['Detail view'],alt_text:'Product against a plain background',caveats:['Only one photo reviewed']}}};return {data:{ok:true,updated_at:get().updated_at,draft:{title:'Gold tone bracelet for everyday wear',description:'Simple bracelet for everyday wear.',tags:['bracelet','gold jewellery'],explanations:['Removed repeated tags.'],missing_facts:['Confirm dimensions.']}}}}},
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
 const errors=[],staleRequests=[];let workspacePhase=true;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin+'/')){const u=new URL(url);if(workspacePhase&&u.pathname.startsWith('/js/')&&u.searchParams.get('v')!=='59'){staleRequests.push(u.pathname+u.search);return route.fulfill({status:200,contentType:'text/javascript',body:'export const staleCachedModule=true;'});}return route.continue();}
  if(url.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});
  return route.abort();
 });
 const ready=()=>page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 const open=async()=>{await page.locator('[data-view="products"]:visible').first().click();await page.locator('#view-products [data-edit="fixture-product"]:visible').first().click();await page.locator('#v23-guide').waitFor({state:'visible'})};
 await page.goto(origin+'/index.html');await ready();assert.match(await page.title(),/v59/);
 await page.locator('[data-view="keywords"]:visible, [data-go="keywords"]:visible').count().then(async n=>{if(n)await page.locator('[data-view="keywords"]:visible, [data-go="keywords"]:visible').first().click();else await page.locator('#v22-tab-keyword').click()});
 if(!await page.locator('#view-keywords').isVisible()){await page.locator('#v22-home-keyword').fill('bracelet');await page.locator('[data-v22-action="keyword"]').click()}
 await page.locator('#v57-product').selectOption('fixture-product');await page.locator('#v57-seed').fill('gold tone bracelet');await page.locator('#v57-extra').fill('birthday gift');
 await page.locator('#v57-generate').click();assert.doesNotMatch(await page.locator('#v57-results').innerText(),/local relevance/);
 await page.locator('#v57-confirm').check();await page.locator('#v57-generate').click();
 assert.match(await page.locator('#v57-results').innerText(),/Duplicate tags/);assert.match(await page.locator('#v57-results').innerText(),/bracelet × 2/);assert.ok(await page.locator('#v57-results .v57-row').count()<=8);assert.match(await page.locator('#v57-results').innerText(),/Page 1 of/);if(!await page.locator('[data-v58-page="1"]').isDisabled()){await page.locator('[data-v58-page="1"]').click();assert.match(await page.locator('#v57-results').innerText(),/Page 2 of/);}
 await page.locator('#v57-filter').selectOption('tags');await page.locator('#v57-results [data-v57-save]').first().click();assert.ok((await page.locator('#keyword-shortlist button').count())>0);
 await page.locator('#v57-seed').fill('new phrase');assert.match(await page.locator('#v57-results').innerText(),/Inputs changed/);
 await page.locator('[data-view="overview"]:visible').first().click();

 await page.locator('[data-view="settings"]:visible').first().click();
 await page.locator('.v22-settings-grid [data-go="competitors"]').click();
 await page.locator('#v58-own').selectOption('fixture-product');await page.locator('#v58-title').fill('Observed rival bracelet');await page.locator('#v58-date').fill('2026-11-24');await page.locator('#v58-price').fill('24.50');
 await page.locator('#v58-run').click();assert.equal(await page.locator('#v58-export').isDisabled(),true);
 await page.locator('#v58-consent').check();await page.locator('#v58-run').click();assert.match(await page.locator('#v58-results').innerText(),/No competitor tag data supplied/);assert.match(await page.locator('#v58-results').innerText(),/GBP -6.00/);
 await page.locator('#v58-known').check();await page.locator('#v58-tags').fill('bracelet,birthday gift');await page.locator('#v58-own-facts').fill('gift box');await page.locator('#v58-run').click();
 assert.match(await page.locator('#v58-results').innerText(),/1 shared · 1 missing/);assert.match(await page.locator('#v58-results').innerText(),/birthday gift/);assert.equal(await page.locator('#v58-export').isDisabled(),false);
 await page.locator('#v59-open-plan').click();assert.equal(await page.locator('#v59-plan').isVisible(),true);
 assert.match(await page.locator('#v59-plan').innerText(),/Pricing observation/);assert.match(await page.locator('#v59-plan').innerText(),/GBP -6.00/);
 await page.locator('[data-view="settings"]:visible').first().click();await page.locator('.v22-settings-grid [data-go="competitors"]').click();
 await page.locator('#v58-currency').selectOption('USD');assert.equal(await page.locator('#v58-export').isDisabled(),true);await page.locator('#v58-run').click();assert.match(await page.locator('#v58-results').innerText(),/Not comparable/);
 await page.locator('[data-view="overview"]:visible').first().click();
 await page.waitForFunction(()=>document.querySelector('#v55-home-status')?.textContent.includes('Starter'));
 assert.match(await page.locator('#v55-home-status').innerText(),/0 \/ 5 daily · 25 \/ 30 monthly remaining/);
 assert.match(await page.locator('#v55-home-reset').innerText(),/25 Nov 2026 at 00:00 UTC/);
 await page.locator('#v55-home [data-v55-billing]').click();assert.equal(await page.locator('#view-settings.active').isVisible(),true);
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'v54-account');
 await page.locator('[data-view="settings"]:visible').first().click();await page.locator('.v22-settings-grid [data-v55-billing]').click();assert.equal(await page.evaluate(()=>document.activeElement?.id),'v54-account');
 await page.locator('[data-view="ai"]:visible').first().click();await page.locator('[data-v55-photo]').click();assert.equal(await page.locator('#view-image.active').isVisible(),true);
 await page.locator('[data-view="ai"]:visible').first().click();
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','monthly'));await page.locator('#v54-ai [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-text').textContent.includes('Monthly limit reached'));
 assert.match(await page.locator('#v54-text').innerText(),/daily reset alone will not restore credits/);
 await page.evaluate(()=>localStorage.removeItem('test-v54-mode'));await page.locator('#v54-ai [data-v54-refresh]').click();await page.waitForFunction(()=>document.querySelector('#v54-text').textContent.includes('Daily limit reached'));
 await open();
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
 assert.match(await page.locator('#v59-plan').innerText(),/Recommended next steps/);
 assert.match(await page.locator('#v59-plan').innerText(),/Keyword opportunities/);
 assert.match(await page.locator('#v59-plan').innerText(),/No current comparable observation/);
 assert.match(await page.locator('#v59-plan').innerText(),/0 of .* saved audit findings cleared/);
 await page.locator('#edit-tags').fill('bracelet,gold jewellery,bracelet,extra');
 assert.match(await page.locator('#v59-plan').innerText(),/Draft changed/);
 await page.locator('#edit-tags').fill('bracelet,gold jewellery,bracelet');
 await page.locator('#v59-plan [data-v59-recheck]').click();
 await page.locator('#v59-plan [data-v23-fix="edit-tags"]').click();
 await fix();await page.locator('#v23-workbench').waitFor({state:'visible'});await apply();
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet, gold jewellery');
 assert.match(await score(),/^62\/100/);
 assert.match(await page.locator('#audit-output .ring-inner').innerText(),/62/);assert.match(await page.locator('#v59-plan').innerText(),/\+11/);assert.match(await page.locator('#v59-plan').innerText(),/1 of .* saved audit findings cleared/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),null);
 await page.locator('[data-v23-action="undo"]').click();
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet,gold jewellery,bracelet');
 assert.match(await score(),/^51\/100/);assert.match(await page.locator('#v59-plan').innerText(),/0 of .* saved audit findings cleared/);
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
 await page.locator('[data-view="shop"]:visible').first().click();await page.locator('#v31-check').click();await page.waitForFunction(()=>document.querySelector('#v31-status')?.textContent.includes('unavailable'));assert.equal(await page.locator('#v31-start').isDisabled(),true);assert.equal(await page.locator('#v31-consent').isDisabled(),true);assert.equal(await page.locator('#v31-finish').isDisabled(),true);assert.match(await page.locator('#v31-status').innerText(),/CSV import remains available/);await page.locator('#view-shop [data-go="products"]:visible').first().click();assert.equal(await page.locator('#view-products.active').isVisible(),true);await page.locator('[data-view="shop"]:visible').first().click();
 await page.locator('[data-view="settings"]:visible').first().click();assert.match(await page.locator('#v32-beta').innerText(),/Paid subscriptions are not available/);assert.match(await page.locator('#v32-beta').innerText(),/Paid checkout is disabled/);assert.equal(await page.locator('#v32-beta input[type="credit-card"]').count(),0);
 await page.locator('#v40-stripe-check').click();await page.waitForFunction(()=>document.querySelector('#v40-stripe-status').textContent.includes('Sandbox verified'));assert.match(await page.locator('#v40-stripe-status').innerText(),/Checkout remains disabled/);
 await page.locator('#v41-status-check').click();await page.waitForFunction(()=>document.querySelector('#v41-status').textContent.includes('remains disabled'));assert.equal(await page.locator('#v41-start').isDisabled(),true);
 await page.evaluate(async()=>{localStorage.setItem('test-stripe-enabled','true');const {busy,state}=await import('./js/core.js');busy(true);state.ready=false});
 await page.locator('#v41-status-check').click();await page.waitForFunction(()=>document.querySelector('#v41-status').textContent.includes('Private sandbox checkout available'));assert.equal(await page.locator('#v41-start').isDisabled(),false);
 await page.locator('#v41-consent').check();await page.locator('#v41-start').click();await page.waitForFunction(()=>document.querySelector('#v41-status').textContent.includes('Fixture checkout received'));const checkoutBody=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-checkout-body')));assert.equal(checkoutBody.plan,'starter');assert.equal(checkoutBody.consent,true);assert.match(checkoutBody.request_id,/^[0-9a-f-]{36}$/);assert.equal(await page.locator('#v41-start').isDisabled(),false);
 await page.evaluate(async()=>{const {busy,state}=await import('./js/core.js');state.ready=true;busy(false);localStorage.removeItem('test-stripe-enabled')});
 await page.locator('#v41-status-check').click();await page.waitForFunction(()=>document.querySelector('#v41-status').textContent.includes('remains disabled'));assert.equal(await page.locator('#v41-start').isDisabled(),true);
 await page.locator('#v44-check').click();await page.waitForFunction(()=>document.querySelector('#v44-status').textContent.includes('remains disabled'));assert.equal(await page.locator('#v44-open').isDisabled(),true);
 const exportEvent=page.waitForEvent('download');await page.locator('#v37-export').click();const exported=await exportEvent;assert.equal(exported.suggestedFilename(),'sellerpilot-workspace-data.json');const contents=JSON.parse(await readFile(await exported.path(),'utf8'));assert.equal(contents.account.id,'mock-user');assert.equal(contents.products[0].id,'fixture-product');assert.equal(contents.research_workspace.monitoring.enabled,false);assert.equal('session' in contents,false);
 const blocked=await page.evaluate(async()=>{const {workspaceExport}=await import('./js/privacy-controls.js');try{workspaceExport({id:'a'},[{user_id:'b'}],{}, {},[]);return false}catch{return true}});assert.equal(blocked,true);
 await page.locator('#v37-request-type').selectOption('delete');const requestEvent=page.waitForEvent('download');await page.locator('#v37-request').click();const request=await requestEvent;assert.equal(request.suggestedFilename(),'sellerpilot-privacy-request.txt');assert.match(await readFile(await request.path(),'utf8'),/not submitted/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-fixture')).id),'fixture-product');
 await page.locator('#v32-notes').fill('Example test only');await page.locator('#v32-clear').click();assert.equal(await page.locator('#v32-notes').inputValue(),'');
 await page.locator('#v32-notes').fill('Example test only');const downloadEvent=page.waitForEvent('download');await page.locator('#v32-download').click();assert.equal((await downloadEvent).suggestedFilename(),'sellerpilot-beta-feedback.txt');
 await open();assert.equal(await page.locator('#edit-currency').inputValue(),'GBP');await page.locator('#edit-currency').selectOption('USD');await page.locator('#save-product').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-fixture')||'{}').attributes?.sellerpilot?.currency==='USD'&&document.querySelector('#editor-state')?.textContent==='Saved in cloud');await page.reload();await ready();await page.locator('[data-view="products"]:visible').first().click();assert.match(await page.locator('#product-mobile').innerText(),/US\$18\.50/);await open();assert.equal(await page.locator('#edit-currency').inputValue(),'USD');
 assert.equal(await page.locator('#auth-signup').isDisabled(),true);
 await page.goto(origin+'/index.html?v=54#v44-open');await ready();await page.locator('#view-settings.active').waitFor({state:'visible'});
 await page.waitForFunction(()=>document.querySelector('#v54-status').textContent.includes('Starter'));
 assert.match(await page.locator('#v54-details').innerText(),/0 \/ 5 daily remaining; 25 \/ 30 monthly remaining/);
 assert.match(await page.locator('#v54-plan').textContent(),/Starter/);
 assert.equal(await page.locator('#v44-open').isDisabled(),true);
 await page.locator('[data-view="ai"]:visible').first().click();assert.match(await page.locator('#v54-text').innerText(),/Simulated allowance exhausted/);
 await page.locator('[data-go="image"]:visible').first().click();assert.match(await page.locator('#v54-photo').innerText(),/requires Professional/);
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','professional'));await page.locator('#v54-image [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-photo').textContent.includes('Photo simulation available'));
 assert.match(await page.locator('#v54-photo').innerText(),/10 daily \/ 95 monthly/);
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','unsafe'));await page.locator('#v54-image [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-photo').textContent.includes('unavailable'));
 assert.equal(await page.locator('#v54-side-usage').textContent(),'');
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','none'));await page.locator('#v54-image [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-photo').textContent.includes('No eligible'));
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','error'));await page.locator('#v54-image [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-photo').textContent.includes('unavailable'));
 await page.evaluate(()=>localStorage.setItem('test-v54-mode','delay'));await page.locator('#v54-image [data-v54-refresh]').click();
 await page.waitForFunction(()=>document.querySelector('#v54-photo').textContent.includes('Checking'));
 await page.evaluate(async()=>{const {clearWorkspace}=await import('./js/ui.js');clearWorkspace()});
 await page.waitForTimeout(800);assert.equal(await page.locator('#v54-image').isHidden(),true);assert.equal(await page.locator('#v54-sidebar').isHidden(),true);assert.equal(await page.locator('#v55-home').isHidden(),true);assert.equal(await page.locator('#v55-home-reset').textContent(),'');assert.equal(await page.locator('#v54-side-usage').textContent(),'');
 await page.evaluate(()=>localStorage.removeItem('test-v54-mode'));
 console.log('PASS: V54 integrated status, billing navigation, Starter and Professional, errors, account reset and late response isolation.');
 await page.evaluate(async()=>{const {clearWorkspace}=await import('./js/ui.js');const {state}=await import('./js/core.js');document.querySelector('#v59-plan').textContent='Private action plan';document.querySelector('#v58-title').value='private competitor';document.querySelector('#v58-results').textContent='Private competitor results';document.querySelector('#v57-seed').value='private keyword';document.querySelector('#v57-extra').value='private modifier';document.querySelector('#v57-results').textContent='Private keyword results';document.querySelector('#keyword-results').textContent='Private catalogue results';document.querySelector('#ai-output').value='Private prior brief';document.querySelector('#ai-audience').value='Private audience';document.querySelector('#ai-facts').value='Private facts';state.shortlist=['private phrase'];clearWorkspace()});
 assert.equal(await page.locator('#v59-plan').textContent(),'');assert.equal(await page.locator('#v59-plan').isVisible(),false);assert.equal(await page.locator('#v58-title').inputValue(),'');assert.doesNotMatch(await page.locator('#v58-results').textContent(),/Private competitor results/);assert.equal(await page.locator('#v57-seed').inputValue(),'');assert.equal(await page.locator('#v57-extra').inputValue(),'');assert.doesNotMatch(await page.locator('#v57-results').textContent(),/Private keyword results/);assert.doesNotMatch(await page.locator('#keyword-results').textContent(),/Private catalogue results/);assert.equal(await page.locator('#ai-output').inputValue(),'');assert.equal(await page.locator('#ai-audience').inputValue(),'');assert.equal(await page.locator('#ai-facts').inputValue(),'');assert.equal(await page.locator('#v19-content-reports').innerText(),'');assert.equal(await page.locator('#auth-signup').isDisabled(),true);
 assert.deepEqual(staleRequests,[]);workspacePhase=false;
 await page.goto(origin+'/demo.html');await page.locator('#demo-fix').waitFor({state:'visible'});assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.locator('#demo-fix').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/62\/100/);await page.locator('#demo-reset').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.goto(origin+'/home.html');assert.match(await page.locator('h1').innerText(),/Find listing problems/);
 assert.equal(await page.locator('a[href="./demo.html"]').count()>0,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.locator('a[href="./privacy.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not a final privacy notice/);
 await page.locator('a[href="./terms.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not final commercial terms/);
 assert.deepEqual(errors,[]);
 const failurePage=await browser.newPage();
 await failurePage.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/keyword-discovery.js'))return route.abort();if(url.origin===origin)return route.continue();return route.abort()});
 await failurePage.goto(origin+'/index.html?v=59');await failurePage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Workspace startup failed'));
 assert.equal(await failurePage.locator('#account-chip').textContent(),'Connection unavailable');await failurePage.close();
 console.log('PASS: one version for all local workspace modules; simulated stale cache cannot supply outdated modules; failed module startup is visible.');
 console.log('PASS: module startup, mocked authentication, mobile navigation, guided apply, immediate score refresh, undo, mocked save and reload. No real cloud requests.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
