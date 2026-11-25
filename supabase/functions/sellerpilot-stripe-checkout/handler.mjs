// Private test-only hosted checkout. No production entitlements or live mode.
const origin='https://sellerpilot-ai.github.io';
const cloudOrigin='https://sellerpilot-ai-21c.pages.dev';
const yuviOrigin='https://yuvilist.com';
const allowedOrigin=from=>from===origin||from===cloudOrigin||from===yuviOrigin;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const priceId=/^price_[A-Za-z0-9]{8,100}$/;
function publishable(env){try{const k=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;if(typeof k==='string'&&k)return k}catch{}return env('SUPABASE_ANON_KEY')}
export function validPrice(p,id,amount,name){return p?.object==='price'&&p.id===id&&p.livemode===false&&p.active===true&&p.currency==='gbp'&&p.unit_amount===amount&&p.type==='recurring'&&p.billing_scheme==='per_unit'&&p.recurring?.interval==='month'&&p.recurring?.interval_count===1&&p.recurring?.usage_type==='licensed'&&p.product?.object==='product'&&p.product?.active===true&&p.product?.livemode===false&&p.product?.name===name}
async function body(req){const reader=req.body?.getReader();if(!reader)throw Error('missing body');let size=0,s='';const d=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();throw Error('too large')}s+=d.decode(value,{stream:true})}return JSON.parse(s+d.decode())}finally{reader.releaseLock()}}
// URL is an opaque provider-issued value, not constructed or supplied by the browser.
export function safeCheckoutURL(raw,id){try{if(typeof raw!=='string'||raw.length>8192||!/^cs_test_[A-Za-z0-9]{12,180}$/.test(id||''))return false;const u=new URL(raw);return u.origin==='https://checkout.stripe.com'&&!u.username&&!u.password&&u.pathname!=='/'}catch{return false}}
function openIssue(s,user,selected){if(s?.object!=='checkout.session')return 'object';if(s.livemode!==false)return 'mode safety';if(s.mode!=='subscription'||s.status!=='open'||s.payment_status!=='unpaid')return 'session state';if(s.client_reference_id!==user||s.metadata?.sellerpilot_user_id!==user||s.metadata?.sellerpilot_mode!=='sandbox'||s.metadata?.sellerpilot_plan!==selected[0].toLowerCase())return 'ownership';if(s.amount_total!==selected[2]||s.currency!=='gbp')return 'price';if(!/^cs_test_[A-Za-z0-9]{12,180}$/.test(s.id||''))return 'session identifier';if(s.managed_payments?.enabled!==false||s.adaptive_pricing?.enabled!==false||s.automatic_tax?.enabled!==false||!Array.isArray(s.payment_method_types)||s.payment_method_types.length!==1||s.payment_method_types[0]!=='card')return 'payment configuration';if(!safeCheckoutURL(s.url,s.id))return 'hosted checkout URL';return null}
export function createHandler(env,fetcher){return async req=>{
 const from=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(allowedOrigin(from)?{'Access-Control-Allow-Origin':from,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});const fail=(status,detail)=>reply(status,{ok:false,detail});
 if(from&&!allowedOrigin(from))return fail(403,'Origin not permitted.');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return fail(405,'POST required.');
 const auth=req.headers.get('authorization')||'',base=env('SUPABASE_URL'),pk=publishable(env);
 if(!auth.startsWith('Bearer '))return fail(401,'Sign in first.');
 if(!base||!pk)return fail(503,'Account service unavailable.');
 try{
  const ur=await fetcher(base+'/auth/v1/user',{method:'GET',headers:{apikey:pk,Authorization:auth},redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!ur.ok)return fail(401,'Verified account required.');
  const user=await ur.json();
  // Existing private AI test-account allowlist is reused solely for the operator diagnostic.
  if(!uuid.test(user?.id||'')||!user.email_confirmed_at||user.is_anonymous===true||!env('SELLERPILOT_STRIPE_BETA_USER_IDS').split(',').map(x=>x.trim()).includes(user.id))return fail(403,'Private test account required.');
  let input;try{input=await body(req)}catch{return fail(400,'Invalid diagnostic request.')}
  if(!input||typeof input!=='object'||Array.isArray(input))return fail(400,'Invalid request.');
  const enabled=env('SELLERPILOT_STRIPE_ENABLED')==='true';
  if(input.action==='status'&&Object.keys(input).length===1)return reply(200,{ok:true,sandbox:true,enabled});
  if(!['create_checkout','verify_checkout','resume_checkout'].includes(input.action))return fail(400,'Unsupported checkout action.');
  if(!enabled)return fail(503,'Sandbox checkout is disabled.');
  if(input.action==='create_checkout'&&(Object.keys(input).sort().join(',')!=='action,consent,plan,request_id'||input.consent!==true||!['starter','professional'].includes(input.plan)||!uuid.test(input.request_id||'')))return fail(400,'Choose a plan and confirm test-only checkout.');
  if(input.action==='verify_checkout'&&(Object.keys(input).sort().join(',')!=='action,session_id'||!/^cs_test_[A-Za-z0-9]{12,180}$/.test(input.session_id||'')))return fail(400,'Invalid sandbox session.');
  if(input.action==='resume_checkout'&&(Object.keys(input).sort().join(',')!=='action,consent,session_id'||input.consent!==true||!/^cs_test_[A-Za-z0-9]{12,180}$/.test(input.session_id||'')))return fail(400,'Confirm sandbox recovery and provide a test session ID.');
  const key=env('SELLERPILOT_STRIPE_TEST_KEY'),starter=env('SELLERPILOT_STRIPE_STARTER_PRICE'),pro=env('SELLERPILOT_STRIPE_PRO_PRICE');
  if(!/^sk_test_[A-Za-z0-9_]{12,}$/.test(key)||!priceId.test(starter)||!priceId.test(pro)||starter===pro)return fail(503,'Sandbox key or price configuration incomplete.');
  const plans=[['Starter',starter,999,'SellerPilot AI Starter'],['Professional',pro,1999,'SellerPilot AI Professional']];
  const stripeHeaders={Authorization:'Bearer '+key,'Stripe-Version':'2026-11-18.endive'};
  const request=async(path,init={})=>fetcher('https://api.stripe.com/v1/'+path,{...init,headers:{...stripeHeaders,...init.headers},redirect:'error',signal:AbortSignal.timeout(15000)});
  const planKey=input.plan==='starter'?'Starter':'Professional';
  if(input.action==='resume_checkout'){
   const res=await request('checkout/sessions/'+encodeURIComponent(input.session_id)+'?expand%5B%5D=line_items');
   if(!res.ok)return fail(404,'Sandbox session unavailable.');
   const s=await res.json();
   if(s?.id!==input.session_id||s?.client_reference_id!==user.id||s?.metadata?.sellerpilot_user_id!==user.id||s?.livemode!==false||s?.metadata?.sellerpilot_mode!=='sandbox')return fail(404,'Sandbox session unavailable.');
   const selected=plans.find(p=>p[0].toLowerCase()===s.metadata.sellerpilot_plan);
   if(!selected)return fail(409,'Sandbox session plan is not recognised.');
   const items=s.line_items?.data;
   if(!Array.isArray(items)||items.length!==1||s.line_items.has_more!==false||items[0].quantity!==1||items[0].price?.id!==selected[1])return fail(409,'Sandbox session line items do not match the configured plan.');
   if(!Number.isSafeInteger(s.expires_at)||s.expires_at<=Math.floor(Date.now()/1000))return fail(409,'Sandbox session has expired. No new session created.');
   const issue=openIssue(s,user.id,selected);
   if(issue)return fail(409,'Sandbox session failed validation: '+issue+'. No new session created.');
   return reply(200,{ok:true,sandbox:true,url:s.url,session_id:s.id,access_granted:false,resumed:true});
  }
  if(input.action==='verify_checkout'){
   const res=await request('checkout/sessions/'+encodeURIComponent(input.session_id)+'?expand%5B%5D=line_items&expand%5B%5D=subscription');
   if(!res.ok)return fail(404,'Sandbox session unavailable.');
   const s=await res.json();
   if(s?.object!=='checkout.session'||s.id!==input.session_id||s.livemode!==false||s.mode!=='subscription'||s.client_reference_id!==user.id||s.metadata?.sellerpilot_user_id!==user.id||s.metadata?.sellerpilot_mode!=='sandbox')return fail(404,'Sandbox session unavailable.');
   const items=s.line_items?.data,sub=s.subscription;
   const match=Array.isArray(items)&&items.length===1&&!s.line_items.has_more&&items[0].quantity===1&&plans.find(p=>items[0].price?.id===p[1]&&s.amount_total===p[2]&&s.currency==='gbp'&&s.metadata?.sellerpilot_plan===p[0].toLowerCase());
   const verified=!!match&&s.status==='complete'&&s.payment_status==='paid'&&sub?.object==='subscription'&&sub.livemode===false&&sub.status==='active'&&sub.metadata?.sellerpilot_user_id===user.id&&sub.metadata?.sellerpilot_mode==='sandbox'&&sub.metadata?.sellerpilot_plan===match[0].toLowerCase()&&typeof s.customer==='string'&&sub.customer===s.customer;
   return reply(200,{ok:true,sandbox:true,verified,plan:verified?match[0]:null,access_granted:false});
  }
  for(const [plan,id,amount,name] of plans.filter(p=>p[0]===planKey)){
   const url='https://api.stripe.com/v1/prices/'+encodeURIComponent(id)+'?expand%5B%5D=product';
   const res=await fetcher(url,{method:'GET',headers:stripeHeaders,redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!res.ok){console.warn('STRIPE_PRICE_CHECK',plan,res.status);return fail(502,'Stripe price check failed for '+plan+' (HTTP '+res.status+'). No payment was created.')}
   const p=await res.json();if(!validPrice(p,id,amount,name))return fail(409,plan+' does not match the expected active GBP monthly sandbox price.');
  }
  const selected=plans.find(p=>p[0]===planKey);
  const home=from===yuviOrigin?yuviOrigin+'/':from===cloudOrigin?cloudOrigin+'/':origin+'/sellerpilot-ai/';
  const form=new URLSearchParams({mode:'subscription','line_items[0][price]':selected[1],'line_items[0][quantity]':'1','allowed_payment_method_types[0]':'card','managed_payments[enabled]':'false','adaptive_pricing[enabled]':'false','automatic_tax[enabled]':'false',client_reference_id:user.id,success_url:home+'?v=41&billing=test-return&session_id={CHECKOUT_SESSION_ID}',cancel_url:home+'?v=41&billing=test-cancel','metadata[sellerpilot_user_id]':user.id,'metadata[sellerpilot_mode]':'sandbox','metadata[sellerpilot_plan]':input.plan,'subscription_data[metadata][sellerpilot_user_id]':user.id,'subscription_data[metadata][sellerpilot_mode]':'sandbox','subscription_data[metadata][sellerpilot_plan]':input.plan});
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('sellerpilot-v48-unmanaged-sandbox:'+user.id+':'+input.request_id));
  const idem=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
  const res=await request('checkout/sessions',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Idempotency-Key':idem},body:form});
  if(!res.ok){let param='';try{const e=(await res.json())?.error;const allowed=new Set(['payment_method_types','allowed_payment_method_types','adaptive_pricing','automatic_tax','mode','line_items','success_url','cancel_url','payment_method_configuration','managed_payments','managed_payments[enabled]']);if(allowed.has(e?.param))param=e.param}catch{}console.warn('STRIPE_CHECKOUT_STATUS',res.status,param||'other');return fail(502,'Stripe rejected test checkout (HTTP '+res.status+(param?', parameter: '+param:'')+'). No paid access granted.')}
  const s=await res.json();
  const issue=openIssue(s,user.id,selected);
  if(issue){console.warn('STRIPE_CHECKOUT_RESPONSE_VALIDATION',issue);return fail(502,'Stripe checkout response failed validation: '+issue+'. No access granted; check existing session before retrying.')}
  return reply(200,{ok:true,sandbox:true,url:s.url,session_id:s.id,access_granted:false});
 }catch{console.warn('STRIPE_CHECKOUT_FAILED');return fail(503,'Sandbox request unavailable. No access granted; check Stripe before retrying.')}
}}
