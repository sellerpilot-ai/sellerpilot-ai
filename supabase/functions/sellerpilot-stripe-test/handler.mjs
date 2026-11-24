// Read-only sandbox diagnostic. No Checkout, customer, invoice or subscription creation.
const origin='https://sellerpilot-ai.github.io';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const priceId=/^price_[A-Za-z0-9]{8,100}$/;
function publishable(env){try{const k=JSON.parse(env('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;if(typeof k==='string'&&k)return k}catch{}return env('SUPABASE_ANON_KEY')}
export function validPrice(p,id,amount,name){return p?.object==='price'&&p.id===id&&p.livemode===false&&p.active===true&&p.currency==='gbp'&&p.unit_amount===amount&&p.type==='recurring'&&p.billing_scheme==='per_unit'&&p.recurring?.interval==='month'&&p.recurring?.interval_count===1&&p.recurring?.usage_type==='licensed'&&p.product?.object==='product'&&p.product?.active===true&&p.product?.livemode===false&&p.product?.name===name}
async function body(req){const reader=req.body?.getReader();if(!reader)throw Error('missing body');let size=0,s='';const d=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>1024){await reader.cancel();throw Error('too large')}s+=d.decode(value,{stream:true})}return JSON.parse(s+d.decode())}finally{reader.releaseLock()}}
export function createHandler(env,fetcher){return async req=>{
 const from=req.headers.get('origin'),headers={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(from===origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}:{})};
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});const fail=(status,detail)=>reply(status,{ok:false,detail});
 if(from&&from!==origin)return fail(403,'Origin not permitted.');
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
  if(!input||input.action!=='check_prices'||Object.keys(input).length!==1)return fail(400,'Only the read-only price check is supported.');
  const key=env('SELLERPILOT_STRIPE_TEST_KEY'),starter=env('SELLERPILOT_STRIPE_STARTER_PRICE'),pro=env('SELLERPILOT_STRIPE_PRO_PRICE');
  if(!/^sk_test_[A-Za-z0-9_]{12,}$/.test(key)||!priceId.test(starter)||!priceId.test(pro)||starter===pro)return fail(503,'Sandbox key or price configuration incomplete.');
  const plans=[['Starter',starter,999,'SellerPilot AI Starter'],['Professional',pro,1999,'SellerPilot AI Professional']];
  const results=[];
  for(const [plan,id,amount,name] of plans){
   const url='https://api.stripe.com/v1/prices/'+encodeURIComponent(id)+'?expand%5B%5D=product';
   const res=await fetcher(url,{method:'GET',headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(12000)});
   if(!res.ok){console.warn('STRIPE_PRICE_CHECK',plan,res.status);return fail(502,'Stripe price check failed for '+plan+' (HTTP '+res.status+'). No payment was created.')}
   const p=await res.json();if(!validPrice(p,id,amount,name))return fail(409,plan+' does not match the expected active GBP monthly sandbox price.');
   results.push({plan,amount,currency:'GBP',interval:'month'});
  }
  return reply(200,{ok:true,sandbox:true,checkout_enabled:false,plans:results});
 }catch{console.warn('STRIPE_DIAGNOSTIC_FAILED');return fail(503,'Sandbox connection check unavailable. No payment was created.')}
}}
