/* Deployment candidate. Off until explicitly enabled after Etsy approval.
 * One-time read-only preview. No Etsy access or refresh tokens retained. */
const callbacks=new Map([
 ["https://sellerpilot-ai.github.io","https://sellerpilot-ai.github.io/sellerpilot-ai/etsy-return.html"],
 ["https://sellerpilot-ai-21c.pages.dev","https://sellerpilot-ai-21c.pages.dev/etsy-return.html"]
]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,"0")).join("");
const hash=async s=>new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));
const hex=a=>Array.from(a,v=>v.toString(16).padStart(2,"0")).join("");
const base64url=a=>btoa(String.fromCharCode(...a)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
const tidy=(v,n)=>typeof v==="string"?v.slice(0,n):"";
const digits=v=>/^[1-9]\d{0,18}$/.test(String(v));
export function createHandler(env,fetcher){
 return async req=>{
  const incoming=req.headers.get("origin"),originAllowed=callbacks.has(incoming),headers={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",...(originAllowed?{"Access-Control-Allow-Origin":incoming,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}:{})};
  const reply=(s,b)=>new Response(JSON.stringify(b),{status:s,headers}),fail=(s,detail)=>reply(s,{ok:false,detail});
  if(!originAllowed)return fail(403,"Origin not permitted.");
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return fail(405,"POST required.");
  const auth=req.headers.get("authorization")||"",url=env("SUPABASE_URL"),anon=env("SUPABASE_ANON_KEY"),service=env("SUPABASE_SERVICE_ROLE_KEY");
  if(!auth.startsWith("Bearer "))return fail(401,"Sign in first.");
  if(!url||!anon)return fail(503,"Account service unavailable.");
  const json=async(u,opts={})=>{const r=await fetcher(u,{...opts,signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error("Upstream rejected request");return await r.json()};
  try{
   const user=await json(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:auth}});
   if(!uuid.test(user.id||"")||!user.email_confirmed_at||user.is_anonymous===true)return fail(401,"Verified account required.");
   let body;try{const reader=req.body?.getReader();if(!reader)return fail(400,"Invalid request.");let n=0,s="",decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>8192){await reader.cancel();return fail(413,"Request too large.")}s+=decoder.decode(value,{stream:true})}body=JSON.parse(s+decoder.decode())}catch{return fail(400,"Invalid request.")}
   const key=env("SELLERPILOT_ETSY_KEYSTRING"),secret=env("SELLERPILOT_ETSY_SHARED_SECRET");
   const allowed=String(env("SELLERPILOT_MARKETPLACE_BETA_USER_IDS")||"").split(",").map(x=>x.trim()).includes(user.id);
   const redirect=callbacks.get(incoming),configuredRedirect=env("SELLERPILOT_ETSY_PREVIEW_REDIRECT_URI");
   const enabled=redirect===configuredRedirect&&allowed&&env("SELLERPILOT_ETSY_APPROVED")==="true"&&env("SELLERPILOT_ETSY_PREVIEW_ENABLED")==="true"&&!!key&&!!secret&&!!service;
   if(body?.action==="status")return reply(200,{ok:true,enabled});
   if(!enabled)return fail(503,"Etsy authorisation is not enabled. CSV import remains available.");
   const admin={apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"};
   const rpc=(name,data)=>json(url+"/rest/v1/rpc/"+name,{method:"POST",headers:admin,body:JSON.stringify(data)});
   if(body?.action==="begin"){
    if(body.consent!==true)return fail(400,"Confirm read-only access first.");
    const state=random(),verifier=random(),challenge=base64url(await hash(verifier));
    const reserved=await rpc("sellerpilot_etsy_begin",{p_user_id:user.id,p_state_hash:hex(await hash(state)),p_verifier:verifier});
    if(reserved!==true)return fail(429,"Authorisation limit reached. Try again tomorrow.");
    const p=new URLSearchParams({response_type:"code",client_id:key,redirect_uri:redirect,scope:"listings_r",state,code_challenge:challenge,code_challenge_method:"S256"});
    return reply(200,{ok:true,authorization_url:"https://www.etsy.com/oauth/connect?"+p});
   }
   if(body?.action!=="finish"||!(/^[a-f0-9]{64}$/.test(body.state||""))||typeof body.code!=="string"||body.code.length<1||body.code.length>2048)return fail(400,"Start a new authorised preview.");
   const verifier=await rpc("sellerpilot_etsy_consume",{p_user_id:user.id,p_state_hash:hex(await hash(body.state))});
   if(typeof verifier!=="string"||!(/^[a-f0-9]{64}$/.test(verifier)))return fail(400,"Authorisation expired, used already or belongs to a different account.");
   const token=await json("https://api.etsy.com/v3/public/oauth/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","x-api-key":key+":"+secret},body:new URLSearchParams({grant_type:"authorization_code",client_id:key,redirect_uri:redirect,code:body.code,code_verifier:verifier})});
   const access=token.access_token,owner=typeof access==="string"?access.split(".")[0]:"";
   if(!digits(owner)||!access.includes(".")||token.token_type?.toLowerCase()!=="bearer"||!String(token.scope||"").split(/\s+/).includes("listings_r"))return fail(502,"Etsy did not grant the required read-only access.");
   const etsyHeaders={"x-api-key":key+":"+secret,Authorization:"Bearer "+access};
   const shop=await json("https://api.etsy.com/v3/application/users/"+owner+"/shops",{headers:etsyHeaders});
   if(!digits(shop.shop_id)||String(shop.user_id)!==owner||typeof shop.shop_name!=="string"||!shop.shop_name.trim())return fail(403,"Could not verify the shop belongs to this Etsy account.");
   const data=await json("https://api.etsy.com/v3/application/shops/"+shop.shop_id+"/listings?state=active&limit=50&offset=0&sort_on=created&sort_order=desc",{headers:etsyHeaders});
   if(!Array.isArray(data.results)||data.results.length>50||data.results.some(x=>!x||String(x.shop_id)!==String(shop.shop_id)||String(x.user_id)!==owner||!digits(x.listing_id)||x.state!=="active"||typeof x.title!=="string"||!x.title.trim())||new Set(data.results.map(x=>String(x.listing_id))).size!==data.results.length)return fail(502,"Could not verify the returned listings.");
   const listings=data.results.map(x=>({listing_id:String(x.listing_id),title:tidy(x.title,250),state:tidy(x.state,30)}));
   // Only basic preview fields returned; tokens, buyer data and raw response never leave the server.
   return reply(200,{ok:true,shop_name:tidy(shop.shop_name,120),listings,total:Number.isSafeInteger(data.count)&&data.count>=listings.length?data.count:null,retrieved_at:new Date().toISOString()});
  }catch{return fail(503,"Etsy preview unavailable. No listings or tokens were saved. Start a new authorisation if necessary.")}
 };
}
