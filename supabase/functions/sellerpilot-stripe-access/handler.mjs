// V43 isolated sandbox access simulation. Never calls AI or grants production access.
const origin='https://sellerpilot-ai.github.io';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sid=/^sub_[A-Za-z0-9]{8,160}$/,cid=/^cus_[A-Za-z0-9]{8,160}$/,pid=/^price_[A-Za-z0-9]{8,160}$/;
const limits={starter:{monthly:30,daily:5,amount:999},professional:{monthly:100,daily:15,amount:1999}};
const terminal=new Set(['canceled','incomplete_expired']);
function runtimeKey(env,name,legacy){try{const k=JSON.parse(env(name)||'{}').default;if(typeof k==='string'&&k)return k}catch{}return env(legacy)}
async function read(req){const reader=req.body?.getReader();if(!reader)throw Error('missing body');let total=0,s='';const d=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>1024){await reader.cancel();throw Error('too large')}s+=d.decode(value,{stream:true})}return JSON.parse(s+d.decode())}finally{reader.releaseLock()}}
export function eligible(sub,user,prices,now){
 const plan=sub?.metadata?.sellerpilot_plan;if(!Object.hasOwn(limits,plan||''))return null;
 const l=limits[plan],items=sub.items?.data,item=Array.isArray(items)&&items.length===1&&sub.items.has_more===false?items[0]:null,p=item?.price,period=item?.current_period_end??sub.current_period_end,invoice=sub.latest_invoice;
 if(sub.object!=='subscription'||sub.livemode!==false||sub.status!=='active'||sub.metadata.sellerpilot_user_id!==user||sub.metadata.sellerpilot_mode!=='sandbox'||!sid.test(sub.id||'')||!cid.test(sub.customer||'')||sub.pause_collection||!item||item.quantity!==1||p?.id!==prices[plan]||p.livemode!==false||p.currency!=='gbp'||p.unit_amount!==l.amount||p.recurring?.interval!=='month'||p.recurring?.interval_count!==1||!Number.isSafeInteger(period)||period*1000<=now||period>=4102444800||invoice?.object!=='invoice'||invoice.livemode!==false||invoice.customer!==sub.customer||invoice.status!=='paid'||invoice.currency!=='gbp'||invoice.amount_paid!==l.amount)return null;
 return {plan,subscription_id:sub.id,period_end:new Date(period*1000).toISOString(),cancel_at_period_end:sub.cancel_at_period_end===true||(Number.isSafeInteger(period)&&period>0&&period<4102444800&&Number.isSafeInteger(sub.cancel_at)&&sub.cancel_at===period),monthly_credits:l.monthly,daily_credits:l.daily};
}
export function createHandler(env,fetcher,clock=Date.now){return async req=>{
 const from=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(from===origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers}),fail=(status,detail)=>reply(status,{ok:false,detail,production_access:false});
 if(from&&from!==origin)return fail(403,'Origin not permitted.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return fail(405,'POST required.');
 const auth=req.headers.get('authorization')||'',base=env('SUPABASE_URL'),pk=runtimeKey(env,'SUPABASE_PUBLISHABLE_KEYS','SUPABASE_ANON_KEY');
 if(!auth.startsWith('Bearer '))return fail(401,'Sign in first.');
 if(!base||!pk)return fail(503,'Account service unavailable.');
 try{
 const ur=await fetcher(base+'/auth/v1/user',{headers:{apikey:pk,Authorization:auth},redirect:'error',signal:AbortSignal.timeout(8000)});
 if(!ur.ok)return fail(401,'Verified account required.');
 const user=await ur.json();
 if(!uuid.test(user?.id||'')||!user.email_confirmed_at||user.is_anonymous===true||!env('SELLERPILOT_AI_BETA_USER_IDS').split(',').map(x=>x.trim()).includes(user.id))return fail(403,'Private test account required.');
 let input;try{input=await read(req)}catch{return fail(400,'Invalid request.')}
 if(!input||typeof input!=='object'||Array.isArray(input))return fail(400,'Invalid request.');
 const fields=Object.keys(input).sort().join(',');
 if(!((input.action==='status'&&fields==='action')||(input.action==='simulate'&&fields==='action,feature,request_id'&&['text','photo'].includes(input.feature)&&uuid.test(input.request_id||''))))return fail(400,'Unsupported sandbox action.');
 if(env('SELLERPILOT_STRIPE_ACCESS_ENABLED')!=='true')return fail(503,'Sandbox access simulation disabled.');
 const key=env('SELLERPILOT_STRIPE_TEST_KEY'),service=runtimeKey(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),prices={starter:env('SELLERPILOT_STRIPE_STARTER_PRICE'),professional:env('SELLERPILOT_STRIPE_PRO_PRICE')};
 if(!/^sk_test_[A-Za-z0-9_]{12,}$/.test(key)||!service||!pid.test(prices.starter)||!pid.test(prices.professional)||prices.starter===prices.professional)return fail(503,'Sandbox configuration incomplete.');
 const admin={apikey:service,...(service.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+service}),'Content-Type':'application/json'};
 const rpc=async(name,args)=>{const res=await fetcher(base+'/rest/v1/rpc/'+name,{method:'POST',headers:admin,body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('database');return res.json()};
 const ids=await rpc('sellerpilot_v43_subscription_ids',{p_user_id:user.id});
 if(!Array.isArray(ids)||ids.length>5||ids.some(x=>typeof x!=='string'||!sid.test(x))||new Set(ids).size!==ids.length)return fail(409,'Subscription history requires manual review.');
 const active=[];
 for(const id of ids){
  const res=await fetcher('https://api.stripe.com/v1/subscriptions/'+encodeURIComponent(id)+'?expand%5B%5D=latest_invoice',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(8000)});
  if(!res.ok)return fail(503,'Current subscription verification unavailable.');
  const sub=await res.json();
  if(sub?.object!=='subscription'||sub.id!==id||sub.livemode!==false||sub.metadata?.sellerpilot_user_id!==user.id||sub.metadata?.sellerpilot_mode!=='sandbox')return fail(409,'Subscription ownership could not be verified.');
  if(!terminal.has(sub.status))active.push(sub);
 }
 if(active.length>1)return fail(409,'Multiple non-terminal subscriptions require review.');
 const allowed=active.length===1?eligible(active[0],user.id,prices,clock()):null;
 const common={ok:true,sandbox:true,production_access:false,eligible:!!allowed,plan:allowed?.plan??null,period_end:allowed?.period_end??null,cancel_at_period_end:allowed?.cancel_at_period_end??false,monthly_credits:allowed?.monthly_credits??0,daily_credits:allowed?.daily_credits??0};
 if(input.action==='status')return reply(200,common);
 if(!allowed)return fail(403,'No verified paid sandbox subscription.');
 // Photo is Professional-only; simulated units are never sent to the AI provider.
 if(input.feature==='photo'&&allowed.plan!=='professional')return fail(403,'Photo simulation requires Professional.');
 const reserved=await rpc('sellerpilot_v43_simulate_credit',{p_user_id:user.id,p_subscription_id:allowed.subscription_id,p_plan:allowed.plan,p_feature:input.feature,p_request_id:input.request_id});
 if(reserved!==true)return fail(429,'Sandbox allowance exhausted or request already recorded.');
 return reply(200,{...common,simulated:true,credits:input.feature==='photo'?3:1});
 }catch{console.warn('STRIPE_ACCESS_SIMULATION_FAILED');return fail(503,'Sandbox verification unavailable. No production access granted.')}
}}
