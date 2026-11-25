import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
const browser=await chromium.launch({headless:true});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390});
  const network=[],errors=[];
  page.on('request',req=>{if(/^https?:/.test(req.url()))network.push(req.url())});
  page.on('pageerror',err=>errors.push(err.message));
  await page.route(/^https?:\/\//,route=>route.abort());
  await page.goto(pathToFileURL(resolve('preview-output/SellerPilot-V106-Offline-Preview.html')).href);
  await page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Offline fixture synced'));
  assert.match(await page.locator('#preview-notice').innerText(),/fictional data only/);
  assert.match(await page.locator('#v60-queue').innerText(),/Minimalist Gold Tone Bracelet/);
  await page.locator('[data-view="products"]:visible').first().click();
  const cards=await page.locator('#product-mobile .product-card').count();assert.equal(cards,3);
  assert.equal(await page.locator('#product-table tr').count(),3);
  assert.equal(await page.locator('#product-mobile').isVisible(),width===390);
  assert.equal(await page.locator('#product-table').isVisible(),width!==390);
  assert.match(await page.locator('#product-count').innerText(),/Showing 3 of 3/);
  const identities=await page.locator('#product-mobile .product-card').evaluateAll(rows=>rows.map(r=>[r.dataset.productId,r.dataset.productPosition]));
  assert.deepEqual(identities,[['preview-1','1'],['preview-2','2'],['preview-3','3']]);
  await page.locator('#product-search').fill('Gift mug');assert.equal(await page.locator('#product-mobile .product-card').count(),1);
  await page.locator('#product-search').fill('');assert.equal(await page.locator('#product-mobile .product-card').count(),3);
  await page.locator('[data-view="shop"]:visible').first().click();
  assert.equal(await page.evaluate(()=>!!(document.querySelector('#v21-cloud-list').compareDocumentPosition(document.querySelector('#v109-etsy-connection'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
  assert.equal(await page.evaluate(()=>!!(document.querySelector('#v21-manual-title').compareDocumentPosition(document.querySelector('#v21-shop-url'))&Node.DOCUMENT_POSITION_FOLLOWING)),true);
  await page.locator('[data-view="products"]:visible').first().click();assert.equal(await page.locator('#product-mobile .product-card').count(),3);
  await page.locator('[data-view="overview"]:visible').first().click();
  await page.locator('#v95-directory summary').click();
  await page.locator('#v95-search').fill('profit calculator');
  await page.locator('#v95-tools [data-v61-go="profits"]').click();
  assert.equal(await page.locator('#view-profits').isVisible(),true);
  await page.locator('[data-view="overview"]:visible').first().click();
  await page.locator('#v60-queue [data-v60-review="preview-1"]').click();
  assert.equal(await page.locator('#v59-plan').isVisible(),true);
  await page.locator('[data-v108-scroll="edit-tags"]').click();assert.equal(await page.locator('#edit-tags').evaluate(el=>document.activeElement===el),true);
  await page.locator('#save-product').click();
  await page.waitForFunction(()=>document.querySelector('#editor-state')?.textContent==='Saved in cloud');
  await page.locator('#preview-restart').click();
  await page.waitForFunction(()=>document.querySelector('#cloud-status')?.textContent.includes('Offline fixture synced'));
  assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
  await page.close();
  console.log('PASS V107 offline single-file preview: '+width+'px, local listing save, navigation, restart and zero external requests.');
 }
}finally{await browser.close()}
