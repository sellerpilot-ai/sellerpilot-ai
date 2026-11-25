const discoveryEndpoint="https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live";
const endpoint="https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const location={UK:2826,US:2840};
function runtimeKey(env,name,legacy){try{const k=JSON.parse(env(name)||"{}").default;if(typeof k==="string"&&k)return k}catch{}return env(legacy)}
const adminHeaders=key=>({apikey:key,...(key.startsWith("sb_secret_")?{}:{Authorization:"Bearer "+key}),"Content-Type":"application/json"});
const canonical=s=>s.normalize("NFKC").toLowerCase().trim().replace(/\s+/g," ");
export function validateInput(body){
 if(body?.consent!==true||!Object.hasOwn(location,body.region)||!Array.isArray(body.keywords)||body.keywords.length<1||body.keywords.length>20)return null;
 if(body.keywords.some(x=>typeof x!=="string"||x.length>80||! /^[\p{L}\p{N}][\p{L}\p{N}\s'’&-]*$/u.test(canonical(x))||/[\r\n\t]/.test(x)||canonical(x).split(" ").length>10))return null;
 return {region:body.region,keywords:[...new Set(body.keywords.map(canonical))].sort()};
}
const discoveryPhrase=s=>typeof s==="string"&&s.length<=80&&/^[\p{L}\p{N}][\p{L}\p{N}\s'’&-]*$/u.test(s)&&!/[\r\n\t]/.test(s)&&s.split(" ").length<=10;
const volume=x=>Number.isSafeInteger(x)&&x>=0?x:null;
export function transform(data,input,now=new Date()){
 const task=data?.tasks?.[0],discovery=input.mode==="discover";
 if(data?.status_code!==20000||data.tasks.length!==1||task?.status_code!==20000||!Array.isArray(task.result)||task.result.length>(discovery?20000:1000))return null;
 const rows=new Map();
 for(const r of task.result){
  if(typeof r?.keyword!=="string"||r.location_code!==location[input.region]||r.language_code!=="en"||r.search_partners!==false)continue;
  const keyword=canonical(r.keyword);if((discovery?!discoveryPhrase(keyword):!input.keywords.includes(keyword))||rows.has(keyword))continue;
  const monthly=new Map();
  for(const m of Array.isArray(r.monthly_searches)?r.monthly_searches.slice(0,60):[]){if(Number.isInteger(m?.year)&&m.year>=2000&&m.year<=now.getUTCFullYear()&&Number.isInteger(m.month)&&m.month>=1&&m.month<=12){const key=m.year+"-"+String(m.month).padStart(2,"0");if(key<=now.toISOString().slice(0,7))monthly.set(key,volume(m.search_volume))}}
  const history=[...monthly].sort((a,b)=>a[0].localeCompare(b[0])).slice(-12).map(([month,searches])=>({month,searches}));
  rows.set(keyword,{keyword,average_monthly_searches:volume(r.search_volume),ads_competition:["LOW","MEDIUM","HIGH"].includes(r.competition)?r.competition:null,monthly:history});
  if(discovery&&rows.size>=20)break;
 }
 return {source:"Google Ads via DataForSEO",region:input.region,retrieved_at:now.toISOString(),...(discovery?{mode:"discover",seeds:input.keywords,selection:"first 20 valid distinct provider suggestions in relevance order"}:{}),rows:discovery?[...rows.values()]:input.keywords.map(keyword=>rows.get(keyword)||{keyword,average_monthly_searches:null,ads_competition:null,monthly:[]})};
}
export function createHandler(env,fetcher=fetch){
 return async req=>{
 const origin=req.headers.get("origin"),allowed=origin==="https://sellerpilot-ai.github.io";
 const headers={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",...(allowed?{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"POST,OPTIONS"}:{})};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers}),fail=(status,detail)=>reply(status,{ok:false,detail});
 if(origin&&!allowed)return fail(403,"Origin not permitted.");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 if(req.method!=="POST")return fail(405,"POST required.");
 const auth=req.headers.get("authorization")||"",url=env("SUPABASE_URL"),anon=runtimeKey(env,"SUPABASE_PUBLISHABLE_KEYS","SUPABASE_ANON_KEY");
 if(!auth.startsWith("Bearer "))return fail(401,"Sign in first.");
 if(!url||!anon)return fail(503,"Secure service unavailable.");
 let reservation=null,user=null,service=null;
 const get=async(u,init,ms=10000)=>{const r=await fetcher(u,{...init,signal:AbortSignal.timeout(ms)});if(!r.ok)throw Error("Request failed");if(u!==discoveryEndpoint)return r.json();
 // Related-keyword responses can be large; bound memory and never retry a failed task.
 const limit=16*1024*1024;if(Number(r.headers.get("content-length")||0)>limit)throw Error("Response too large");
 const reader=r.body?.getReader();if(!reader)throw Error("Empty response");let bytes=0,parts=[];const decoder=new TextDecoder();
 try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit){await reader.cancel();throw Error("Response too large");}parts.push(decoder.decode(value,{stream:true}));}parts.push(decoder.decode());return JSON.parse(parts.join(""));}finally{reader.releaseLock();}
 };
 const rpc=(name,body)=>get(url+"/rest/v1/rpc/"+name,{method:"POST",headers:adminHeaders(service),body:JSON.stringify(body)});
 const finish=async result=>rpc("sellerpilot_demand_finish",{p_user_id:user.id,p_request_id:reservation,p_result:result});
 try{
  user=await get(url+"/auth/v1/user",{headers:{apikey:anon,Authorization:auth}});
  if(!uuid.test(user?.id||"")||user.is_anonymous===true||!user.email_confirmed_at)return fail(401,"Verified account required.");
  const login=env("DATAFORSEO_LOGIN"),password=env("DATAFORSEO_PASSWORD");
  service=runtimeKey(env,"SUPABASE_SECRET_KEYS","SUPABASE_SERVICE_ROLE_KEY");
  const enabled=env("SELLERPILOT_DEMAND_ENABLED")==="true"&&!!login&&!!password&&!!service&&(env("SELLERPILOT_DEMAND_BETA_USER_IDS")||"").split(",").map(x=>x.trim()).filter(x=>uuid.test(x)).includes(user.id);
  if(Number(req.headers.get("content-length")||0)>5000)return fail(413,"Request too large.");
  const reader=req.body?.getReader();let raw="",bytes=0;const decoder=new TextDecoder();
  if(reader){try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>5000){await reader.cancel();return fail(413,"Request too large.")}raw+=decoder.decode(value,{stream:true})}raw+=decoder.decode()}finally{reader.releaseLock()}}
  let body;try{body=JSON.parse(raw)}catch{return fail(400,"Invalid JSON.")}
  if(body?.action==="status")return reply(200,{ok:true,enabled});
  if(!enabled)return fail(503,"Google demand research is not enabled for this account.");
  if(!["research","discover"].includes(body?.action))return fail(400,"Invalid action.");
  const input=validateInput(body);if(!input)return fail(400,"Enter 1–20 authorised keyword phrases and select UK or US.");
  const discovery=body.action==="discover";if(discovery){if(input.keywords.length!==1||body.keywords.length!==1)return fail(400,"Enter exactly one authorised seed phrase.");input.mode="discover";}
  const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(input)));
  const cacheKey=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,"0")).join("");
  const claim=await rpc("sellerpilot_demand_begin",{p_user_id:user.id,p_cache_key:cacheKey});
  if(claim?.state==="cached"&&claim.result?.source==="Google Ads via DataForSEO"&&claim.result.region===input.region&&(discovery?claim.result.mode==="discover"&&JSON.stringify(claim.result.seeds)===JSON.stringify(input.keywords):!claim.result.mode))return reply(200,{ok:true,cached:true,report:claim.result});
  if(claim?.state==="pending")return fail(409,"Identical research is already in progress. No new task sent.");
  if(claim?.state==="exhausted")return fail(429,"Private trial budget reached. No new task sent.");
  if(claim?.state!=="reserved"||!uuid.test(claim.request_id||""))return fail(503,"Research budget could not be verified. No new task sent.");
  reservation=claim.request_id;
  // Never accept a user-supplied URL, credentials, region code, dates or request size.
  const data=await get(discovery?discoveryEndpoint:endpoint,{method:"POST",headers:{Authorization:"Basic "+btoa(login+":"+password),"Content-Type":"application/json"},body:JSON.stringify([{keywords:input.keywords,location_code:location[input.region],language_code:"en",search_partners:false,...(discovery?{sort_by:"relevance",include_adult_keywords:false}:{})}])},30000);
  const report=transform(data,input);if(!report){await finish(null);reservation=null;return fail(502,"Provider returned no verified result. Trial reservation retained.")}
  if(await finish(report)!==true)throw Error("Cache write failed");reservation=null;
  return reply(200,{ok:true,cached:false,report});
 }catch{if(reservation&&user&&service){try{await finish(null)}catch{}}return fail(503,"Google demand research unavailable. If reserved, the trial task counts toward the limit. No automatic retry.")}
 };
}
