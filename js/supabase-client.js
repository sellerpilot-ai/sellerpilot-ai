import { v54Refresh,v54Reset } from './subscription-workspace.js';
import { v44Reset } from './stripe-portal.js?v=50';
import { v41Reset } from './stripe-checkout.js?v=49';
import { v40Reset } from './stripe-test.js';
import { v37Reset } from './privacy-controls.js';
import { v32Reset } from './beta-feedback.js';
import { v31Reset } from './etsy-preview.js';
import { $, state, toast, banner, busy, settingsLoad } from './core.js';
import { chosenView, clearWorkspace, renderAll, bindEvents } from './ui.js';
import { v19Load } from './workspace.js';
import { v23 } from './guided-fixes.js';

export const PROJECT_URL='https://aczqdgjyeztaexsxmdww.supabase.co';
export const PUBLISHABLE_KEY='sb_publishable_wH2kvU7SEKsC6-z6X0DLYw_-X2NZ93q';
export const REDIRECT_URL='https://sellerpilot-ai.github.io/sellerpilot-ai/';
export const CLOUDFLARE_REDIRECT_URL='https://sellerpilot-ai-21c.pages.dev/';
export const YUVILIST_REDIRECT_URL='https://yuvilist.com/';
export function recoveryRedirectFor(href){
 try{
  const u=new URL(href);
  if(u.username||u.password)return null;
  for(const allowed of [REDIRECT_URL,CLOUDFLARE_REDIRECT_URL,YUVILIST_REDIRECT_URL]){
   if(!allowed.startsWith('https://'))continue;
   const base=new URL(allowed);
   if(u.origin===base.origin&&[base.pathname,base.pathname+'index.html',base.pathname+'app.html',base.pathname+'app'].includes(u.pathname))return allowed;
  }
 }catch{}
 return null;
}
export function accountIdentity(user,recovery=false){const uid=user?.id||null;recovery=!!uid&&recovery;if(uid===state.uid&&!recovery){if(!uid)chosenView('auth');return}state.serial++;state.uid=uid;state.user=user||null;state.resetReady=false;$('reset-container').classList.add('hidden');$('reset-password').value='';v31Reset();v32Reset();v37Reset();v40Reset();v41Reset();v44Reset();clearWorkspace();if(uid){$('account-chip').textContent=user.email||'Connected';$('side-session').textContent='Signed in · private cloud';$('settings-email').textContent=user.email||'Authenticated';settingsLoad();if(recovery){state.resetReady=true;$('reset-container').classList.remove('hidden');$('auth-message').textContent='Recovery link verified. Set a new password before opening your workspace.';banner('Password recovery: set a new password.');chosenView('auth');$('reset-password').focus()}else void refreshCloud()}else{banner('Sign in to access your private product library.');$('auth-message').textContent='Private beta: invited testers only. Public registration is paused.'}}
export async function verifiedUser(){const uid=state.uid,serial=state.serial;if(!state.client||!uid)throw Error('Sign in first.');const{data,error}=await state.client.auth.getUser();if(error||data?.user?.id!==uid||state.uid!==uid||state.serial!==serial)throw Error('Session has expired or changed. Please sign in again.');return data.user}
// Read at most 2,001 rows, including a one-row overflow probe. Never return partial or mixed-owner data.
export async function loadCataloguePages(readPage,uid,isCurrent=()=>true){
 const limit=2000,pageSize=250,rows=[],ids=new Set();
 for(let offset=0;offset<=limit;offset+=pageSize){
  if(!isCurrent())return null;
  const size=Math.min(pageSize,limit+1-offset);
  const {data,error}=await readPage(offset,offset+size-1);
  if(!isCurrent())return null;
  if(error)throw error;
  if(!Array.isArray(data)||data.length>size)throw Error('Invalid catalogue response. Refresh to retry.');
  for(const row of data){
   if(!row||row.user_id!==uid||!row.id)throw Error('Account data isolation check failed.');
   if(ids.has(row.id))throw Error('Catalogue changed while loading. Refresh to retry.');
   ids.add(row.id);rows.push(row);
  }
  if(rows.length>limit)throw Error('The 2,000-product beta limit has been reached.');
  if(data.length<size)return rows;
 }
 return rows;
}
export async function refreshCloud(){if(!state.uid||state.resetReady)return;const uid=state.uid,serial=state.serial;v54Reset();state.ready=false;banner('Loading your private cloud library…');try{await verifiedUser();const rows=await loadCataloguePages((start,end)=>state.client.from('products').select('id,user_id,title,description,tags,price,sku,attributes,created_at,updated_at').order('created_at',{ascending:false}).order('id',{ascending:false}).range(start,end),uid,()=>state.uid===uid&&state.serial===serial);if(!rows||state.uid!==uid||state.serial!==serial)return;state.products=rows;state.ready=true;await v19Load(uid,serial);if(state.uid!==uid||state.serial!==serial)return;renderAll();banner(`Cloud synced · ${rows.length} private products · Seller Workspace v106`,'ok');if(location.hash==='#v44-open'&&state.view==='auth'){chosenView('settings');requestAnimationFrame(()=>$('v44-check')?.scrollIntoView({block:'center'}))}else if(state.view==='auth')chosenView('overview');else chosenView(state.view);void v54Refresh();toast('Cloud catalogue ready');}catch(e){if(state.uid!==uid||state.serial!==serial)return;state.products=[];state.ready=false;renderAll();chosenView('auth');banner('Cloud unavailable: '+(e.message||'Unknown error'),'error');$('auth-message').textContent='Cloud loading failed. Try again after checking your connection.';}}
export async function guarded(task){if(state.busy)return;const uid=state.uid,serial=state.serial;busy(true);try{await verifiedUser();if(state.uid!==uid||state.serial!==serial)throw Error('Account changed; reopen the workspace.');await task();}catch(e){if(state.uid===uid&&state.serial===serial){banner('Operation failed: '+(e.message||'Unknown error'),'error');toast(e.message||'Action failed',true)}}finally{busy(false)}}
export async function logout(){if(state.busy||!state.client)return;if(!confirm('Sign out of YuviList on this device?'))return;busy(true);try{const{error}=await state.client.auth.signOut({scope:'local'});if(error)throw error;accountIdentity(null);$('auth-email').value='';$('auth-password').value='';toast('Signed out. Private products hidden.');}catch(e){const message='Sign-out could not be confirmed. Retry when connected. On a shared device, close this tab and clear only YuviList site data before leaving.';banner(message,'error');toast(message,true)}finally{busy(false)}}
export async function authAction(action){if(state.resetReady){toast('Finish password recovery first.',true);return}if(action==='signup'){$('auth-message').textContent='Public registration is paused during private beta.';return}if(!['signin','forgot'].includes(action))return;if(!state.client){toast('Authentication is connecting. Refresh in a moment.',true);return}const email=$('auth-email').value.trim(),password=$('auth-password').value;if(!email.includes('@')||!email.includes('.')){toast('Enter a valid email.',true);return}if(action!=='forgot'&&password.length<8){toast('Password must be at least 8 characters.',true);return}busy(true);try{let r;if(action==='signin')r=await state.client.auth.signInWithPassword({email,password});else{const redirectTo=recoveryRedirectFor(location.href);if(!redirectTo)throw Error('Password recovery is available only on the approved YuviList website.');r=await state.client.auth.resetPasswordForEmail(email,{redirectTo});}if(r.error)throw r.error;$('auth-password').value='';const msg=action==='signup'?'Check your email for a confirmation link (if registration is available).':action==='forgot'?'Check your inbox for a password-reset link.':'Signed in. Loading your private catalogue.';$('auth-message').textContent=msg;toast(msg);if(action==='signin'&&r.data?.user)accountIdentity(r.data.user)}catch(e){$('auth-message').textContent=e.message;toast(e.message,true)}finally{busy(false)}}
export async function init(){bindEvents();clearWorkspace();try{const{createClient}=await import('https://esm.sh/@supabase/supabase-js@2.119.2');state.client=createClient(PROJECT_URL,PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});state.client.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){queueMicrotask(()=>accountIdentity(session?.user||null,true));return}if(event==='SIGNED_OUT'){accountIdentity(null);return}if(event==='SIGNED_IN'||event==='INITIAL_SESSION')queueMicrotask(()=>{accountIdentity(session?.user||null)})});const{data,error}=await state.client.auth.getSession();if(error)throw error;accountIdentity(data?.session?.user||null);if(!data?.session)banner('Ready for secure sign in. Your previous local drafts have not been imported.');}catch(e){banner('Could not connect to Supabase authentication: '+(e.message||'Unknown error'),'error');$('auth-message').textContent='Connection unavailable. Please refresh and try again.'}}
