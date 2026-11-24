import { renderShortlist } from './keyword-lab.js';

export const $=id=>document.getElementById(id);
export const q=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
export const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export const tagList=x=>String(x??'').split(',').map(v=>v.trim()).filter(Boolean);
export function currencyCode(value){return value==='USD'?'USD':'GBP'}
export function productCurrency(p){return currencyCode(p?.attributes?.sellerpilot?.currency)}
export const cash=(x,currency='GBP')=>(currencyCode(currency)==='USD'?'US$':'£')+Number(x||0).toFixed(2);
export const dateLabel=x=>new Date(x).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
export const state={client:null,uid:null,user:null,products:[],ready:false,busy:false,view:'overview',editing:null,audit:null,preferences:{},shortlist:[],serial:0,resetReady:false};
export const defaults={brand:'',market:'Etsy',region:'United Kingdom',voice:''};
export let toastTimer;
export function toast(message,error=false){const n=$('toast');n.textContent=message;n.className='notification show'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>n.classList.remove('show'),4400)}
export function banner(message,status=''){const x=$('cloud-status');x.textContent=message;x.className='statusbar'+(status?' '+status:'')}
let busyButtons=[];
export function busy(flag){if(flag===state.busy)return;state.busy=flag;if(flag){busyButtons=q('button').filter(b=>!b.matches('[data-view],[data-go]')&&!b.disabled);busyButtons.forEach(b=>{b.disabled=true})}else{for(const b of busyButtons)if(b.isConnected)b.disabled=false;busyButtons=[]}}
export function localKey(suffix){return 'sellerpilot_v18_'+state.uid+'_'+suffix}
export function settingsLoad(){state.preferences={...defaults};state.shortlist=[];if(!state.uid)return;try{state.preferences={...defaults,...JSON.parse(localStorage.getItem(localKey('settings'))||'{}')};state.shortlist=JSON.parse(localStorage.getItem(localKey('keywords'))||'[]');if(!Array.isArray(state.shortlist))state.shortlist=[]}catch(e){toast('Local preferences could not be read.',true)}$('pref-brand').value=state.preferences.brand;$('pref-market').value=state.preferences.market;$('pref-region').value=state.preferences.region;$('pref-voice').value=state.preferences.voice;$('edit-market').value=state.preferences.market;$('ai-market').value=state.preferences.market;renderShortlist()}
