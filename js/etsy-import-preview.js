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
