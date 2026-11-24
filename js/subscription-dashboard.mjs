const $=id=>document.getElementById(id);
const project='https://aczqdgjyeztaexsxmdww.supabase.co',pk='sb_publishable_wH2kvU7SEKsC6-z6X0DLYw_-X2NZ93q';
let client,pending=false;
const date=t=>new Date(t).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'long',year:'numeric'});
const clear=()=>{for(const id of ['details','options','manage','test-link'])$(id).hidden=true;for(const id of ['plan','period','daily','monthly','daily-used','monthly-used','daily-reset','monthly-reset','text-feature','photo-feature','options-text'])$(id).textContent='';};
export function validate(d){
 if(d?.ok!==true||d.sandbox!==true||d.production_access!==false||typeof d.eligible!=='boolean')throw Error('Unexpected sandbox access response.');
 if(!d.eligible){if(d.usage!==null||d.plan!==null||d.daily_credits!==0||d.monthly_credits!==0)throw Error('Invalid subscription status.');return d;}
 const limits={starter:[5,30],professional:[15,100]},l=limits[d.plan],u=d.usage;
 if(!Object.hasOwn(limits,d.plan)||!l||d.daily_credits!==l[0]||d.monthly_credits!==l[1]||typeof d.cancel_at_period_end!=='boolean'||!Number.isFinite(Date.parse(d.period_end))||!u)throw Error('Invalid subscription details.');
 for(const k of ['daily_used','monthly_used','daily_remaining','monthly_remaining'])if(!Number.isSafeInteger(u[k])||u[k]<0)throw Error('Invalid usage details.');
 if(u.daily_used>15||u.monthly_used>100||u.daily_used>u.monthly_used||u.daily_remaining!==Math.max(0,l[0]-u.daily_used)||u.monthly_remaining!==Math.max(0,l[1]-u.monthly_used)||!Number.isFinite(Date.parse(u.daily_resets_at))||!Number.isFinite(Date.parse(u.monthly_resets_at)))throw Error('Inconsistent usage details.');
 return d;
}
function render(d){
 $('options').hidden=false;
 if(!d.eligible){$('options-text').textContent='No eligible paid sandbox subscription was verified. No paid features are available.';$('status').textContent='No eligible test subscription.';return;}
 const u=d.usage;
 $('plan').textContent=(d.plan==='starter'?'Starter — £9.99':'Professional — £19.99')+'/month · test subscription';
 $('period').textContent=(d.cancel_at_period_end?'Scheduled cancellation: ':'Current period ends: ')+date(d.period_end);
 for(const [k,max] of [['daily',d.daily_credits],['monthly',d.monthly_credits]]){
  $(k).textContent=u[k+'_remaining']+' remaining';$(k+'-used').textContent=u[k+'_used']+' used / '+max+' allowance';$(k+'-bar').max=max;$(k+'-bar').value=Math.min(max,u[k+'_used']);$(k+'-reset').textContent='Resets '+date(u[k+'_resets_at'])+' at 00:00 UTC';
 }
 const available=Math.min(u.daily_remaining,u.monthly_remaining);
 $('text-feature').textContent='Text (1 simulated credit): '+(available>=1?'Available for testing':'Credit allowance exhausted');
 $('photo-feature').textContent='Photo (3 simulated credits): '+(d.plan==='starter'?'Professional only':available>=3?'Available for testing':'Insufficient simulated credits');
 $('options-text').textContent='Use the existing private test billing portal to manage cancellation or view test invoices. Compare plans without starting another checkout.';
 $('details').hidden=false;$('manage').hidden=false;$('test-link').hidden=false;$('status').textContent='Verified sandbox subscription and usage.';
}
async function refresh(){
 if(pending)return;pending=true;$('refresh').disabled=true;clear();$('status').textContent='Checking your private test account…';
 try{
  if(!client){const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.119.2');client=createClient(project,pk,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,flowType:'implicit'}});}
  const {data:session,error:authError}=await client.auth.getUser();if(authError||!session?.user?.id)throw Error('Sign in on the SellerPilot workspace in this same browser, then return here.');
  const {data,error}=await client.functions.invoke('sellerpilot-stripe-access',{body:{action:'dashboard'}});
  if(error){let detail='';try{detail=(await error.context?.json())?.detail||''}catch{}throw Error(detail||'Subscription dashboard unavailable.');}
  const checked=validate(data);
  const {data:after,error:afterError}=await client.auth.getUser();if(afterError||after?.user?.id!==session.user.id)throw Error('Account changed; refresh again.');
  render(checked);
 }catch(e){clear();$('status').textContent=e.message||'Unable to verify subscription.';}finally{pending=false;$('refresh').disabled=false;}
}
if(typeof document!=='undefined'){$('refresh').onclick=refresh;refresh();}