// V54: private sandbox display only; never modifies real AI eligibility.
import { $,state,operatorView } from './core.js';
import { verifiedUser } from './supabase-client.js';
import { chosenView } from './ui.js';
export function validate(d){
 if(d?.ok!==true||d.sandbox!==true||d.production_access!==false||typeof d.eligible!=='boolean')throw Error('Unexpected sandbox access response.');
 if(!d.eligible){if(d.usage!==null||d.plan!==null||d.daily_credits!==0||d.monthly_credits!==0)throw Error('Invalid subscription status.');return d;}
 const limits={starter:[5,30],professional:[15,100]},l=limits[d.plan],u=d.usage;
 if(!Object.hasOwn(limits,d.plan)||!l||d.daily_credits!==l[0]||d.monthly_credits!==l[1]||typeof d.cancel_at_period_end!=='boolean'||!Number.isFinite(Date.parse(d.period_end))||!u)throw Error('Invalid subscription details.');
 for(const k of ['daily_used','monthly_used','daily_remaining','monthly_remaining'])if(!Number.isSafeInteger(u[k])||u[k]<0)throw Error('Invalid usage details.');
 if(u.daily_used>15||u.monthly_used>100||u.daily_used>u.monthly_used||u.daily_remaining!==Math.max(0,l[0]-u.daily_used)||u.monthly_remaining!==Math.max(0,l[1]-u.monthly_used)||!Number.isFinite(Date.parse(u.daily_resets_at))||!Number.isFinite(Date.parse(u.monthly_resets_at)))throw Error('Inconsistent usage details.');
 return d;
}

let generation=0,pending=false,checked=false;
const date=t=>new Date(t).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
const put=(id,s)=>{if($(id))$(id).textContent=s};
function showPanels(visible){for(const id of ['v54-sidebar','v54-ai','v54-image','v54-account','v55-home'])if($(id))$(id).hidden=!visible;}
function buttons(disabled){document.querySelectorAll('[data-v54-refresh]').forEach(b=>b.disabled=disabled)}
function display(message){
 put('v54-plan',message);put('v54-side-usage','');put('v54-status',message);put('v54-details','');
 put('v54-text',message);put('v54-photo',message);put('v55-home-status',message);for(const id of ['v55-home-reset','v55-text-reset','v55-photo-reset'])put(id,'');
}
export function v54Reset(){generation++;pending=false;checked=false;showPanels(false);display('Subscription not checked.');buttons(false)}
export function v54Init(){v54Reset();document.querySelectorAll('[data-v54-refresh]').forEach(b=>b.addEventListener('click',()=>void v54Refresh(true)));document.querySelectorAll('[data-v55-billing]').forEach(b=>b.addEventListener('click',()=>{if(!state.ready||!state.uid)return;chosenView('settings');const el=$('v54-account');if(el&&!el.hidden){el.focus({preventScroll:true});el.scrollIntoView({block:'start',behavior:'instant'})}}));document.querySelectorAll('[data-v55-photo]').forEach(b=>b.addEventListener('click',()=>{if(state.ready&&state.uid)chosenView('image')}))}
export async function v54Refresh(force=false){
 if(!operatorView()||!state.ready||!state.uid||pending||(!force&&checked))return;
 showPanels(true);checked=true;pending=true;buttons(true);display('Checking private test subscription…');
 const uid=state.uid,serial=state.serial,g=++generation,current=()=>state.ready&&state.uid===uid&&state.serial===serial&&generation===g;
 try{
  await verifiedUser();if(!current())return;
  const {data,error}=await state.client.functions.invoke('sellerpilot-stripe-access',{body:{action:'dashboard'}});
  if(!current())return;
  if(error)throw Error('Private sandbox status unavailable.');
  const d=validate(data);
  await verifiedUser();if(!current())return;
  if(!d.eligible){display('No eligible test subscription.');return}
  const u=d.usage,plan=d.plan==='starter'?'Starter':'Professional',available=Math.min(u.daily_remaining,u.monthly_remaining);
  put('v55-home-status',plan+' · '+u.daily_remaining+' / '+d.daily_credits+' daily · '+u.monthly_remaining+' / '+d.monthly_credits+' monthly remaining');
  const resets='Daily reset: '+date(u.daily_resets_at)+' at 00:00 UTC. Monthly reset: '+date(u.monthly_resets_at)+' at 00:00 UTC.';
  put('v55-home-reset',resets);put('v55-text-reset',resets);put('v55-photo-reset',resets);
  put('v54-plan',plan+' · sandbox');put('v54-side-usage',u.daily_remaining+' daily / '+u.monthly_remaining+' monthly remaining');
  put('v54-status',plan+' · verified test subscription');
  put('v54-details',u.daily_remaining+' / '+d.daily_credits+' daily remaining; '+u.monthly_remaining+' / '+d.monthly_credits+' monthly remaining. '+(d.cancel_at_period_end?'Scheduled cancellation: ':'Period ends: ')+date(d.period_end)+'. Daily reset: '+date(u.daily_resets_at)+'; monthly reset: '+date(u.monthly_resets_at)+' at 00:00 UTC.');
  put('v54-text',plan+' · '+u.daily_remaining+' daily / '+u.monthly_remaining+' monthly simulated credits remaining. '+(available>=1?'Text simulation available.':'Simulated allowance exhausted. '+(u.monthly_remaining===0?'Monthly limit reached; daily reset alone will not restore credits.':'Daily limit reached; check again after the daily reset.')));
  put('v54-photo',plan+' · '+u.daily_remaining+' daily / '+u.monthly_remaining+' monthly simulated credits remaining. '+(d.plan==='starter'?'Photo simulation requires Professional.':available>=3?'Photo simulation available.':'Insufficient simulated credits.'));
 }catch{if(current())display('Private sandbox status unavailable. Refresh to retry.')}
 finally{if(current()){pending=false;buttons(false)}}
}
