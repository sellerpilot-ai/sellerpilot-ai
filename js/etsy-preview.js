import {$,state} from './core.js';
import {verifiedUser} from './supabase-client.js';
let request=0,available=false,busy=false;
const key='sellerpilot-etsy-return';
function pending(){try{const v=JSON.parse(sessionStorage.getItem(key)||'null');if(v&&Number.isFinite(v.at)&&Date.now()-v.at>=0&&Date.now()-v.at<600000)return v;sessionStorage.removeItem(key)}catch{}return null}
function output(s){const el=$('v31-status');if(el)el.textContent=s}
function controls(){if(!$('v31-check'))return;$('v31-check').disabled=busy;$('v31-start').disabled=busy||!available||!$('v31-consent').checked;$('v31-finish').disabled=busy||!pending();$('v31-consent').disabled=busy||!available}
function clearResults(){if($('v31-results'))$('v31-results').replaceChildren()}
async function invoke(body){await verifiedUser();const {data,error}=await state.client.functions.invoke('sellerpilot-etsy-preview',{body});if(error||data?.ok!==true)throw Error('Authorised preview unavailable. API approval and backend activation must be confirmed. CSV import remains available.');return data}
export function etsyCallbackFor(href){
 try{
  const u=new URL(href);
  if(u.username||u.password)return null;
  for(const base of ['https://sellerpilot-ai.github.io/sellerpilot-ai/','https://sellerpilot-ai-21c.pages.dev/','https://yuvilist.com/']){
   const b=new URL(base);
   if(u.origin===b.origin&&[b.pathname,b.pathname+'index.html',b.pathname+'app.html',b.pathname+'app'].includes(u.pathname))return base+'etsy-return.html';
  }
 }catch{}
 return null;
}
export function validateEtsyAuthorization(address,href){
 const callback=etsyCallbackFor(href);
 if(!callback)throw Error('Unexpected authorisation address.');
 const u=new URL(address);
 const required={response_type:'code',scope:'listings_r',redirect_uri:callback,code_challenge_method:'S256'};
 if(u.origin!=='https://www.etsy.com'||u.pathname!=='/oauth/connect'||u.username||u.password||u.hash||Object.entries(required).some(([k,v])=>u.searchParams.getAll(k).length!==1||u.searchParams.get(k)!==v))throw Error('Unexpected authorisation address.');
 for(const [k,pattern] of [['state',/^[a-f0-9]{64}$/],['code_challenge',/^[A-Za-z0-9_-]{43}$/],['client_id',/^[A-Za-z0-9_-]{1,200}$/]])if(u.searchParams.getAll(k).length!==1||!pattern.test(u.searchParams.get(k)))throw Error('Unexpected authorisation address.');
 return u;
}
export function validatePreview(d){
 if(typeof d.shop_name!=='string'||!d.shop_name.trim()||d.shop_name.length>120||!Array.isArray(d.listings)||d.listings.length>50||!Number.isFinite(Date.parse(d.retrieved_at))||!(d.total===null||Number.isSafeInteger(d.total)&&d.total>=d.listings.length))throw Error('Invalid preview response. Nothing was saved.');
 const ids=new Set();for(const x of d.listings){if(!/^[1-9]\d{0,18}$/.test(x?.listing_id||'')||ids.has(x.listing_id)||typeof x.title!=='string'||!x.title.trim()||x.title.length>250||x.state!=='active')throw Error('Invalid listing preview. Nothing was saved.');ids.add(x.listing_id)}return d;
}
// Manual selection is display-only. No import, analysis, persistence or provider calls.
export function renderEtsySelection(root,preview){
 const d=validatePreview(preview);
 root.replaceChildren();
 if(!d.listings.length){const empty=document.createElement('p');empty.className='mini';empty.textContent='No active listings returned.';root.append(empty);return}
 const tools=document.createElement('div');tools.className='form-actions etsy-preview-actions';
 const all=document.createElement('button');all.type='button';all.className='button secondary';all.textContent='Select all shown';
 const clear=document.createElement('button');clear.type='button';clear.className='button ghost';clear.textContent='Clear selection';
 const status=document.createElement('p');status.className='mini';status.setAttribute('role','status');
 const checks=[];
 const update=()=>{const n=checks.filter(c=>c.checked).length;status.textContent=n+' of '+checks.length+' selected · Preview only; not saved or analysed.';all.disabled=n===checks.length;clear.disabled=n===0};
 tools.append(all,clear);root.append(tools,status);
 for(const x of d.listings){
  const row=document.createElement('label');row.className='list-card etsy-preview-row';
  const c=document.createElement('input');c.type='checkbox';c.setAttribute('aria-label','Select '+x.title);c.addEventListener('change',update);checks.push(c);
  const detail=document.createElement('span');detail.className='detail';
  const title=document.createElement('b');title.textContent=x.title;
  const meta=document.createElement('span');meta.textContent='Listing '+x.listing_id+' · Active';
  detail.append(title,meta);row.append(c,detail);root.append(row);
 }
 all.onclick=()=>{checks.forEach(c=>c.checked=true);update()};
 clear.onclick=()=>{checks.forEach(c=>c.checked=false);update()};
 update();
}
export function v31Reset(){request++;available=false;busy=false;clearResults();if($('v31-consent'))$('v31-consent').checked=false;output('Not verified. Check availability.');controls()}
export function v31Init(){
 const panel=document.createElement('div');panel.className='card';panel.style.marginBottom='18px';panel.innerHTML='<div class="eyebrow">Marketplace connection</div><h2>Connect your Etsy shop</h2><p class="mini">Read-only authorisation preview of up to 50 latest active listings. Etsy approval and backend activation are required. No automatic publishing, import, recurring sync, AI processing or retained Etsy tokens.</p><div class="note"><b>Connection readiness</b><p class="mini">1. Approved developer access · 2. Secure backend activation · 3. Seller consent on Etsy. A successful connection does not grant analytics or AI data permission.</p><a href="https://www.etsy.com/developers/your-apps" target="_blank" rel="noopener noreferrer">Etsy developer dashboard</a> · <a href="https://www.etsy.com/legal/api/" target="_blank" rel="noopener noreferrer">API terms</a></div><label class="checkbox-line"><input id="v31-consent" type="checkbox" disabled> I agree to request read-only access to my Etsy listings.</label><div class="form-actions"><button class="button secondary" id="v31-check" type="button">Check availability</button><button class="button" id="v31-start" type="button" disabled>Authorise on Etsy</button><button class="button ghost" id="v31-finish" type="button" disabled>Finish returned authorisation</button><button type="button" class="button ghost" data-go="products">Use my own listings / CSV</button></div><p class="mini" id="v31-status" role="status">Not verified. Check availability.</p><div class="stack" id="v31-results"></div>';
 panel.id='v109-etsy-connection';$('view-shop').appendChild(panel);
 const run=async fn=>{if(!state.ready||busy)return;const n=++request,uid=state.uid;const current=()=>n===request&&uid===state.uid&&state.ready;busy=true;controls();try{await fn(current)}catch(e){if(current()){available=false;clearResults();output(e.message)}}finally{if(current()){busy=false;controls()}}};
 $('v31-consent').onchange=controls;
 $('v31-check').onclick=()=>run(async current=>{available=false;clearResults();$('v31-consent').checked=false;output('Checking secure preview availability…');const d=await invoke({action:'status'});if(!current())return;if(typeof d.enabled!=='boolean')throw Error('Invalid availability response.');available=d.enabled===true;output(available?'Read-only preview available. Confirm consent to continue.':'Not enabled. Etsy approval and backend activation required. Use CSV import instead.')});
 $('v31-start').onclick=()=>run(async current=>{if(!available){output('Check availability first.');return}if(!$('v31-consent').checked){output('Confirm read-only access first.');return}output('Preparing secure Etsy authorisation…');const d=await invoke({action:'begin',consent:true});if(!current())return;const u=validateEtsyAuthorization(d.authorization_url,location.href);sessionStorage.removeItem(key);location.assign(u.href)});
 $('v31-finish').onclick=()=>run(async current=>{const p=pending();if(!p){output('No recent Etsy authorisation.');return}sessionStorage.removeItem(key);clearResults();if(p.cancelled){output('Authorisation was cancelled.');return}output('Verifying your shop and active listings…');const d=validatePreview(await invoke({action:'finish',state:p.state,code:p.code}));if(!current())return;output('Verified shop: '+d.shop_name+' · '+d.listings.length+(d.total===null?'':' of '+d.total)+' active listings shown · Retrieved '+new Date(d.retrieved_at).toLocaleString('en-GB',{timeZone:'UTC'})+' UTC. Preview only; nothing saved.');renderEtsySelection($('v31-results'),d)});
 controls();
}
