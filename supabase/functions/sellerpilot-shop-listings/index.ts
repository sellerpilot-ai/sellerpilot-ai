import { providerAccess } from './provider-access.mjs';

import { createClient } from "npm:@supabase/supabase-js@2.57.0";
const env=(s:string)=>(Deno.env.get(s)||"").trim();
const allowed=(s:string|null)=>s==="https://sellerpilot-ai.github.io"||(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(s||""));
const headers=(o:string|null)=>({"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin",...(allowed(o)&&o?{"Access-Control-Allow-Origin":o,"Access-Control-Allow-Headers":"authorization,apikey,content-type,x-client-info","Access-Control-Allow-Methods":"GET,POST,OPTIONS"}:{})});
const reply=(o:string|null,obj:object,status=200)=>new Response(JSON.stringify(obj),{status,headers:headers(o)});
const safePrice=(x:any):number|null=>{if(x==null)return null;const value=Number(x.amount??x.value??NaN),div=Number(x.divisor||1);return Number.isFinite(value)&&div>0?Math.round(value/div*100)/100:null};
const getJSON=async(url:URL|string,options:RequestInit)=>{const res=await fetch(url,{...options,signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error("Official marketplace API returned HTTP "+res.status);return await res.json()};
async function etsyShop(shop:string){
 const key=env("SELLERPILOT_ETSY_API_KEY"),opts={headers:{"x-api-key":key,"Accept":"application/json"}};
 const find=new URL("https://api.etsy.com/v3/application/shops");find.searchParams.set("shop_name",shop);find.searchParams.set("limit","20");
 const hits=await getJSON(find,opts);
 const exact=(Array.isArray(hits.results)?hits.results:[]).find((x:any)=>String(x.shop_name||"").toLowerCase()===shop.toLowerCase());
 if(!exact?.shop_id)return {shop,marketplace:"Etsy",listings:[],note:"No exact shop name found through the approved Etsy API."};
 const path=new URL("https://api.etsy.com/v3/application/shops/"+encodeURIComponent(String(exact.shop_id))+"/listings/active");
 path.searchParams.set("limit","30");path.searchParams.set("offset","0");path.searchParams.set("sort_on","created");path.searchParams.set("sort_order","desc");
 const data=await getJSON(path,opts);
 return {shop:String(exact.shop_name),marketplace:"Etsy",listings:(Array.isArray(data.results)?data.results:[]).slice(0,30).map((x:any)=>({
  id:String(x.listing_id||""),title:String(x.title||"").slice(0,250),description:String(x.description||"").slice(0,4000),
  tags:Array.isArray(x.tags)?x.tags.map((t:unknown)=>String(t)).slice(0,30):null,price:safePrice(x.price),currency:x.price?.currency_code||null,
  url:"https://www.etsy.com/listing/"+String(x.listing_id||""), image:typeof x.images?.[0]?.url_570xN==="string"?x.images[0].url_570xN:"",
  created_at:Number.isFinite(Number(x.created_timestamp))?new Date(Number(x.created_timestamp)*1000).toISOString():null
 })).filter((x:any)=>/^\d+$/.test(x.id)&&x.title),note:"Public listing fields only; tags/images may be omitted by the provider. Listings are sorted by creation date where supported."};
}
async function ebaySeller(shop:string){
 const id=env("SELLERPILOT_EBAY_CLIENT_ID"),secret=env("SELLERPILOT_EBAY_CLIENT_SECRET");
 const token=await fetch("https://api.ebay.com/identity/v1/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Authorization":"Basic "+btoa(id+":"+secret)},body:"grant_type=client_credentials&scope="+encodeURIComponent("https://api.ebay.com/oauth/api_scope"),signal:AbortSignal.timeout(12000)});
 if(!token.ok)throw Error("eBay authentication returned HTTP "+token.status);
 const t=await token.json();
 const u=new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
 u.searchParams.set("filter","sellers:{"+shop+"}");u.searchParams.set("sort","newlyListed");u.searchParams.set("limit","30");
 const data=await getJSON(u,{headers:{"Authorization":"Bearer "+String(t.access_token||""),"X-EBAY-C-MARKETPLACE-ID":"EBAY_GB","Accept":"application/json"}});
 return{shop,marketplace:"eBay",listings:(Array.isArray(data.itemSummaries)?data.itemSummaries:[]).slice(0,30).map((x:any)=>({
  id:String(x.itemId||""),title:String(x.title||"").slice(0,250),description:null,tags:null,
  price:safePrice(x.price),currency:x.price?.currency||null,url:String(x.itemWebUrl||""),
  image:typeof x.image?.imageUrl==="string"?x.image.imageUrl:"",
  created_at:typeof x.itemCreationDate==="string"?x.itemCreationDate:null
 })).filter((x:any)=>x.title&&/^https:\/\/(www\.)?ebay\.[^/]+\//i.test(x.url)),note:"eBay Browse summary does not include descriptions or SEO tags; those cannot be audited from this response."};
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("Origin");
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:headers(origin)});
 if(origin&&!allowed(origin))return reply(origin,{error:"origin_not_allowed"},403);
 if(req.method!=="GET"&&req.method!=="POST")return reply(origin,{error:"method_not_allowed"},405);
 const bearer=req.headers.get("Authorization")||"";
 if(!bearer.startsWith("Bearer "))return reply(origin,{error:"sign_in_required"},401);
 const url=env("SUPABASE_URL"),key=env("SUPABASE_ANON_KEY");
 if(!url||!key)return reply(origin,{error:"backend_not_ready"},503);
 const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await auth.auth.getUser(bearer.slice(7));
 if(error||!data.user?.id)return reply(origin,{error:"invalid_session"},401);
 const configured=providerAccess(env,data.user);
 if(req.method==="GET")return reply(origin,{ok:true,providers:configured,limit:12});
 let request:any;try{request=await req.json()}catch{return reply(origin,{error:"invalid_json"},400)}
 const provider=String(request?.provider||"").toLowerCase(),shop=String(request?.shop||"").trim();
 if(!["etsy","ebay"].includes(provider)||!(/^[a-zA-Z0-9_-]{2,50}$/.test(shop)))return reply(origin,{error:"invalid_shop",detail:"Use a valid Etsy shop name or eBay seller username."},400);
 if(!configured[provider as "etsy"|"ebay"])return reply(origin,{error:"provider_not_configured",detail:"Approved "+provider+" API access is not connected yet. You can review your own saved products or import CSV listings instead."},503);
 const service=env("SUPABASE_SERVICE_ROLE_KEY");if(!service)return reply(origin,{error:"usage_guard_unavailable"},503);
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:reserved,error:limerr}=await admin.rpc("sellerpilot_reserve_research_request",{p_user_id:data.user.id,p_date:new Date().toISOString().slice(0,10),p_cap:12});
 if(limerr)return reply(origin,{error:"usage_guard_unavailable"},503);
 if(reserved!==true)return reply(origin,{error:"daily_limit_reached",detail:"Daily official API search limit reached. Try tomorrow."},429);
 try{const found=provider==="etsy"?await etsyShop(shop):await ebaySeller(shop);return reply(origin,{ok:true,source:"Official "+found.marketplace+" API",retrieved_at:new Date().toISOString(),...found});}
 catch(e){return reply(origin,{error:"marketplace_unavailable",detail:String(e instanceof Error?e.message:"Marketplace request failed").slice(0,180)},502)}
});
