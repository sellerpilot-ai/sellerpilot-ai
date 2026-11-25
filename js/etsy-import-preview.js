// Offline preview only. No OAuth, network, storage or AI calls.
export function previewEtsyCatalogue(payload, authorizedShopId) {
 if (!Number.isSafeInteger(authorizedShopId) || authorizedShopId <= 0) throw Error('Invalid authorized shop');
 if (!Array.isArray(payload?.results) || payload.results.length > 100) throw Error('Invalid listing page');
 const seen = new Set();
 return payload.results.map(row => {
  if (row?.shop_id !== authorizedShopId || !Number.isSafeInteger(row.listing_id) || row.listing_id <= 0 || seen.has(row.listing_id)) throw Error('Invalid listing identity');
  if (typeof row.title !== 'string' || !row.title.trim() || /[\u0000-\u001f\u007f]/u.test(row.title) || row.title.length > 500 || !Array.isArray(row.tags) || row.tags.length > 13 || row.tags.some(t => typeof t !== 'string' || !t.trim() || /[\u0000-\u001f\u007f]/u.test(t) || t.length > 100)) throw Error('Invalid listing fields');
  seen.add(row.listing_id);
  return {listingId:row.listing_id, shopId:authorizedShopId, title:row.title, tags:[...row.tags], source:'etsy-api', readOnly:true, aiAllowed:false};
 });
}

// Synthetic-data import design prototype ONLY; deliberately not wired into the live application.
// No provider request, storage, analytics or AI. Untrusted fields are never propagated.
export function planSyntheticCatalogueImport(input, existing=[]){
 if(input?.source!=='synthetic-fixture'||!Array.isArray(input.listings)||input.listings.length>50||!Array.isArray(existing))throw Error('Synthetic fixture required');
 const normal=s=>String(s??'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
 const seen=new Set(),titles=new Set(existing.map(x=>normal(x.title)).filter(Boolean)),skus=new Set(existing.map(x=>normal(x.sku)).filter(Boolean)),ids=new Set(existing.map(x=>x.fixtureId).filter(Boolean));
 const text=(v,max,required=false)=>typeof v==='string'&&v.length<=max&&(!required||!!v.trim())&&!/[\u0000-\u001f\u007f]/u.test(v);
 return input.listings.map(row=>{
  const id=row?.fixtureId;
  if(typeof id!=='string'||!/^sample-[a-z0-9-]{1,60}$/.test(id)||seen.has(id))throw Error('Invalid or repeated fixture identity');
  seen.add(id);
  if(!text(row.title,250,true)||!text(row.description,10000)||!text(row.sku,200)||!Array.isArray(row.tags)||row.tags.length>13||row.tags.some(x=>!text(x,100,true))||!Number.isSafeInteger(row.priceMinor)||row.priceMinor<=0||row.priceMinor>999999999||!['GBP','USD'].includes(row.currency))return {fixtureId:id,status:'invalid',reason:'Review required fields'};
  const duplicate=ids.has(id)?'Fixture identity already present':skus.has(normal(row.sku))&&normal(row.sku)?'Matching SKU':titles.has(normal(row.title))?'Matching title':'';
  const result={fixtureId:id,status:duplicate?'duplicate':'ready',reason:duplicate||'Ready for review',title:row.title.trim(),description:row.description,tags:[...row.tags],sku:row.sku.trim(),priceMinor:row.priceMinor,currency:row.currency};
  if(!duplicate){ids.add(id);titles.add(normal(row.title));if(normal(row.sku))skus.add(normal(row.sku))}
  return result;
 });
}
