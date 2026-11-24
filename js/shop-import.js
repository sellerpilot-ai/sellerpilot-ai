import { $, esc, norm, tagList, cash, productCurrency, state, toast, banner, busy } from './core.js';
import { productQuality } from './audit.js';
import { verifiedUser } from './supabase-client.js';
import { editProduct } from './product-editor.js';
import { download } from './csv.js';
import { chosenView } from './ui.js';
import { v23 } from './guided-fixes.js';
import { v25LegacyEnabled } from './marketplace-focus.js';

/* SellerPilot V21 — shop-first, approved-API listing previews and private catalogue audits.
   No scraping, no invented marketplace listing data, and no unverified shop ownership claim. */
export const v21={provider:'',shop:'',shopUrl:'',status:'Paste a supported shop link to check available listings.',results:[],checkedAt:'',apiSource:'',apiNote:'',busy:false,selectedCloud:new Set(),selectedRemote:new Set(),filter:'',reviewHtml:'',manualStatus:''};
export function v21Reset(){v21.provider='';v21.shop='';v21.shopUrl='';v21.status='Paste a supported shop link to check available listings.';v21.results=[];v21.checkedAt='';v21.apiSource='';v21.apiNote='';v21.busy=false;v21.selectedCloud.clear();v21.selectedRemote.clear();v21.filter='';v21.reviewHtml='';v21.manualStatus='';}
export function v21ParseShop(raw){
 let s=String(raw||'').trim();if(!s)throw Error('Paste your shop URL first.');if(s.length>500)throw Error('That URL is too long.');
 if(!/^https?:\/\//i.test(s))s='https://'+s;
 let u;try{u=new URL(s)}catch{throw Error('Enter a complete Etsy or eBay shop URL.')}
 if(u.protocol!=='https:')throw Error('Use a secure HTTPS shop link.');
 const host=u.hostname.toLowerCase(),path=u.pathname.split('/').filter(Boolean);
 if(['etsy.com','www.etsy.com'].includes(host)&&path[0]?.toLowerCase()==='shop'&&/^[a-zA-Z0-9_-]{2,50}$/.test(path[1]||''))return{provider:'etsy',shop:path[1],label:'Etsy shop',url:'https://www.etsy.com/shop/'+encodeURIComponent(path[1])};
 if(/^((www|m)\.)?ebay\.(co\.uk|com)$/.test(host)){
  let seller='';if(['usr','sch'].includes(path[0]?.toLowerCase())){
    if(path[0].toLowerCase()==='usr')seller=path[1]||'';
    else seller=u.searchParams.get('_ssn')||(!/\.html$/i.test(path[1]||'')?path[1]||'':'');
  }
  if(/^[a-zA-Z0-9_-]{2,50}$/.test(seller))return{provider:'ebay',shop:seller,label:'eBay seller',url:u.origin+u.pathname+u.search};
  if(path[0]?.toLowerCase()==='str')throw Error('eBay store page links do not always reveal the seller username. Please use an eBay seller link such as ebay.co.uk/usr/SellerName.');
 }
 throw Error('Supported shop links: etsy.com/shop/ShopName and ebay.co.uk/usr/SellerName.');
}
export function v21Render(){
 if(!state.ready)return;
 v21RenderCloud();v21RenderRemote();
 const status=$('v21-shop-message');if(status){status.textContent=v21.status;status.className='v21-message'+(v21.status.startsWith('Official')?' ok':'')}
 const summary=$('v21-shop-details');if(summary)summary.textContent=v21.shop?'Recognised '+(v21.provider==='etsy'?'Etsy shop':'eBay seller')+': '+v21.shop+'. Listings will only be retrieved through an authorised API.':(v25LegacyEnabled()?'We recognise Etsy and eBay seller links.':'We recognise Etsy shop links.')+' No private shop data is accessed through a public link.';
 const box=$('v21-results-meta');if(box)box.textContent=v21.apiSource?`${v21.results.length} returned · ${v21.apiSource} · ${v21.checkedAt?.slice(0,16)||'date unavailable'}`:'No external listings retrieved yet';
 const batch=$('v21-review-output');if(batch)batch.innerHTML=v21.reviewHtml||'<div class="v21-placeholder">Select one or more saved products, then tap “Analyse selected”. You will see specific issues and a button to open the full editor.</div>';
 const shopInput=$('v21-shop-url');if(shopInput&&document.activeElement!==shopInput&&v21.shopUrl&&!shopInput.value)shopInput.value=v21.shopUrl;
}
export function v21RenderCloud(){
 const list=$('v21-cloud-list');if(!list)return;
 const term=norm(v21.filter),rows=state.products.filter(p=>!term||norm([p.title,p.tags,p.sku].join(' ')).includes(term));
 $('v21-cloud-count').textContent=`${rows.length} of ${state.products.length} private cloud products · ${v21.selectedCloud.size} selected`;
 list.innerHTML=rows.length?rows.map(p=>{const audit=productQuality(p),n=audit.issues.length;
  return `<article class="v21-listing"><label class="v21-choice"><input type="checkbox" data-v21-cloud="${esc(p.id)}" ${v21.selectedCloud.has(p.id)?'checked':''} aria-label="Select ${esc(p.title)}"><span class="v21-listing-title">${esc(p.title)}</span></label><div class="v21-meta"><span>${esc(cash(p.price,productCurrency(p)))}</span><span>Internal audit ${audit.score}/100</span><span>${n} basic findings</span></div><div class="v21-listing-actions"><button type="button" class="button ghost sm" data-v21-action="review-one" data-id="${esc(p.id)}">See problems</button><button type="button" class="button secondary sm" data-v21-action="open-editor" data-id="${esc(p.id)}">Open editor</button></div></article>`
 }).join(''):'<div class="v21-placeholder">No saved cloud products match that filter. Import a compatible CSV or clear the search.</div>';
}
export function v21RenderRemote(){
 const el=$('v21-external-list');if(!el)return;
 if(!v21.results.length){el.innerHTML='<div class="v21-placeholder">No official API listings have been retrieved. Your saved catalogue can still be audited below.</div>';return}
 el.innerHTML=v21.results.map((p,i)=>{
  const url=v21SafeURL(p.url,v21.provider),image=v21SafeImage(p.image);
  return `<article class="v21-listing v21-external"><label class="v21-choice"><input type="checkbox" data-v21-remote="${i}" ${v21.selectedRemote.has(i)?'checked':''} aria-label="Select ${esc(p.title)}">${image?`<img class="v21-thumb" loading="lazy" alt="" src="${esc(image)}">`:''}<span class="v21-listing-title">${esc(p.title)}</span></label><div class="v21-meta"><span>${p.price!=null&&p.currency?esc(p.currency+' '+p.price):'Price unavailable'}</span><span>${esc(v21.apiSource)}</span><span>Public data only</span></div><div class="v21-listing-actions">${url?`<a target="_blank" rel="noopener noreferrer" class="button ghost sm" href="${esc(url)}">View listing</a>`:''}<button class="button secondary sm" data-v21-action="review-remote" data-index="${i}">Review available fields</button></div></article>`}).join('');
}
export function v21SafeURL(s,provider){try{const u=new URL(s);if(u.protocol!=='https:')return'';if(provider==='etsy'&&!['www.etsy.com','etsy.com'].includes(u.hostname))return'';if(provider==='ebay'&&!/^((www|m)\.)?ebay\.(co\.uk|com)$/.test(u.hostname))return'';return u.href}catch{return''}}
export function v21SafeImage(s){try{const u=new URL(s);return u.protocol==='https:'&&s.length<1400?u.href:''}catch{return''}}
export function v21CloudReview(id){const p=state.products.find(x=>x.id===id);if(!p)return'';const a=productQuality(p);
 const checks=[...a.issues].sort((x,y)=>({critical:0,important:1,minor:2}[x.severity]??3)-({critical:0,important:1,minor:2}[y.severity]??3)||y.penalty-x.penalty);
 return `<article class="v21-audit"><div class="v21-audit-top"><div><strong>${esc(p.title)}</strong><p class="mini">Internal listing completeness checks · ${esc(a.market)}</p></div><span class="v21-score">${a.score}/100</span></div>${checks.length?`<div class="v21-issues">${checks.slice(0,8).map((x,i)=>`<div class="v23-issue-line"><p><b>${esc(x.heading)}</b> — ${esc(x.detail)}</p><button type="button" class="button secondary sm" data-v23-open="${esc(p.id)}" data-v23-field="${esc(x.field)}" data-v23-heading="${esc(x.heading)}">Fix this →</button></div>`).join('')}</div>`:'<p class="v21-good">No gaps flagged by the current basic rules. This does not predict search ranking.</p>'}<div class="v23-review-banner"><button class="button secondary sm" data-v21-action="open-editor" data-id="${esc(p.id)}">Open full listing editor</button><span class="mini">Changes must be saved explicitly; nothing is published to marketplaces.</span></div></article>`;
}
export function v21PublicReview(item,provider){
 if(!item)return'';const issues=[],unavailable=[];const title=String(item.title||''),tags=Array.isArray(item.tags)?item.tags:null,description=typeof item.description==='string'?item.description:null,limit=provider==='etsy'?140:80;
 if(title.length>limit)issues.push('Title is longer than '+limit+' characters; review the marketplace/category limit.');
 if(title.length<28)issues.push('Title may not identify the product clearly enough.');
 if(title.length>8&&title===title.toUpperCase())issues.push('Title is entirely uppercase; consider ordinary sentence or title case.');
 if(tags){if(provider==='etsy'&&tags.length<13)issues.push('Only '+tags.length+' of 13 possible Etsy tags are present.');if(tags.some(t=>String(t).length>20)&&provider==='etsy')issues.push('Some Etsy tags exceed 20 characters.');if(new Set(tags.map(norm)).size!==tags.length)issues.push('There are repeated tag phrases.');}else unavailable.push('SEO tags');
 if(description!==null){if(description.trim().length<100)issues.push('Description is short; include confirmed product details, dimensions and care instructions.')}else unavailable.push('Description');
 if(!item.image)unavailable.push('Photo quality and image completeness');
 return `<article class="v21-audit"><div class="v21-audit-top"><div><strong>${esc(title)}</strong><p class="mini">Partial public listing review · ${esc(provider==='etsy'?'Etsy':'eBay')}</p></div><span class="v21-partial">Partial audit</span></div>${issues.length?`<div class="v21-issues">${issues.map(x=>`<p>${esc(x)}</p>`).join('')}</div>`:'<p class="v21-good">No issues identified in the available fields. This is not a complete listing audit.</p>'}${unavailable.length?`<p class="mini">Not checked because the API did not supply: ${esc(unavailable.join(', '))}.</p>`:''}<p class="mini">Public shop links do not prove ownership or grant editing rights.</p></article>`;
}
export async function v21Lookup(){
 if(!state.ready||v21.busy)return;
 let details;try{details=v21ParseShop($('v21-shop-url').value);if(details.provider!=='etsy'&&!v25LegacyEnabled())throw Error('SellerPilot currently focuses on Etsy. Enable legacy marketplace tools in Settings to use other supported links.')}catch(e){v21.status=e.message;v21Render();toast(e.message,true);return}
 v21.provider=details.provider;v21.shop=details.shop;v21.shopUrl=details.url;v21.results=[];v21.selectedRemote.clear();v21.apiSource='';v21.checkedAt='';v21.reviewHtml='';v21.busy=true;v21.status='Checking your shop through the approved marketplace API…';v21Render();$('v21-lookup').disabled=true;
 try{
  await verifiedUser();const {data,error}=await state.client.functions.invoke('sellerpilot-shop-listings',{body:{provider:details.provider,shop:details.shop}});
  if(error){let extra='';try{if(error.context?.json){const b=await error.context.json();extra=b.detail||b.error||'';}}catch{}throw Error(extra||error.message||'The shop API is not accessible.')}
  if(!data?.ok||!Array.isArray(data.listings))throw Error(data?.detail||'The marketplace did not return a valid listings response.');
  v21.results=data.listings.filter(x=>x&&typeof x.title==='string'&&typeof x.url==='string').slice(0,30);
  v21.apiSource=String(data.source||details.label);v21.checkedAt=String(data.retrieved_at||'');v21.apiNote=String(data.note||'');
  v21.status=`Official API returned ${v21.results.length} active listings for ${data.shop||details.shop}. ${v21.apiNote}`;
 }catch(e){v21.status=String(e.message||'Shop listing retrieval unavailable.')+' You can still select products already saved in your private cloud library, or import a compatible CSV. The pasted shop has not been imported.';}
 finally{v21.busy=false;$('v21-lookup').disabled=false;v21Render()}
}
export function v21ManualPreview(){
 const title=$('v21-manual-title').value.trim(),desc=$('v21-manual-description').value.trim(),tags=$('v21-manual-tags').value.trim(),rawUrl=$('v21-manual-link').value.trim();
 if(title.length<3){toast('Enter the listing title to review.',true);return}
 let provider='etsy';if(rawUrl){try{const u=new URL(rawUrl);if(u.protocol!=='https:')throw Error();if(u.hostname.endsWith('ebay.co.uk')||u.hostname.endsWith('ebay.com'))provider='ebay';else if(!['etsy.com','www.etsy.com'].includes(u.hostname))throw Error()}catch{toast('Use a valid HTTPS Etsy or eBay listing link, or leave the link blank.',true);return}}
 const item={title,description:desc||null,tags:tags?tagList(tags):null,url:rawUrl,image:null};
 v21.reviewHtml='<div class="v21-review-heading">Review of details you entered</div>'+v21PublicReview(item,provider)+`<p class="mini">Only text you provided was checked. SellerPilot did not fetch or verify this listing URL.</p>`;v21Render();$('v21-review-output').scrollIntoView({block:'start',behavior:'smooth'});
}
export function v21SelectionReview(){
 const local=state.products.filter(p=>v21.selectedCloud.has(p.id)),remote=[...v21.selectedRemote].map(i=>v21.results[i]).filter(Boolean);
 if(!local.length&&!remote.length){toast('Choose at least one listing to review.',true);return}
 v21.reviewHtml='<div class="v21-review-heading">Your selected listing checks · '+(local.length+remote.length)+'</div>'+local.map(p=>v21CloudReview(p.id)).join('')+remote.map(p=>v21PublicReview(p,v21.provider)).join('');v21Render();$('v21-review-output').scrollIntoView({behavior:'smooth',block:'start'});
}
export function v21Init(){
 document.addEventListener('change',e=>{const t=e.target;if(t.matches('[data-v21-cloud]')){if(t.checked)v21.selectedCloud.add(t.dataset.v21Cloud);else v21.selectedCloud.delete(t.dataset.v21Cloud);$('v21-cloud-count').textContent=`${state.products.filter(p=>!v21.filter||norm(p.title+' '+p.tags+' '+p.sku).includes(norm(v21.filter))).length} of ${state.products.length} private cloud products · ${v21.selectedCloud.size} selected`}
 else if(t.matches('[data-v21-remote]')){const i=Number(t.dataset.v21Remote);if(t.checked)v21.selectedRemote.add(i);else v21.selectedRemote.delete(i)}});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-v21-action]');if(!b)return;const action=b.dataset.v21Action;
  if(action==='home-lookup'){$('v21-shop-url').value=$('v21-home-url').value;chosenView('shop');void v21Lookup()}
  else if(action==='review-one'){v21.selectedCloud.clear();v21.selectedCloud.add(b.dataset.id);v21SelectionReview()}
  else if(action==='review-remote'){v21.selectedRemote.clear();v21.selectedRemote.add(Number(b.dataset.index));v21SelectionReview()}
  else if(action==='open-editor')editProduct(b.dataset.id);
  else if(action==='select-all'){state.products.filter(p=>!v21.filter||norm(p.title+' '+p.tags+' '+p.sku).includes(norm(v21.filter))).forEach(p=>v21.selectedCloud.add(p.id));v21RenderCloud()}
  else if(action==='clear-selection'){v21.selectedCloud.clear();v21.selectedRemote.clear();v21Render()}
  else if(action==='review-selected')v21SelectionReview();
  else if(action==='template')download('sellerpilot-listing-template.csv','title,description,tags,price,sku,currency\n','text/csv;charset=utf-8');
  else if(action==='import-csv')$('csv-input').click();
  else if(action==='manual-preview')v21ManualPreview();
  else if(action==='shop-lookup')void v21Lookup();
 });
 $('v21-saved-filter').addEventListener('input',e=>{v21.filter=e.target.value;v21RenderCloud()});
 $('v21-shop-url').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void v21Lookup()}});
 $('v21-home-url').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('v21-shop-url').value=e.target.value;chosenView('shop');void v21Lookup()}});
}
