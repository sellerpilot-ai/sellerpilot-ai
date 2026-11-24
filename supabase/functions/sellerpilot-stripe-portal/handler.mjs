// Sandbox-only portal. No subscription entitlement or direct billing changes.
const origin='https://sellerpilot-ai.github.io';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sid=/^sub_[A-Za-z0-9]{8,160}$/,cid=/^cus_[A-Za-z0-9]{8,160}$/,pid=/^price_[A-Za-z0-9]{8,160}$/;
function runtimeKey(env,name,legacy){try{const k=JSON.parse(env(name)||'{}').default;if(typeof k==='string'&&k)return k}catch{}return env(legacy)}
async function read(req){const reader=req.body?.getReader();if(!reader)throw Error('missing body');let total=0,s='';const d=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>1024){await reader.cancel();throw Error('too large')}s+=d.decode(value,{stream:true})}return JSON.parse(s+d.decode())}finally{reader.releaseLock()}}

const bpc=/^bpc_[A-Za-z0-9]{8,160}$/;
const returnURL=origin+'/sellerpilot-ai/?v=44&billing=portal-return';
export function safePortalURL(raw){try{if(typeof raw!=='string'||raw.length>8192||raw!==raw.trim()||/[\u0000-\u0020\u007f\\]/.test(raw))return false;const u=new URL(raw);return u.origin==='https://billing.stripe.com'&&!u.username&&!u.password&&u.pathname!=='/'&&!/^\/p\/session\/live_/i.test(u.pathname)}catch{return false}}
export function safeConfig(c,id){const f=c?.features;return c?.object==='billing_portal.configuration'&&c.id===id&&c.livemode===false&&c.active===true&&c.login_page?.enabled===false&&f?.invoice_history?.enabled===true&&f.payment_method_update?.enabled===true&&f.subscription_cancel?.enabled===true&&f.subscription_cancel.mode==='at_period_end'&&f.subscription_cancel.proration_behavior==='none'&&f.subscription_update?.enabled===false&&f.customer_update?.enabled===false}
export function ownsSubscription(sub,user,customer,prices){const plan=sub?.metadata?.sellerpilot_plan,expected=plan==='starter'?999:plan==='professional'?1999:0,items=sub?.items?.data,item=Array.isArray(items)&&items.length===1&&sub.items.has_more===false?items[0]:null,p=item?.price;return sub?.object==='subscription'&&sid.test(sub.id||'')&&sub.livemode===false&&sub.customer===customer&&sub.metadata?.sellerpilot_mode==='sandbox'&&sub.metadata?.sellerpilot_user_id===user&&expected>0&&item?.quantity===1&&p?.id===prices[plan]&&p.livemode===false&&p.currency==='gbp'&&p.unit_amount===expected&&p.recurring?.interval==='month'&&p.recurring?.interval_count===1}
export function createHandler(env,fetcher){return async req=>{
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
 if(!uuid.test(user?.id||'')||!user.email_confirmed_at||user.is_anonymous===true||!env('SELLERPILOT_STRIPE_BETA_USER_IDS').split(',').map(x=>x.trim()).includes(user.id))return fail(403,'Private test account required.');
 let input;try{input=await read(req)}catch{return fail(400,'Invalid request.')}
 if(!input||typeof input!=='object'||Array.isArray(input))return fail(400,'Invalid request.');
 const fields=Object.keys(input).sort().join(',');
 if(!((input.action==='status'&&fields==='action')||(input.action==='open_portal'&&fields==='action,consent'&&input.consent===true)))return fail(400,'Unsupported sandbox action.');
 const enabled=env('SELLERPILOT_STRIPE_PORTAL_ENABLED')==='true';
 if(!enabled)return input.action==='status'?reply(200,{ok:true,sandbox:true,enabled:false,production_access:false}):fail(503,'Sandbox portal disabled.');
 const key=env('SELLERPILOT_STRIPE_TEST_KEY'),config=env('SELLERPILOT_STRIPE_PORTAL_CONFIG'),service=runtimeKey(env,'SUPABASE_SECRET_KEYS','SUPABASE_SERVICE_ROLE_KEY'),prices={starter:env('SELLERPILOT_STRIPE_STARTER_PRICE'),professional:env('SELLERPILOT_STRIPE_PRO_PRICE')};
 if(!/^sk_test_[A-Za-z0-9_]{12,}$/.test(key)||!service||!bpc.test(config)||!pid.test(prices.starter)||!pid.test(prices.professional)||prices.starter===prices.professional)return fail(503,'Sandbox portal configuration incomplete.');
 const admin={apikey:service,...(service.startsWith('sb_secret_')?{}:{Authorization:'Bearer '+service}),'Content-Type':'application/json'};
 const rpc=async(name,args)=>{const res=await fetcher(base+'/rest/v1/rpc/'+name,{method:'POST',headers:admin,body:JSON.stringify(args),redirect:'error',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('database');return res.json()};
 const stripe=async(path,init={})=>{const res=await fetcher('https://api.stripe.com/v1/'+path,{...init,headers:{Authorization:'Bearer '+key,...init.headers},redirect:'error',signal:AbortSignal.timeout(8000)});if(!res.ok)throw Error('provider');return res.json()};
 const customer=await rpc('sellerpilot_v44_unique_customer',{p_user_id:user.id});
 if(typeof customer!=='string'||!cid.test(customer))return fail(409,'No unique sandbox customer record; operator review required.');
 const list=await stripe('subscriptions?'+new URLSearchParams({customer,status:'all',limit:'20'}));
 // Portal exposes the customer's whole account. Refuse a mixed or incomplete history.
 if(list?.object!=='list'||list.has_more!==false||!Array.isArray(list.data)||list.data.length<1||list.data.length>20||list.data.some(sub=>!ownsSubscription(sub,user.id,customer,prices))||new Set(list.data.map(x=>x.id)).size!==list.data.length)return fail(409,'Customer subscription ownership could not be fully verified.');
 const c=await stripe('billing_portal/configurations/'+encodeURIComponent(config));
 if(!safeConfig(c,config))return fail(409,'Sandbox portal configuration does not match the approved test settings.');
 if(input.action==='status')return reply(200,{ok:true,sandbox:true,enabled:true,production_access:false});
 const session=await stripe('billing_portal/sessions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({customer,configuration:config,return_url:returnURL})});
 const issue=session?.object!=='billing_portal.session'?'object':session.livemode!==false?'sandbox mode':session.customer!==customer?'customer':session.configuration!==config?'configuration':session.return_url!==returnURL?'return URL':!safePortalURL(session.url)?'hosted URL':null;
 if(issue)return fail(502,'Unexpected portal response ('+issue+').');
 return reply(200,{ok:true,sandbox:true,production_access:false,url:session.url});
 }catch{console.warn('STRIPE_SANDBOX_PORTAL_FAILED');return fail(503,'Sandbox portal unavailable. No production access granted.')}
}}
