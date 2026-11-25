import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, mkdtemp, rm, readdir } from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {buildStaticPackage,packageFingerprint,checkFrontendSource} from './v115-static-package.mjs';
import { resolve, extname, sep } from 'node:path';
import { chromium } from 'playwright';

const packageTemp=await mkdtemp(resolve(tmpdir(),'sellerpilot-static-'));
try{
 const destination=resolve(packageTemp,'frontend');
 const files=await buildStaticPackage(process.cwd(),destination);
 assert.ok(files.includes('app.html')&&files.includes('js/supabase-client.js'));
 assert.ok(files.includes('assets/sellerpilot-logo.svg'));
 assert.ok(files.every(f=>!f.startsWith('tests/')&&!f.startsWith('supabase/')&&!f.startsWith('.')));
 const top=await readdir(destination);
 assert.ok(!top.includes('tests')&&!top.includes('supabase')&&!top.includes('.git'));
 const entries=[];
 for(const file of files){
  const bytes=await readFile(resolve(destination,file));
  assert.deepEqual(bytes,await readFile(resolve(process.cwd(),file)));
  entries.push([file,bytes]);
 }
 const fingerprint=packageFingerprint(entries);
 assert.match(fingerprint,/^[a-f0-9]{64}$/);
 assert.equal(packageFingerprint([...entries].reverse()),fingerprint);
 const tampered=entries.map(([path,bytes],i)=>[path,i===0?Buffer.concat([bytes,Buffer.from('changed')]):bytes]);
 assert.notEqual(packageFingerprint(tampered),fingerprint);
 for(const prefix of ['sk_'+'live_','sk_'+'test_','wh'+'sec_','sb_'+'secret_','sk'+'-proj-']){
  assert.throws(()=>checkFrontendSource('synthetic.txt',prefix+'X'.repeat(40)),/Potential private credential/);
 }
 checkFrontendSource('public.txt','sb_'+'publishable_'+'X'.repeat(40));
 console.log('PASS V117: deterministic package fingerprint '+fingerprint+'; tampering and synthetic credential patterns detected.');
 await assert.rejects(()=>buildStaticPackage(process.cwd(),destination),/EEXIST/);
 console.log('PASS V115: '+files.length+' allowlisted frontend files, byte-identical, no test/backend output, overwrite refused.');
}finally{await rm(packageTemp,{recursive:true,force:true})}
const root=process.cwd(), types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
 try {
  const requested=new URL(req.url,'http://localhost').pathname;const path=resolve(root,'.'+(requested==='/'?'/index.html':requested));
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
 functions:{async invoke(name,{body}){if(name==='sellerpilot-stripe-access'){localStorage.setItem('test-v63-sandbox-requests',String(Number(localStorage.getItem('test-v63-sandbox-requests')||0)+1));if(body.action!=='dashboard')throw Error('Unexpected subscription action');const mode=localStorage.getItem('test-v54-mode')||'starter';if(mode==='delay')await new Promise(r=>setTimeout(r,600));if(mode==='error')return {error:{message:'fixture unavailable'}};const pro=mode==='professional',d={ok:true,sandbox:true,production_access:mode==='unsafe',eligible:true,plan:pro?'professional':'starter',period_end:'2026-12-24T18:58:49Z',cancel_at_period_end:true,monthly_credits:pro?100:30,daily_credits:pro?15:5,usage:{daily_used:5,monthly_used:5,daily_remaining:pro?10:0,monthly_remaining:pro?95:25,daily_resets_at:'2026-11-25T00:00:00Z',monthly_resets_at:'2026-12-01T00:00:00Z'}};if(mode==='monthly'){d.usage.monthly_used=30;d.usage.monthly_remaining=0;}if(mode==='none')return {data:{...d,eligible:false,plan:null,period_end:null,cancel_at_period_end:false,daily_credits:0,monthly_credits:0,usage:null}};return {data:d}};if(name==='sellerpilot-stripe-portal')return {data:{ok:true,sandbox:true,enabled:false,production_access:false}};if(name==='sellerpilot-stripe-checkout'){if(body.action==='status')return {data:{ok:true,sandbox:true,enabled:localStorage.getItem('test-stripe-enabled')==='true'}};if(body.action==='create_checkout'){localStorage.setItem('test-checkout-body',JSON.stringify(body));return {error:{context:{async json(){return {detail:'Fixture checkout received; no network call.'}}}}}}return {error:{message:'Unexpected fixture action'}}};if(name==='sellerpilot-stripe-test')return {data:{ok:true,sandbox:true,checkout_enabled:false,plans:[{plan:'Starter',amount:999,currency:'GBP',interval:'month'},{plan:'Professional',amount:1999,currency:'GBP',interval:'month'}]}};if(name==='sellerpilot-google-demand'){if(body.action==='discover'&&body.consent===true&&body.keywords.length===1)return {data:{ok:true,cached:false,report:{source:'Google Ads via DataForSEO',region:body.region,mode:'discover',seeds:body.keywords,retrieved_at:'2026-11-24T00:00:00Z',rows:[{keyword:'dainty gold bracelet',average_monthly_searches:80,ads_competition:'LOW',monthly:[{month:'2026-10',searches:100}]}]}}};if(body.action==='status')return {data:{ok:true,enabled:true}};if(body.action==='research'&&body.consent===true&&['UK','US'].includes(body.region))return {data:{ok:true,cached:false,report:{source:'Google Ads via DataForSEO',region:body.region,retrieved_at:'2026-11-24T00:00:00Z',rows:[{keyword:'gold bracelet',average_monthly_searches:body.region==='UK'?120:240,ads_competition:'LOW',monthly:[{month:'2026-09',searches:0},{month:'2026-10',searches:100}]},{keyword:'silver bracelet',average_monthly_searches:null,ads_competition:null,monthly:[]},{keyword:'tone bracelet',average_monthly_searches:40,ads_competition:'LOW',monthly:[]}]}}};throw Error('Unexpected Google demand fixture action');}if(name!=='sellerpilot-ai-copy')return {error:{message:'Mock provider unavailable'}};if(body.action==='allowance')return {data:{ok:true,enabled:true,allowance:{personal_daily_limit:3,personal_daily_remaining:2,available_requests:2,daily_reset_utc:'2026-11-25T00:00:00Z',monthly_reset_utc:'2026-12-01T00:00:00Z',monthly_exhausted:false}}};if(body.action==='status'||body.action==='image_status')return {data:{ok:true,enabled:true}};if(body.action==='image_analyse')return {data:{ok:true,review:{summary:'Product is centred.',lighting:'Soft light.',background:'Plain background.',composition:'Leave more space.',thumbnail:'Product is visible.',recommended_shots:['Detail view'],alt_text:'Product against a plain background',caveats:['Only one photo reviewed']}}};return {data:{ok:true,updated_at:get().updated_at,draft:{title:'Gold tone bracelet for everyday wear',description:'Simple bracelet for everyday wear.',tags:['bracelet','gold jewellery'],explanations:['Removed repeated tags.'],missing_facts:['Confirm dimensions.']}}}}},
 auth:{onAuthStateChange(cb){if(new URL(location.href).hash.includes('type=recovery'))queueMicrotask(()=>cb('PASSWORD_RECOVERY',{user}))},async updateUser(){localStorage.setItem('test-v64-reset','done');return{data:{user},error:null}},async getSession(){return{data:{session:localStorage.getItem('test-v112-signed-out')==='yes'?null:{user}},error:null}},async getUser(){if(localStorage.getItem('test-v112-expired')==='yes')return{data:{user:null},error:{message:'Expired session fixture'}};return{data:{user},error:null}},async signOut({scope}={}){localStorage.setItem('test-v112-scope',scope||'global');if(localStorage.getItem('test-v112-fail')==='yes')return{error:{message:'Network fixture'}};localStorage.setItem('test-v112-signed-out','yes');return{error:null}}},
 from(table){let update=null,insert=null;const q={select(){return q},order(){return q},eq(){return q},update(v){update=v;return q},insert(v){insert=v;return q},async single(){return q.maybeSingle()},
 async range(){if(table!=='products')throw Error('unexpected range');return{data:localStorage.getItem('test-v113-foreign')==='yes'?[{...get(),user_id:'fixture-other-user',title:'Foreign fixture sentinel'}]:[get()],error:null}},
 async maybeSingle(){if(table==='sellerpilot_workspace_v19'){if(update||insert){const v=update||insert;const saved={data:v.data,updated_at:v.updated_at||new Date().toISOString()};localStorage.setItem('test-weekly-workspace',JSON.stringify(saved));return{data:saved,error:null}}return{data:JSON.parse(localStorage.getItem('test-weekly-workspace')||'null'),error:null}};
 if(table!=='products')throw Error('unexpected table');if(update){const p={...get(),...update};localStorage.setItem('test-fixture',JSON.stringify(p));return{data:p,error:null}}return{data:get(),error:null}}
 };return q}
}}
`;
const artwork=await readFile(resolve(root,'assets/sellerpilot-logo.svg'),'utf8');
const embedded=artwork.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)"/);
assert.ok(embedded,'Approved logo must embed the original pack PNG');
assert.equal(createHash('sha256').update(Buffer.from(embedded[1],'base64')).digest('hex'),'f2ff3f96addc3a69a5ac36e3b7e573bc6daf3269993a42f6ae4d985774c62f7d');
let browser;
try {
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
 const errors=[],staleRequests=[];let workspacePhase=true;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(origin+'/')){const u=new URL(url);if(workspacePhase&&u.pathname.startsWith('/js/')&&u.searchParams.get('v')!=='106'){staleRequests.push(u.pathname+u.search);return route.fulfill({status:200,contentType:'text/javascript',body:'export const staleCachedModule=true;'});}return route.continue();}
  if(url.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});
  return route.abort();
 });
 const ready=()=>page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 const open=async()=>{await page.locator('[data-view="products"]:visible').first().click();await page.locator('#view-products [data-edit="fixture-product"]:visible').first().click();await page.locator('#v23-guide').waitFor({state:'visible'})};
 await page.goto(origin+'/app.html');await ready();assert.equal(await page.locator('.v108-mobile-brand img').isVisible(),true);assert.equal(await page.evaluate(()=>!!(document.querySelector('.v22-home-top').compareDocumentPosition(document.querySelector('#v60-assistant'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);assert.match(await page.title(),/v106/);assert.match(await page.locator('.top-pill').innerText(),/SELLERPILOT V106/);assert.match(await page.locator('.footer-note').innerText(),/SellerPilot AI v106/);assert.match(await page.locator('.sidebar-foot').textContent(),/v106 · Listing intelligence beta/);
 await page.waitForFunction(()=>{const i=document.querySelector('.brand-mark img');return i?.complete&&i.naturalWidth===32;});
 assert.equal(await page.locator('link[rel="icon"]').getAttribute('href'),'./assets/sellerpilot-logo.svg');
 assert.equal(await page.locator('#v63-operator-tools').isHidden(),true);assert.equal(await page.locator('#v55-home').isHidden(),true);assert.equal(await page.evaluate(()=>Number(localStorage.getItem('test-v63-sandbox-requests')||0)),0);
 await page.locator('[data-view="settings"]:visible').first().click();assert.equal(await page.locator('#view-settings .v19-links [data-go="keywords"]').isVisible(),true);assert.equal(await page.evaluate(()=>!!(document.querySelector('#view-settings .v19-links').compareDocumentPosition(document.querySelector('#v22-appearance'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);assert.equal(await page.locator('#v40-stripe-check').isHidden(),true);
 await page.goto(origin+'/index.html?operator=1');await ready();assert.equal(await page.locator('#v63-operator-tools').getAttribute('hidden'),null);
 assert.match(await page.locator('#v61-start-status').innerText(),/1 of 4 setup milestones/);
 await page.locator('#v61-start summary').click();assert.equal(await page.locator('#v61-checklist .v61-step').count(),4);
 await page.locator('#v61-checklist [data-v61-go="audit"]').click();assert.equal(await page.locator('#v59-plan').isVisible(),true);
 await page.locator('[data-view="overview"]:visible').first().click();
 await page.locator('#v95-directory summary').click();
 assert.match(await page.locator('#v95-tool-count').innerText(),/13 tools found/);
 await page.locator('#v95-search').fill('profit calculator');assert.equal(await page.locator('#v95-tools [data-v61-go]').count(),1);
 await page.locator('#v95-tools [data-v61-go="profits"]').click();assert.equal(await page.locator('#view-profits').isVisible(),true);
 await page.locator('[data-view="overview"]:visible').first().click();
 await page.locator('#v95-search').fill('no matching tool 987');assert.match(await page.locator('#v95-tools').innerText(),/No matching tools/);
 await page.locator('#v95-search').fill('');assert.equal(await page.locator('#v95-tools [data-v61-go]').count(),13);
 assert.match(await page.locator('#v96-next').textContent(),/Review your listing quality/);
 const toolSearch=await page.evaluate(async()=>{const {findTools}=await import('./js/beta-onboarding.js');return [findTools('PROFIT calculator').map(t=>t.id),findTools('not-a-tool').length,findTools('').length]});assert.deepEqual(toolSearch,[['profits'],0,13]);
 const setup=await page.evaluate(async()=>{const {v61Checklist}=await import('./js/beta-onboarding.js');return [v61Checklist([],null).filter(x=>x.done).length,v61Checklist([{attributes:{sellerpilot:{auditHistory:[{}]}}}],{keywords:[{}],weekly:[{}]}).filter(x=>x.done).length]});assert.deepEqual(setup,[0,4]);

 assert.match(await page.locator('#v60-metrics').innerText(),/51\/100/);
 assert.match(await page.locator('#v60-queue').innerText(),/Minimalist Gold Tone Bracelet/);
 await page.locator('#v60-filter').selectOption('critical');assert.match(await page.locator('#v60-queue').innerText(),/No matching findings/);
 await page.locator('#v60-filter').selectOption('all');await page.locator('#v60-search').fill('nonexistent');assert.match(await page.locator('#v60-queue').innerText(),/No matching findings/);await page.locator('#v60-search').fill('');
 await page.locator('#v90-panel summary').click();
 assert.ok(await page.locator('[data-v90-group]').count()>0);
 const issueHeading=await page.locator('[data-v90-group]').first().getAttribute('data-v90-group');
 await page.locator('[data-v90-group]').first().click();
 assert.equal(await page.locator('#v90-issue').inputValue(),issueHeading);
 assert.ok((await page.locator('#v60-queue article p').first().innerText()).includes(issueHeading));
 await page.locator('#v90-market').selectOption('Etsy');assert.match(await page.locator('#v60-queue').innerText(),/Minimalist Gold Tone Bracelet/);
 const issuesCSV=page.waitForEvent('download');await page.locator('#v94-export').click();const issuesFile=await issuesCSV;
 assert.equal(issuesFile.suggestedFilename(),'sellerpilot-issue-summary.csv');assert.match(await readFile(await issuesFile.path(),'utf8'),/affected_listings/);
 await page.locator('#v90-market').selectOption('');await page.locator('#v90-issue').selectOption('');
 const queueDownload=page.waitForEvent('download');await page.locator('#v60-export').click();assert.equal((await queueDownload).suggestedFilename(),'sellerpilot-review-queue.csv');
 await page.locator('#v60-queue [data-v60-review="fixture-product"]').click();assert.equal(await page.locator('#v59-plan').isVisible(),true);
 await page.locator('[data-view="overview"]:visible').first().click();
 await page.locator('#v60-assistant [data-v60-nav="research"]').click();await page.locator('#v60-research-product').selectOption('fixture-product');await page.locator('[data-v60-research="keywords"]').click();
 assert.equal(await page.locator('#v57-product').inputValue(),'fixture-product');assert.equal(await page.locator('#v57-confirm').isChecked(),false);
 await page.locator('[data-view="overview"]:visible').first().click();

 await page.locator('[data-view="keywords"]:visible, [data-go="keywords"]:visible').count().then(async n=>{if(n)await page.locator('[data-view="keywords"]:visible, [data-go="keywords"]:visible').first().click();else await page.locator('#v22-tab-keyword').click()});
 if(!await page.locator('#view-keywords').isVisible()){await page.locator('#v22-home-keyword').fill('bracelet');await page.locator('[data-v22-action="keyword"]').click()}
 await page.locator('#v57-product').selectOption('fixture-product');await page.locator('#v57-seed').fill('gold tone bracelet');await page.locator('#v57-extra').fill('birthday gift');
 await page.locator('#v57-generate').click();assert.doesNotMatch(await page.locator('#v57-results').innerText(),/local relevance/);
 await page.locator('#v57-confirm').check();await page.locator('#v57-generate').click();
 assert.match(await page.locator('#v57-results').innerText(),/Duplicate tags/);assert.match(await page.locator('#v57-results').innerText(),/bracelet × 2/);assert.ok(await page.locator('#v57-results .v57-row').count()<=8);assert.match(await page.locator('#v57-results').innerText(),/Page 1 of/);if(!await page.locator('[data-v58-page="1"]').isDisabled()){await page.locator('[data-v58-page="1"]').click();assert.match(await page.locator('#v57-results').innerText(),/Page 2 of/);}
 assert.equal(await page.locator('#v57-results .v57-row b').filter({hasText:/^tone bracelet$/}).count(),0);assert.match(await page.locator('#v57-results').innerText(),/tag candidates to review/);await page.locator('#v57-filter').selectOption('opportunity');assert.ok(await page.locator('#v57-results .v57-row').count()>0);await page.locator('#v57-results .v62-kw-details summary').first().click();assert.equal(await page.locator('#v57-results .v62-kw-details').first().getAttribute('open'),'');await page.locator('#v57-filter').selectOption('tags');await page.locator('#v57-results [data-v57-save]').first().click();assert.ok((await page.locator('#keyword-shortlist button').count())>0);
 await page.locator('#v60-kw-sort').selectOption('alphabetical');const phrases=await page.locator('#v57-results .v57-row .row b').allTextContents();assert.deepEqual(phrases,[...phrases].sort((a,b)=>a.localeCompare(b)));
 await page.locator('#v60-kw-view').selectOption('detail');assert.equal(await page.locator('#v57-results').evaluate(e=>e.classList.contains('v60-compact-keywords')),false);
 await page.locator('#v60-kw-view').selectOption('compact');await page.locator('#v60-kw-search').fill('no such keyword');assert.match(await page.locator('#v57-results').innerText(),/0 matching ideas/);await page.locator('#v60-kw-search').fill('');
 const keywordDownload=page.waitForEvent('download');await page.locator('[data-v60-keyword-export]').click();assert.equal((await keywordDownload).suggestedFilename(),'sellerpilot-keyword-ideas.csv');
 await page.locator('#v57-results [data-v60-cloud-keyword]').first().click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')||'{}').data?.keywords?.length===1&&!document.querySelector('[data-v60-cloud-keyword]').disabled);
 assert.equal(await page.locator('#v67-run').isDisabled(),true);
 await page.locator('#v67-status-check').click();await page.waitForFunction(()=>document.querySelector('#v67-status')?.textContent.includes('enabled for this private account'));
 await page.locator('#v67-keywords').fill('x'.repeat(81));await page.locator('#v67-consent').check();assert.equal(await page.locator('#v67-run').isDisabled(),true);assert.match(await page.locator('#v75-phrase-count').innerText(),/80-character limit/);
 await page.locator('#v67-keywords').fill('gold bracelet\nsilver bracelet');assert.equal(await page.locator('#v67-run').isDisabled(),true);assert.match(await page.locator('#v75-phrase-count').innerText(),/2 \/ 20 phrases/);
 await page.locator('#v67-consent').check();await page.locator('#v67-run').click();await page.waitForFunction(()=>document.querySelector('#v67-status')?.textContent.includes('Research ready'));
 assert.match(await page.locator('#v67-results').innerText(),/Google Ads via DataForSEO/);assert.match(await page.locator('#v67-results').innerText(),/120/);assert.match(await page.locator('#v67-results').innerText(),/Not available/);assert.equal(await page.locator('#v67-consent').isChecked(),false);
 await page.locator('#v68-product').selectOption('fixture-product');assert.match(await page.locator('#v67-results').innerText(),/Local word coverage/);
 await page.locator('#v68-sort').selectOption('alpha');await page.locator('#v68-filter').fill('gold');assert.equal(await page.locator('#v67-results article').count(),1);
 await page.locator('[data-v68-trend="gold bracelet"]').click();assert.match(await page.locator('#v68-trend').innerText(),/2026-10/);assert.match(await page.locator('#v68-trend').innerText(),/100 searches/);assert.equal(await page.locator('#v68-trend .v68-bar-row').count(),2);
 assert.equal(await page.evaluate(()=>document.activeElement?.id),'v68-trend');
 const googleCSV=page.waitForEvent('download');await page.locator('[data-v71-export]').click();const googleDownload=await googleCSV;assert.equal(googleDownload.suggestedFilename(),'sellerpilot-google-research.csv');
 const googleText=await readFile(await googleDownload.path(),'utf8');assert.match(googleText,/gold bracelet/);assert.doesNotMatch(googleText,/silver bracelet/);
 const beforePreview=await page.evaluate(()=>localStorage.getItem('test-fixture'));
 const previewButton=page.locator('[data-v72-tag="gold bracelet"]');assert.equal(await previewButton.count(),1);
 page.once('dialog',async d=>{await d.dismiss()});await previewButton.click();assert.equal(await page.locator('#view-keywords').isVisible(),true);
 page.once('dialog',async d=>{await d.accept()});await previewButton.click();await page.locator('#view-intelligence').waitFor({state:'visible'});
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet, gold jewellery, bracelet, gold bracelet');
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),beforePreview);
 await page.locator('#v79-return-keywords').click();await page.locator('#view-keywords').waitFor({state:'visible'});await page.locator('#v67-results article').first().waitFor({state:'visible'});assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet, gold jewellery, bracelet, gold bracelet');assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),beforePreview);
 console.log('PASS V71/V72 filtered download, cancel/accept tag preview without saving; V73/V75 focus and input guard; V76 logo asset');
 await page.locator('#v68-filter').fill('');
 await page.locator('#v80-tag-plan summary').click();
 assert.match(await page.locator('#v80-count').innerText(),/10 free slots/);
 assert.equal(await page.locator('[data-v80-choice]').count(),2);
 assert.equal(await page.locator('[data-v80-preview]').isDisabled(),true);
 await page.locator('[data-v80-choice][value="gold bracelet"]').check();
 await page.locator('[data-v80-choice][value="tone bracelet"]').check();
 assert.match(await page.locator('#v80-count').innerText(),/2 selected/);
 assert.match(await page.locator('#v80-after').innerText(),/gold bracelet, tone bracelet/);
 assert.equal(await page.locator('[data-v88-task]').isDisabled(),false);
 const priorTaskCount=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.tasks.length);
 page.once('dialog',async d=>{await d.dismiss()});await page.locator('[data-v88-task]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.tasks.length),priorTaskCount);
 page.once('dialog',async d=>{await d.accept()});await page.locator('[data-v88-task]').click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.tasks.length===n+1,priorTaskCount);
 await page.waitForFunction(()=>!document.querySelector('[data-v88-task]').disabled);
 assert.match(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.tasks[0].notes),/gold bracelet, tone bracelet/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),beforePreview);
 await page.locator('[data-v80-clear]').click();assert.equal(await page.locator('[data-v80-preview]').isDisabled(),true);
 await page.locator('[data-v80-choice][value="gold bracelet"]').check();await page.locator('[data-v80-choice][value="tone bracelet"]').check();
 page.once('dialog',async d=>{await d.dismiss()});await page.locator('[data-v80-preview]').click();assert.equal(await page.locator('#view-keywords').isVisible(),true);
 page.once('dialog',async d=>{await d.accept()});await page.locator('[data-v80-preview]').click();await page.locator('#view-intelligence').waitFor({state:'visible'});
 assert.equal(await page.locator('#edit-tags').inputValue(),'bracelet, gold jewellery, bracelet, gold bracelet, tone bracelet');
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),beforePreview);
 await page.locator('#v79-return-keywords').click();await page.locator('#view-keywords').waitFor({state:'visible'});
 assert.equal(await page.locator('[data-v80-choice]:checked').count(),0);
 console.log('PASS V80–V84 multiple tag planning, clear, cancel, explicit preview, no cloud save and reset');
 await page.locator('#v68-filter').fill('tone bracelet');
 const priorKeywords=await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.keywords.length);
 // The local keyword generator may already have saved this phrase; use the known absent silver phrase.
 await page.locator('#v68-filter').fill('silver bracelet');
 assert.equal(await page.locator('[data-v85-save]').isDisabled(),false);
 page.once('dialog',async d=>{await d.dismiss()});await page.locator('[data-v85-save]').click();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.keywords.length),priorKeywords);
 page.once('dialog',async d=>{await d.accept()});await page.locator('[data-v85-save]').click();await page.waitForFunction(n=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.keywords.length===n+1,priorKeywords);
 await page.waitForFunction(()=>document.querySelector('[data-v85-save]').disabled);
 assert.match(await page.evaluate(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')).data.keywords[0].notes),/UK.*not Etsy demand/);
 assert.equal(await page.evaluate(()=>localStorage.getItem('test-fixture')),beforePreview);
 console.log('PASS V85–V89 cancel/save private research notes and review task, deduplication and unchanged listing');
 await page.locator('#v68-filter').fill('');await page.locator('[data-v68-prepare]').click();assert.equal(await page.locator('#v67-region').inputValue(),'US');assert.equal(await page.locator('#v67-consent').isChecked(),false);assert.equal(await page.locator('#v67-run').isDisabled(),true);
 await page.locator('#v67-consent').check();await page.locator('#v67-run').click();await page.waitForFunction(()=>document.querySelector('#v67-status')?.textContent.includes('Research ready'));assert.match(await page.locator('.v68-comparison').innerText(),/UK: 120/);assert.match(await page.locator('.v68-comparison').innerText(),/US: 240/);
 await page.locator('[data-v68-region="UK"]').click();assert.match(await page.locator('#v67-results').innerText(),/Google demand · United Kingdom/);
 await page.locator('#v69-mode').selectOption('discover');assert.equal(await page.locator('#v67-run').isDisabled(),true);await page.locator('#v67-keywords').fill('personalised jewellery');await page.locator('#v67-region').selectOption('US');await page.locator('#v69-spelling').click();assert.match(await page.locator('#v69-variant').innerText(),/personalized jewelry/);
 await page.locator('#v67-keywords').fill('gold bracelet');await page.locator('#v67-consent').check();await page.locator('#v67-run').click();await page.waitForFunction(()=>document.querySelector('#v67-status')?.textContent.includes('Research ready'));assert.match(await page.locator('#v67-results').innerText(),/Related keyword discovery/);assert.match(await page.locator('#v67-results').innerText(),/dainty gold bracelet/);assert.equal(await page.locator('.v68-comparison').count(),0);
 await page.locator('[data-v68-prepare]').click();assert.equal(await page.locator('#v67-keywords').inputValue(),'gold bracelet');assert.equal(await page.locator('#v69-mode').inputValue(),'discover');assert.equal(await page.locator('#v67-consent').isChecked(),false);
 await page.locator('#v57-seed').fill('new phrase');assert.match(await page.locator('#v57-results').innerText(),/Inputs changed/);
 await page.locator('[data-view="overview"]:visible').first().click();

 await page.locator('[data-view="settings"]:visible').first().click();
 await page.locator('.v22-settings-grid [data-go="competitors"]').click();
 await page.locator('#v58-own').selectOption('fixture-product');await page.locator('#v58-title').fill('Observed rival bracelet');await page.locator('#v58-date').fill('2026-11-24');await page.locator('#v58-price').fill('24.50');
 await page.locator('#v58-run').click();assert.equal(await page.locator('#v58-export').isDisabled(),true);
 await page.locator('#v58-consent').check();await page.locator('#v58-run').click();assert.match(await page.locator('#v58-results').innerText(),/No competitor tag data supplied/);assert.match(await page.locator('#v58-results').innerText(),/GBP -6.00/);
 await page.locator('#v58-known').check();await page.locator('#v58-tags').fill('bracelet,birthday gift');await page.locator('#v58-own-facts').fill('gift box');await page.locator('#v58-run').click();
 assert.match(await page.locator('#v58-results').innerText(),/1 shared · 1 missing/);assert.match(await page.locator('#v58-results').innerText(),/birthday gift/);assert.equal(await page.locator('#v58-export').isDisabled(),false);
 await page.locator('#v60-save-comparison').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('test-weekly-workspace')||'{}').data?.competitors?.length===1&&!document.querySelector('#v60-save-comparison').disabled);
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
 await page.locator('#v59-plan [data-v59-recheck]').click();assert.equal(await page.locator('#v59-plan .v62-action-details').first().getAttribute('open'),null);await page.locator('#v59-plan .v62-action-details summary').first().click();assert.equal(await page.locator('#v59-plan .v62-action-details').first().getAttribute('open'),'');
 await page.locator('#v59-plan .v59-action [data-v23-fix="edit-tags"]').click();
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
 await page.waitForFunction(()=>document.querySelector('#v27-ai-status')?.textContent.includes('available'));assert.match(await page.locator('#v66-allowance').innerText(),/2 available now.*2 of 3 personal daily requests left/);
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
 await page.evaluate(async()=>{const {clearWorkspace}=await import('./js/ui.js');const {state}=await import('./js/core.js');document.querySelector('#v61-checklist').textContent='Private setup';document.querySelector('#v60-search').value='Private search';document.querySelector('#v60-queue').textContent='Private queue';document.querySelector('#v59-plan').textContent='Private action plan';document.querySelector('#v58-title').value='private competitor';document.querySelector('#v58-results').textContent='Private competitor results';document.querySelector('#v57-seed').value='private keyword';document.querySelector('#v57-extra').value='private modifier';document.querySelector('#v57-results').textContent='Private keyword results';document.querySelector('#keyword-results').textContent='Private catalogue results';document.querySelector('#ai-output').value='Private prior brief';document.querySelector('#ai-audience').value='Private audience';document.querySelector('#ai-facts').value='Private facts';state.shortlist=['private phrase'];clearWorkspace()});
 assert.equal(await page.locator('#v61-checklist').textContent(),'');assert.equal(await page.locator('#v95-search').inputValue(),'');assert.equal(await page.locator('#v95-tools').textContent(),'');assert.equal(await page.locator('#v96-next').textContent(),'');assert.equal(await page.locator('#v60-search').inputValue(),'');assert.equal(await page.locator('#v90-groups').textContent(),'');assert.equal(await page.locator('#v90-market').inputValue(),'');assert.equal(await page.locator('#v90-issue').inputValue(),'');assert.doesNotMatch(await page.locator('#v60-queue').textContent(),/Private queue/);assert.equal(await page.locator('#v59-plan').textContent(),'');assert.equal(await page.locator('#v59-plan').isVisible(),false);assert.equal(await page.locator('#v58-title').inputValue(),'');assert.doesNotMatch(await page.locator('#v58-results').textContent(),/Private competitor results/);assert.equal(await page.locator('#v67-keywords').inputValue(),'');assert.equal(await page.locator('#v67-results').textContent(),'');assert.equal(await page.locator('#v67-run').isDisabled(),true);assert.equal(await page.locator('#v57-seed').inputValue(),'');assert.equal(await page.locator('#v57-extra').inputValue(),'');assert.doesNotMatch(await page.locator('#v57-results').textContent(),/Private keyword results/);assert.doesNotMatch(await page.locator('#keyword-results').textContent(),/Private catalogue results/);assert.equal(await page.locator('#ai-output').inputValue(),'');assert.equal(await page.locator('#ai-audience').inputValue(),'');assert.equal(await page.locator('#ai-facts').inputValue(),'');assert.equal(await page.locator('#v19-content-reports').innerText(),'');assert.equal(await page.locator('#auth-signup').isDisabled(),true);
 const race=await page.evaluate(async()=>{const {state}=await import('./js/core.js');const {guarded}=await import('./js/supabase-client.js');const original=state.client.auth.getUser;let release,called=false;const uid=state.uid;state.client.auth.getUser=()=>new Promise(r=>{release=r});const pending=guarded(()=>{called=true});state.serial++;release({data:{user:{id:uid}},error:null});await pending;state.client.auth.getUser=original;return called});assert.equal(race,false);
 await page.goto(origin+'/index.html?v=62&refresh=1');await ready();assert.equal(new URL(page.url()).pathname,'/app.html');assert.equal(new URL(page.url()).searchParams.get('v'),'106');
 await page.goto(origin+'/#access_token=fixture-only&type=recovery');await page.locator('#reset-container').waitFor({state:'visible'});assert.equal(new URL(page.url()).pathname,'/app.html');assert.equal(await page.locator('#view-auth.active').isVisible(),true);assert.match(await page.locator('#auth-message').innerText(),/Recovery link verified/);await page.evaluate(()=>localStorage.removeItem('test-v64-reset'));
 assert.equal(await page.locator('#reset-password').getAttribute('minlength'),'12');
 for(const invalid of ['Short1Ab','fixture-password','FIXTUREPASSWORD1','FixturePassword']){
  await page.locator('#reset-password').fill(invalid);await page.locator('#auth-reset').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('test-v64-reset')),null);
  assert.equal(await page.locator('#view-auth.active').isVisible(),true);
  assert.match(await page.locator('#toast').innerText(),/at least 12 characters/);
 }
 await page.locator('#reset-password').fill('FixturePassword12');await page.locator('#auth-reset').click();await ready();assert.equal(await page.evaluate(()=>localStorage.getItem('test-v64-reset')),'done');assert.equal(await page.locator('#reset-container').isHidden(),true);
 assert.deepEqual(staleRequests,[]);workspacePhase=false;
 const demoPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const demoRequests=[],demoErrors=[];demoPage.on('pageerror',e=>demoErrors.push(e.message));await demoPage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin!==origin){demoRequests.push(u.origin);return route.abort()}if(u.pathname.startsWith('/js/')&&u.searchParams.get('v')!=='106'){demoRequests.push(u.pathname+u.search);return route.abort()}return route.continue()});
 await demoPage.goto(origin+'/demo.html');await demoPage.locator('#demo-fix').waitFor({state:'visible'});assert.match(await demoPage.locator('#demo-score').innerText(),/51\/100/);await demoPage.locator('#demo-fix').click();assert.match(await demoPage.locator('#demo-delta').innerText(),/Change \+11/);await demoPage.locator('#demo-undo').click();assert.match(await demoPage.locator('#demo-score').innerText(),/51\/100/);await demoPage.locator('#demo-keywords').click();assert.match(await demoPage.locator('#demo-ideas').innerText(),/local relevance/);assert.equal(await demoPage.evaluate(()=>localStorage.length),0);assert.deepEqual(demoRequests,[]);assert.deepEqual(demoErrors,[]);await demoPage.close();
 await page.goto(origin+'/demo.html');await page.locator('#demo-fix').waitFor({state:'visible'});assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.locator('#demo-fix').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/62\/100/);await page.locator('#demo-reset').click();assert.match(await page.locator('#demo-panel .demo-score').innerText(),/51\/100/);
 await page.goto(origin+'/help.html');assert.match(await page.locator('h1').innerText(),/Help & tutorials/);await page.locator('summary').filter({hasText:'Discover keywords'}).click();assert.equal(await page.locator('details').filter({hasText:'4. Discover keywords'}).getAttribute('open'),'');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.setViewportSize({width:1280,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);await page.setViewportSize({width:393,height:852});
 await page.goto(origin+'/');await page.waitForFunction(()=>{const i=document.querySelector('.public-brand img');return i?.complete&&i.naturalWidth===32;});assert.match(await page.locator('h1').innerText(),/Know what to improve/);assert.equal(await page.locator('#view-auth').count(),0);assert.equal(await page.locator('.hero a[href="./app.html"]').count(),1);await page.goto(origin+'/home.html');assert.match(await page.locator('h1').innerText(),/Know what to improve/);await page.locator('.hero a[href="./beta.html"]').click();assert.match(await page.locator('h1').innerText(),/Join the private beta/);assert.match(await page.locator('main').innerText(),/not accepting applications online/);await page.locator('#beta-prepare input').first().check();const invitation=page.waitForEvent('download');await page.locator('#beta-download').click();assert.equal((await invitation).suggestedFilename(),'sellerpilot-beta-checklist.txt');assert.match(await page.locator('#beta-status').innerText(),/No information was sent/);
 assert.equal(await page.locator('a[href="./demo.html"]').count()>0,true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
 await page.locator('a[href="./privacy.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not a final privacy notice/);
 await page.locator('a[href="./terms.html"]').first().click();assert.match(await page.locator('.notice').innerText(),/Not final commercial terms/);
 assert.deepEqual(errors,[]);
 // V101/V103/V104: independent desktop and narrow-mobile sessions, fixture network only.
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const desktop=viewport.width>1000;
  const acceptance=await browser.newPage({viewport,isMobile:!desktop,hasTouch:!desktop,reducedMotion:'reduce'});
  const blocked=[],acceptErrors=[];
  acceptance.on('pageerror',e=>acceptErrors.push(e.message));
  await acceptance.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin===origin)return route.continue();
   if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});
   blocked.push(u.origin);return route.abort();
  });
  const fits=async()=>assert.equal(await acceptance.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),true,'Horizontal page overflow at '+viewport.width);
  await acceptance.goto(origin+'/app.html');
  await acceptance.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
  await fits();
  await acceptance.locator('#v95-directory summary').focus();await acceptance.keyboard.press('Enter');
  assert.equal(await acceptance.locator('#v95-directory').getAttribute('open'),'');
  await acceptance.locator('#v95-search').fill('profit calculator');
  assert.equal(await acceptance.locator('#v95-tools [data-v61-go]').count(),1);
  await acceptance.locator('#v95-tools [data-v61-go="profits"]').focus();await acceptance.keyboard.press('Enter');
  assert.equal(await acceptance.locator('#view-profits').isVisible(),true);await fits();
  await acceptance.locator('[data-view="overview"]:visible').first().click();
  await acceptance.locator('#v95-search').fill('keyword lab');
  await acceptance.locator('#v95-tools [data-v61-go="keywords"]').click();
  assert.equal(await acceptance.locator('#view-keywords').isVisible(),true);await fits();
  assert.equal(await acceptance.locator('#v67-run').isDisabled(),true);
  assert.equal(await acceptance.locator('#v67-consent').isChecked(),false);
  assert.equal(await acceptance.evaluate(()=>localStorage.getItem('test-fixture')),null);
  assert.equal(await acceptance.evaluate(()=>localStorage.getItem('test-weekly-workspace')),null);
  assert.equal(await acceptance.evaluate(()=>Number(localStorage.getItem('test-v63-sandbox-requests')||0)),0);
  await acceptance.evaluate(async()=>{const {clearWorkspace}=await import('./js/ui.js?v=106');clearWorkspace()});
  assert.equal(await acceptance.locator('#view-auth').isVisible(),true);
  assert.equal(await acceptance.locator('#v95-tools').textContent(),'');
  assert.equal(await acceptance.locator('#v67-results').textContent(),'');
  assert.deepEqual(blocked,[]);assert.deepEqual(acceptErrors,[]);
  await acceptance.close();
  console.log('PASS V101/V103/V104: '+viewport.width+'px viewport, keyboard tool navigation, overflow, explicit consent and private-state reset (mock only)');
 }
 // V112: isolated fixture context, no live account or auth request.
 const logoutPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const logoutExternal=[];
 logoutPage.on('dialog',d=>d.accept());
 await logoutPage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});logoutExternal.push(u.origin);return route.abort()});
 await logoutPage.goto(origin+'/app.html');
 await logoutPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 await logoutPage.locator('[data-view="settings"]:visible').first().click();
 await logoutPage.evaluate(()=>{localStorage.setItem('test-v112-expired','yes');localStorage.setItem('test-v112-fail','yes')});
 await logoutPage.locator('#settings-logout').click();
 await logoutPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Sign-out could not be confirmed'));
 assert.equal(await logoutPage.locator('#view-settings').isVisible(),true);
 assert.equal(await logoutPage.locator('#settings-logout').isEnabled(),true);
 assert.equal(await logoutPage.evaluate(()=>localStorage.getItem('test-v112-scope')),'local');
 await logoutPage.evaluate(()=>localStorage.removeItem('test-v112-fail'));
 await logoutPage.locator('#settings-logout').click();
 await logoutPage.locator('#view-auth.active').waitFor({state:'visible'});
 assert.equal(await logoutPage.locator('#account-chip').textContent(),'Sign in required');
 assert.equal(await logoutPage.evaluate(()=>localStorage.getItem('test-v112-signed-out')),'yes');
 await logoutPage.reload();
 await logoutPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Ready for secure sign in'));
 assert.equal(await logoutPage.locator('#view-auth.active').isVisible(),true);
 assert.deepEqual(logoutExternal,[]);
 await logoutPage.close();
 console.log('PASS V112: local sign-out bypasses expired user preflight; network failure honest and retryable; sign-in screen persists after reload (mock only).');
 // V113: a deliberately corrupted API fixture must not populate the private catalogue.
 const isolationPage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
 const isolationExternal=[];
 await isolationPage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});isolationExternal.push(u.origin);return route.abort()});
 await isolationPage.goto(origin+'/app.html');
 await isolationPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 const foreignResult=await isolationPage.evaluate(async()=>{const {state}=await import('./js/core.js?v=106');const {editProduct,saveProduct,deleteProduct,duplicateProduct}=await import('./js/product-editor.js?v=106');const own=state.products[0];state.products.push({...own,id:'foreign-fixture',user_id:'other-user',title:'Foreign fixture sentinel'});editProduct(own.id);editProduct('foreign-fixture');const opened=state.editing==='foreign-fixture';state.editing='foreign-fixture';let requests=0;const from=state.client.from;state.client.from=(...args)=>{requests++;return from.apply(state.client,args)};try{await saveProduct();await deleteProduct('foreign-fixture');await duplicateProduct('foreign-fixture')}finally{state.client.from=from}return {opened,requests,mutation:localStorage.getItem('test-fixture')}}); 
 assert.equal(foreignResult.opened,false);assert.equal(foreignResult.requests,0);assert.equal(foreignResult.mutation,null);
 await isolationPage.evaluate(()=>localStorage.setItem('test-v113-foreign','yes'));
 await isolationPage.reload();
 await isolationPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Account data isolation check failed'));
 assert.equal(await isolationPage.locator('#view-auth.active').isVisible(),true);
 assert.equal(await isolationPage.evaluate(async()=>{const {state}=await import('./js/core.js?v=106');return state.products.length}),0);
 assert.deepEqual(isolationExternal,[]);
 await isolationPage.close();
 console.log('PASS V113: rejected foreign catalogue response and foreign editor/save/delete/duplicate targets (mock only).');
 // V118: verify a response initiated before sign-out cannot reopen the previous editor.
 for(const outcome of ['success','error']){
  const stalePage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const external=[];
  await stalePage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});external.push(u.origin);return route.abort()});
  await stalePage.goto(origin+'/app.html');
  await stalePage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
  const result=await stalePage.evaluate(async outcome=>{
   const {state}=await import('./js/core.js?v=106');
   const {editProduct,saveProduct}=await import('./js/product-editor.js?v=106');
   const {accountIdentity}=await import('./js/supabase-client.js?v=106');
   const own=state.products[0];editProduct(own.id);
   let release,started;
   const pending=new Promise(r=>{release=r}),entered=new Promise(r=>{started=r});
   const original=state.client.from;
   let requests=0;
   state.client.from=(...args)=>{
    requests++;
    const query={update(){return query},eq(){return query},select(){return query},async maybeSingle(){started();await pending;if(outcome==='error')throw Error('Old account private fixture error');return{data:{...own,title:'Stale response sentinel'},error:null}}};
    return query;
   };
   try{
    const saving=saveProduct();await entered;accountIdentity(null);
    release();await saving;
    return {requests,uid:state.uid,editing:state.editing,products:state.products.length,banner:document.querySelector('#cloud-status').textContent,editor:document.querySelector('#edit-title').value,ready:state.ready};
   }finally{state.client.from=original;release()}
  },outcome);
  assert.equal(result.requests,1);assert.equal(result.uid,null);assert.equal(result.editing,null);assert.equal(result.products,0);assert.equal(result.ready,false);assert.equal(result.editor,'');
  assert.match(result.banner,/Sign in to access/);
  assert.equal(await stalePage.locator('#view-auth.active').isVisible(),true);
  assert.deepEqual(external,[]);await stalePage.close();
 }
 console.log('PASS V118: late success and thrown error from prior account generation do not reopen editor, expose data or overwrite sign-in status (mock only).');
 // V120: explicit recovery origins only; never send real email.
 const redirectPage=await browser.newPage();
 await redirectPage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===origin)return route.continue();if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});return route.abort()});
 await redirectPage.goto(origin+'/app.html');
 await redirectPage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
 const recoveryCases=await redirectPage.evaluate(async()=>{const {recoveryRedirectFor}=await import('./js/supabase-client.js?v=106');return [
  'https://sellerpilot-ai.github.io/sellerpilot-ai/app.html?v=106',
  'https://sellerpilot-ai-21c.pages.dev/app',
  'https://sellerpilot-ai-21c.pages.dev/',
  'https://sellerpilot-ai-21c.pages.dev.evil.invalid/app',
  'https://preview.sellerpilot-ai-21c.pages.dev/app',
  'https://sellerpilot-ai.github.io/other/app.html',
  'http://sellerpilot-ai-21c.pages.dev/app',
  'https://fake@sellerpilot-ai-21c.pages.dev/app',
  location.href
 ].map(recoveryRedirectFor)});
 assert.deepEqual(recoveryCases,['https://sellerpilot-ai.github.io/sellerpilot-ai/','https://sellerpilot-ai-21c.pages.dev/','https://sellerpilot-ai-21c.pages.dev/',null,null,null,null,null,null]);
 await redirectPage.close();
 console.log('PASS V120: exact recovery origin and path selection; unrelated, preview, HTTP and credential-bearing URLs denied; no real email.');
 // V116: serve only the static output, on a distinct local origin, with all external services mocked.
 const runtimeTemp=await mkdtemp(resolve(tmpdir(),'sellerpilot-hosting-'));
 let packageServer,packagePage;
 try{
  const destination=resolve(runtimeTemp,'frontend');
  const files=new Set(await buildStaticPackage(process.cwd(),destination));
  packageServer=createServer(async(req,res)=>{
   try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const relative=pathname==='/'?'index.html':pathname.slice(1);
    if(!files.has(relative)){res.writeHead(404).end();return}
    const bytes=await readFile(resolve(destination,relative));
    res.writeHead(200,{'Content-Type':types[extname(relative)],'X-Content-Type-Options':'nosniff'}).end(bytes);
   }catch{if(!res.headersSent)res.writeHead(500).end()}
  });
  await new Promise(r=>packageServer.listen(0,'127.0.0.1',r));
  const packageOrigin='http://127.0.0.1:'+packageServer.address().port;
  packagePage=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  const external=[],errors=[],missing=[];
  packagePage.on('pageerror',e=>errors.push(e.message));
  packagePage.on('response',r=>{if(r.url().startsWith(packageOrigin+'/')&&r.status()>=400)missing.push(r.url())});
  await packagePage.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===packageOrigin)return route.continue();if(u.href.startsWith('https://esm.sh/@supabase/supabase-js@'))return route.fulfill({status:200,contentType:'application/javascript',headers:{'access-control-allow-origin':'*'},body:mock});external.push(u.origin);return route.abort()});
  await packagePage.goto(packageOrigin+'/');
  assert.match(await packagePage.title(),/SellerPilot AI/);
  await packagePage.goto(packageOrigin+'/app.html');
  await packagePage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Cloud synced'));
  await packagePage.locator('[data-view="products"]:visible').first().click();
  assert.match(await packagePage.locator('#product-mobile').innerText(),/Minimalist Gold Tone Bracelet/);
  await packagePage.locator('#view-products [data-edit="fixture-product"]:visible').first().click();
  await packagePage.locator('#v23-guide').waitFor({state:'visible'});
  assert.equal(await packagePage.locator('#edit-title').inputValue(),'Minimalist Gold Tone Bracelet');
  assert.deepEqual(external,[]);assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  for(const privatePath of ['/tests/v24-browser.mjs','/supabase/config.toml','/.git/config','/.env','/README.md']){
   const response=await fetch(packageOrigin+privatePath);assert.equal(response.status,404);
  }
  console.log('PASS V116: packaged frontend startup, catalogue and editor on independent local origin; private paths absent; zero external requests (mock only).');
 }finally{if(packagePage)await packagePage.close();if(packageServer)await new Promise(r=>packageServer.close(r));await rm(runtimeTemp,{recursive:true,force:true})}
 const failurePage=await browser.newPage();
 await failurePage.route('**/*',async route=>{const url=new URL(route.request().url());if(url.pathname.endsWith('/keyword-discovery.js'))return route.abort();if(url.origin===origin)return route.continue();return route.abort()});
 await failurePage.goto(origin+'/app.html?v=106');await failurePage.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Workspace startup failed'));
 assert.equal(await failurePage.locator('#account-chip').textContent(),'Connection unavailable');await failurePage.close();
 console.log('PASS: one version for all local workspace modules; simulated stale cache cannot supply outdated modules; failed module startup is visible.');
 console.log('PASS: module startup, mocked authentication, mobile navigation, guided apply, immediate score refresh, undo, mocked save and reload. No real cloud requests.');
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r))}
