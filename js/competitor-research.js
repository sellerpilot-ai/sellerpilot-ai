import { $, q, esc, cash, productCurrency, state, toast } from './core.js';
import { v19Store, v19Mutate, v19Input, v19Id, v19CompetitorsLegacy, v19Render } from './workspace.js';

/* SellerPilot AI v20 — Official competitor research and comparisons.
 * Search results only come from authorised APIs. No scraper or fabricated results.
 */
export const v20State={provider:'etsy',query:'',status:'Checking API connections…',checked:false,providers:{etsy:false,ebay:false},results:[],checkedAt:'',source:'',loading:false,problem:''};
export function v20ResearchPanel(){
 const s=v20State;
 const marketSearch=(p,q)=>p==='etsy'?'https://www.etsy.com/uk/search?q='+encodeURIComponent(q):'https://www.ebay.co.uk/sch/i.html?_nkw='+encodeURIComponent(q);
 const q=s.query||'bonus daughter necklace';
 const productOptions=state.products.map(p=>`<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('');
 const ownProduct=state.products.find(p=>p.id===($('v20-own-product')?.value||'')),ownPrice=ownProduct?.price,ownCurrency=ownProduct?productCurrency(ownProduct):'';
 const providerLabel=(p)=>s.providers[p]?'<span class="v20-good">API configured</span>':'<span class="v20-warning">Awaiting approved API access</span>';
 const listings=s.results.map((x,i)=>{
  const currency=x.currency||'', sameCurrency=(currency===ownCurrency&&typeof x.price==='number'&&Number.isFinite(x.price));
  const price=Number.isFinite(Number(x.price))&&x.price!==null?`${esc(currency)} ${Number(x.price).toFixed(2)}`:'Price unavailable';
  const own=Number.isFinite(Number(ownPrice))?Number(ownPrice):null;
  return `<article class="v20-result"><div class="v20-result-top"><span class="pill">${esc(s.provider==='etsy'?'Etsy':'eBay')} · Official API</span><span class="v20-price">${esc(price)}</span></div><h3>${esc(x.title)}</h3><p class="mini">${esc(x.shop||'Seller not provided')} · retrieved ${esc((s.checkedAt||'').slice(0,10))}</p>${own!==null&&sameCurrency?`<p class="v20-diff">Compared with your selected listing: ${esc((Number(x.price)-own>=0?'+':'')+(Number(x.price)-own).toFixed(2))} ${esc(currency)}</p>`:''}<div class="v19-actions"><a class="button ghost sm" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open original listing</a><button class="button secondary sm" data-v20-action="save-result" data-index="${i}">Save observed result to cloud</button></div></article>`;
 }).join('');
 const compareRecords=v19Store.data.competitors.filter(c=>typeof c.price==='number'&&Number.isFinite(c.price));
 let manual='';if(compareRecords.length){const prices=compareRecords.map(x=>x.price),min=Math.min(...prices),max=Math.max(...prices),avg=prices.reduce((a,b)=>a+b,0)/prices.length;manual=`<div class="v20-summary">${[['Price observations',prices.length],['Lowest observed',cash(min)],['Average observed',cash(avg)],['Highest observed',cash(max)]].map(([label,value])=>`<div><strong>${esc(value)}</strong><small>${esc(label)}</small></div>`).join('')}</div><p class="mini">Only from observations saved in your notebook. These are not a live marketplace price distribution.</p>`}
 return `<div class="card v20-api" id="v20-research-panel"><div class="row" style="gap:12px;flex-wrap:wrap"><div><div class="eyebrow">OFFICIAL MARKETPLACE RESEARCH</div><h2>Search & compare competitors</h2></div><span class="pill">v20 · Verified-source workflow</span></div><p class="mini">Search real Etsy or eBay listings through approved APIs. Listings, prices and timestamps are displayed only when a provider returns them. No scraping or invented volumes.</p>
 <div class="field-grid"><div class="field"><label for="v20-market">Marketplace</label><select id="v20-market"><option value="etsy"${s.provider==='etsy'?' selected':''}>Etsy</option><option value="ebay"${s.provider==='ebay'?' selected':''}>eBay UK</option></select></div><div class="field"><label for="v20-query">Research phrase</label><input id="v20-query" maxlength="100" placeholder="bonus daughter necklace" value="${esc(s.query)}"></div></div>
 <div class="v20-provider-state"><div><b>Etsy</b>${providerLabel('etsy')}</div><div><b>eBay</b>${providerLabel('ebay')}</div></div>
 <div class="v19-actions v20-buttons"><button class="button" data-v20-action="run-search" ${s.loading?'disabled':''}>${s.loading?'Searching official API…':'Search listings'}</button><button class="button secondary" data-v20-action="check-provider" ${s.loading?'disabled':''}>Check connections</button><a class="button ghost" id="v20-open-search" href="${marketSearch(s.provider,q)}" target="_blank" rel="noopener noreferrer">Explore on ${s.provider==='etsy'?'Etsy':'eBay'} directly</a></div>
 <p class="mini" id="v20-api-status" role="status">${esc(s.status)}</p>${s.problem?`<div class="note warning">${esc(s.problem)}<p class="mini">SellerPilot cannot retrieve marketplace results until the official provider approves access and server-side credentials are configured. You can still research in the marketplace and save observations manually below.</p></div>`:''}
 ${s.results.length?`<div class="row" style="margin:22px 0 10px"><div><h3>Retrieved listings · ${s.results.length}</h3><p class="mini">Source: ${esc(s.source)}, ${esc(s.checkedAt)}</p></div></div><div class="field"><label for="v20-own-product">Compare against your product's price (same currency only)</label><select id="v20-own-product"><option value="">Choose your product (optional)</option>${productOptions}</select></div><div class="v20-results">${listings}</div>`:'<div class="v20-empty">No external listings fetched in this session. This is not a claim of zero marketplace results.</div>'}
 </div>${manual?`<div class="card" style="margin-top:16px"><h2>Your observed-price comparisons</h2>${manual}</div>`:''}`;
}
export function v19Competitors(){
 if(!v20State.checked&&!v20State.loading)queueMicrotask(()=>{if(!v20State.checked&&!v20State.loading)void v20CheckProvider()});
 return v20ResearchPanel()+`<div class="v20-manual-heading"><h2>Competitor Notebook</h2><p class="mini">Manually verified observations, plus selected results saved from authorised API searches.</p></div>`+v19CompetitorsLegacy();
}
export async function v20CheckProvider(){
 v20State.loading=true;v20State.problem='';v20State.status='Checking official API connection status…';
 try{
  const {data,error}=await state.client.functions.invoke('sellerpilot-competitor-search',{method:'GET'});
  if(error)throw error;
  v20State.checked=true;v20State.providers=data.providers||{etsy:false,ebay:false};
  v20State.status=(v20State.providers.etsy||v20State.providers.ebay)?'At least one approved provider is configured.':'No approved marketplace API credentials configured yet.';
 }catch(e){v20State.checked=true;v20State.status='Unable to check official marketplace API connections.';v20State.problem='Sign-in or backend connection error. '+(e.message||'');}
 finally{v20State.loading=false;if(state.view==='competitors')v19Render('competitors');}
}
export async function v20Search(){
 const q=v19Input('v20-query'),p=v19Input('v20-market');
 if(q.length<3||q.length>100){toast('Enter a search phrase between 3 and 100 characters.',true);return}
 v20State.query=q;v20State.provider=p;v20State.loading=true;v20State.problem='';v20State.results=[];v20State.status='Searching approved marketplace API…';v19Render('competitors');
 try{
  const {data,error}=await state.client.functions.invoke('sellerpilot-competitor-search',{body:{provider:p,query:q}});
  if(error){let detail='';try{if(error.context && typeof error.context.json==='function'){const body=await error.context.json();detail=body.detail||body.error||'';}}catch{}throw Error(detail||error.message||'Search failed')}
  if(!data?.ok||!Array.isArray(data.results))throw Error('Provider returned an invalid search response.');
  v20State.results=data.results.filter(x=>x&&typeof x.title==='string'&&typeof x.url==='string'&&/^https:\/\//.test(x.url)).slice(0,12);
  v20State.checkedAt=data.checked_at||new Date().toISOString();v20State.source=data.source||p;v20State.status=`${v20State.results.length} listings returned by ${v20State.source}. Zero results does not prove zero demand.`;
 }catch(e){v20State.problem=e.message||'Official marketplace search unavailable.';v20State.status='No external results retrieved.';}
 finally{v20State.loading=false;if(state.view==='competitors')v19Render('competitors');}
}
export async function v20SaveResult(index){
 const r=v20State.results[index];if(!r||!/^https:\/\//.test(r.url||''))return;
 if(!confirm('Save this externally retrieved listing as a dated research observation in your private notebook?'))return;
 const gbp=r.currency==='GBP'&&typeof r.price==='number'?r.price:null;
 const record={id:v19Id(),shop:String(r.shop||'Marketplace seller').slice(0,120),listing:String(r.title).slice(0,200),url:r.url,price:gbp,date:new Date().toISOString().slice(0,10),notes:`Official ${v20State.source} result. Retrieved ${v20State.checkedAt}. ${gbp===null&&r.price!==null?'Observed '+r.currency+' '+r.price+' (not GBP; no currency conversion). ':''}Prices and availability can change. Confirm on original listing.`};
 await v19Mutate(d=>{if(d.competitors.some(x=>x.url===record.url))throw Error('This listing is already in your notebook.');d.competitors.unshift(record);d.competitors=d.competitors.slice(0,250)},'Verified-source competitor observation saved to cloud');
}
export function v20Init(){
document.addEventListener('click',e=>{
 const el=e.target.closest('[data-v20-action]');if(!el)return;
 const action=el.dataset.v20Action;
 if(!v19Store.loaded){toast('Sign in and load your cloud workspace first.',true);return}
 if(action==='run-search')void v20Search();
 else if(action==='check-provider')void v20CheckProvider();
 else if(action==='save-result')void v20SaveResult(Number(el.dataset.index));
});
document.addEventListener('change',e=>{
 if(!e.target||e.target.id!=='v20-own-product')return;
 const list=v20State.results,own=state.products.find(p=>p.id===e.target.value),currency=own?productCurrency(own):'';
 const nodes=document.querySelectorAll('#v20-research-panel .v20-result');
 nodes.forEach((node,i)=>{const item=list[i],old=node.querySelector('.v20-diff');if(old)old.remove();if(!own||item.currency!==currency||typeof item.price!=='number')return;const diff=item.price-Number(own.price);const p=document.createElement('p');p.className='v20-diff';p.textContent='Compared with your listing: '+(diff>=0?'+':'')+diff.toFixed(2)+' '+currency;node.querySelector('.v19-actions').before(p)});
});
document.addEventListener('input',e=>{
 if(e.target?.id!=='v20-query'&&e.target?.id!=='v20-market')return;
 const v=document.getElementById('v20-query')?.value?.trim()||'bonus daughter necklace',p=document.getElementById('v20-market')?.value||'etsy';
 const href=p==='etsy'?'https://www.etsy.com/uk/search?q='+encodeURIComponent(v):'https://www.ebay.co.uk/sch/i.html?_nkw='+encodeURIComponent(v);
 const anchor=document.getElementById('v20-open-search');if(anchor){anchor.href=href;anchor.textContent='Explore on '+(p==='etsy'?'Etsy':'eBay')+' directly'}
});
}
