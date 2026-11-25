import { esc, state, toast, localKey } from './core.js';
import { productQuality } from './audit.js';
import { chosenView } from './ui.js';
import { keywordAnalyse } from './keyword-lab.js';
import { v21, v21Lookup, v21SelectionReview } from './shop-import.js';

/* SellerPilot v22 — task-first dashboard and consolidated settings navigation */
export let v22DisplayUser=null;
export function v22StoreDisplay(){
 try{const settings={density:document.getElementById('v22-density').value,textsize:document.getElementById('v22-textsize').value};localStorage.setItem(localKey('v22-display'),JSON.stringify(settings));v22ApplyDisplay(settings);}catch{toast('Appearance preference could not be saved on this device.',true)}
}
export function v22ApplyDisplay(value){
 const density=value&&value.density==='compact'?'compact':'comfortable',textsize=value&&value.textsize==='large'?'large':'standard';
 document.body.classList.toggle('v22-compact',density==='compact');document.body.classList.toggle('v22-large',textsize==='large');
 const d=document.getElementById('v22-density'),t=document.getElementById('v22-textsize');if(d)d.value=density;if(t)t.value=textsize;
}
export function v22ReadDisplay(){let o={};try{o=JSON.parse(localStorage.getItem(localKey('v22-display'))||'{}')}catch{}v22ApplyDisplay(o)}
export function v22Mode(mode){if(!['saved','shop','keyword'].includes(mode))return;document.querySelectorAll('[data-v22-mode]').forEach(b=>{const active=b.dataset.v22Mode===mode;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1});document.querySelectorAll('[data-v22-pane]').forEach(p=>p.classList.toggle('hidden',p.dataset.v22Pane!==mode));}
export function v22RenderHome(){
 if(state.uid!==v22DisplayUser){v22DisplayUser=state.uid;v22ReadDisplay()}
 const select=document.getElementById('v22-quick-product');if(!select)return;
 const old=select.value;select.replaceChildren();
 if(!state.ready){const o=new Option('Sign in to see your products','');select.add(o);select.disabled=true;document.getElementById('v22-saved-status').textContent='Sign in to view your private products.';document.getElementById('v22-next-text').textContent='Your saved products appear here after sign in.';return}
 select.disabled=!state.products.length;
 const list=[...state.products].sort((a,b)=>productQuality(a).score-productQuality(b).score);
 if(!list.length){select.add(new Option('No saved listings yet',''));document.getElementById('v22-saved-status').textContent='Create a listing or import a CSV to start.';document.getElementById('v22-next-text').textContent='Create your first cloud product to see a recommendation.';return}
 for(const p of list){const o=new Option(p.title,p.id);select.add(o)}
 select.value=list.some(x=>x.id===old)?old:list[0].id;
 document.getElementById('v22-saved-status').textContent=list.length+' private listing'+(list.length===1?'':'s')+' ready to review · Rule-based checks, not marketplace ranking.';
 const most=list[0],a=productQuality(most);
 document.getElementById('v22-next-text').innerHTML='<strong>'+esc(most.title)+'</strong><span class="mini">'+a.score+'/100 · '+esc(a.issues[0]?.heading||'No basic issues flagged')+'</span>';
}
export function v22GoToShopListings(){chosenView('shop');const el=document.getElementById('v21-cloud-list');if(el)el.scrollIntoView({block:'center',behavior:'smooth'})}
export function v22ReviewId(id){const p=state.products.find(x=>x.id===id);if(!p){toast('Choose a saved listing first.',true);return}chosenView('shop');v21.selectedCloud.clear();v21.selectedCloud.add(id);v21SelectionReview()}
export function v22HandleAction(action){
 if(action==='all-tools'){const d=document.getElementById('v22-dashboard-details');d.open=true;if(document.body.classList.contains('v25-etsy-first')){chosenView('settings');document.querySelector('#view-settings .v19-links')?.scrollIntoView({block:'start',behavior:'instant'});return}const el=d.querySelector('.v19-links')||d.querySelector('.v22-dashboard-inside');el.scrollIntoView({block:'center',behavior:'smooth'});return}
 if(action==='audit-one'){v22ReviewId(document.getElementById('v22-quick-product').value);return}
 if(action==='review-priority'){const sorted=[...state.products].sort((a,b)=>productQuality(a).score-productQuality(b).score);if(sorted[0])v22ReviewId(sorted[0].id);else chosenView('products');return}
 if(action==='audit-all'){v22GoToShopListings();return}
 if(action==='shop-lookup'){const url=document.getElementById('v21-home-url').value.trim();chosenView('shop');if(url){document.getElementById('v21-shop-url').value=url;void v21Lookup()}return}
 if(action==='keyword'){const phrase=document.getElementById('v22-home-keyword').value.trim();if(!phrase){toast('Enter a keyword or phrase.',true);document.getElementById('v22-home-keyword').focus();return}chosenView('keywords');document.getElementById('keyword-search').value=phrase;keywordAnalyse();return}
 if(action==='research'){chosenView('research');return}
 if(action==='open-keywords'){chosenView('keywords');document.getElementById('keyword-search').focus();return}
 if(action==='improve'){chosenView('products');return}
 if(action==='profit'){chosenView('profits');return}
 if(action==='settings-seo'){chosenView('advanced');return}
 if(action==='settings-brand'||action==='settings-appearance'||action==='settings-connection'){
   const id=action==='settings-brand'?'pref-brand':action==='settings-appearance'?'v22-appearance':'v22-integrations-anchor';const el=document.getElementById(id);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});if(id==='pref-brand')el.focus()}return
 }
}
export function v22Init(){
 document.addEventListener('click',e=>{const jump=e.target.closest('[data-v108-scroll]');if(jump){if(state.ready&&state.view==='intelligence'&&['edit-existing','edit-tags','analyse-product'].includes(jump.dataset.v108Scroll)){const el=document.getElementById(jump.dataset.v108Scroll);el?.scrollIntoView({block:'center',behavior:'instant'});el?.focus({preventScroll:true})}return}const mode=e.target.closest('[data-v22-mode]');if(mode){v22Mode(mode.dataset.v22Mode);return}const b=e.target.closest('[data-v22-action]');if(b){e.preventDefault();v22HandleAction(b.dataset.v22Action)}});
 for(const id of ['v22-density','v22-textsize'])document.getElementById(id)?.addEventListener('change',v22StoreDisplay);
 document.getElementById('v22-home-keyword')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();v22HandleAction('keyword')}});
 v22Mode('saved');v22ReadDisplay();
}
export function v22PostInit(){const panel=document.querySelector('#view-overview > .v19-links');const target=document.querySelector('.v22-dashboard-inside');if(panel&&target)target.appendChild(panel)}


