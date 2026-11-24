/* V25: Etsy-first presentation only. Existing records, providers and logic remain intact. */
const KEY='sellerpilot-v25-legacy';
const SELECTORS='#edit-market,#ai-market,#pref-market,#v19-p-market,#v19-rank-market,#v20-market';
export function v25LegacyEnabled(){try{return localStorage.getItem(KEY)==='1'}catch{return false}}
export function v25Refresh(){
 const legacy=v25LegacyEnabled();
 document.body.classList.toggle('v25-etsy-first',!legacy);
 for(const select of document.querySelectorAll(SELECTORS)){
  for(const option of select.options){
   const other=option.value.toLowerCase()!=='etsy';
   // Retain a selected legacy value so opening/saving old records cannot silently change the marketplace.
   option.hidden=!legacy&&other&&!option.selected;
   option.disabled=!legacy&&other&&!option.selected;
  }
 }
 const toggle=document.getElementById('v25-legacy');if(toggle)toggle.checked=legacy;
 const home=document.querySelector('label[for="v21-home-url"]');if(home)home.textContent=legacy?'Paste an Etsy shop or eBay seller link':'Paste an Etsy shop link';
 const provider=document.getElementById('v25-shop-provider');if(provider)provider.textContent=legacy?'Etsy · eBay':'Etsy';
 const shop=document.getElementById('v21-shop-url');if(shop)shop.setAttribute('aria-label',legacy?'Etsy or eBay seller URL':'Etsy shop URL');
}
export function v25Init(){
 const toggle=document.getElementById('v25-legacy');
 toggle?.addEventListener('change',()=>{try{localStorage.setItem(KEY,toggle.checked?'1':'0')}catch{}v25Refresh()});
 document.addEventListener('change',e=>{if(e.target.matches?.(SELECTORS))v25Refresh()});
 document.addEventListener('click',()=>queueMicrotask(v25Refresh));
 // Watch dynamically rendered workspace screens, not attributes or text mutations.
 const observer=new MutationObserver(records=>{
  if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.(SELECTORS)||n.querySelector?.(SELECTORS)))))v25Refresh();
 });
 observer.observe(document.querySelector('.content-main'),{childList:true,subtree:true});
 v25Refresh();
}
