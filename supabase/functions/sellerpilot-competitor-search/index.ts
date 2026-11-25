import { providerAccess } from './provider-access.mjs';

import {createClient} from 'npm:@supabase/supabase-js@2.57.0';
const env=n=>(Deno.env.get(n)||'').trim();
const cors=o=>({'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin',...(o==='https://sellerpilot-ai.github.io'||/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o||'')?{'Access-Control-Allow-Origin':o,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info'}:{})});
const send=(body,status=200,o=null)=>new Response(JSON.stringify(body),{status,headers:cors(o)});
const price=(p)=>{const x=Number(p?.value??p?.amount),div=Number(p?.divisor||1);return Number.isFinite(x)&&div>0?Math.round(x/div*100)/100:null};
async function etsy(q){
 const u=new URL('https://api.etsy.com/v3/application/listings/active');u.searchParams.set('keywords',q);u.searchParams.set('limit','12');u.searchParams.set('sort_on','score');
 const r=await fetch(u,{headers:{'x-api-key':env('SELLERPILOT_ETSY_API_KEY'),'Accept':'application/json'},signal:AbortSignal.timeout(9000)});
 if(!r.ok)return {error:'provider_error',detail:'Etsy Open API responded '+r.status+'. Check permission and credentials.'};
 const d=await r.json();
 return {source:'Etsy Open API v3',marketplace:'Etsy',results:(Array.isArray(d.results)?d.results:[]).map(x=>({title:String(x.title||'').slice(0,250),shop:x.shop_id?'Shop ID '+x.shop_id:'Etsy seller',url:x.url||('https://www.etsy.com/listing/'+x.listing_id),price:price({amount:x.price?.amount,divisor:x.price?.divisor||100}),currency:x.price?.currency_code||null,listing_id:String(x.listing_id||'')})).filter(x=>x.title&&/^https:\/\/(www\.)?etsy\.com\//.test(x.url)).slice(0,12)};
}
async function ebay(q){
 const id=env('SELLERPILOT_EBAY_CLIENT_ID'),secret=env('SELLERPILOT_EBAY_CLIENT_SECRET');
 const token=await fetch('https://api.ebay.com/identity/v1/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Authorization':'Basic '+btoa(id+':'+secret)},body:'grant_type=client_credentials&scope='+encodeURIComponent('https://api.ebay.com/oauth/api_scope'),signal:AbortSignal.timeout(9000)});
 if(!token.ok)return {error:'provider_error',detail:'eBay OAuth responded '+token.status+'. Check approved credentials.'};
 const t=await token.json(),u=new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
 u.searchParams.set('q',q);u.searchParams.set('limit','12');
 const r=await fetch(u,{headers:{Authorization:'Bearer '+t.access_token,'X-EBAY-C-MARKETPLACE-ID':'EBAY_GB',Accept:'application/json'},signal:AbortSignal.timeout(9000)});
 if(!r.ok)return {error:'provider_error',detail:'eBay Browse responded '+r.status+'. Check production access.'};
 const d=await r.json();
 return {source:'eBay Browse API',marketplace:'eBay',results:(Array.isArray(d.itemSummaries)?d.itemSummaries:[]).map(x=>({title:String(x.title||'').slice(0,250),shop:String(x.seller?.username||'eBay seller'),url:x.itemWebUrl,price:price(x.price),currency:x.price?.currency||null,listing_id:String(x.itemId||'')})).filter(x=>x.title&&/^https:\/\/(www\.)?ebay\.[^/]+\//.test(x.url||'')).slice(0,12)};
}
Deno.serve(async req=>{
 const o=req.headers.get('Origin');
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(o)});
 if(o&&o!=='https://sellerpilot-ai.github.io'&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o))return send({error:'origin_not_allowed'},403,o);
 if(!['GET','POST'].includes(req.method))return send({error:'method_not_allowed'},405,o);
 const auth=req.headers.get('Authorization')||'';
 if(!auth.startsWith('Bearer '))return send({error:'sign_in_required'},401,o);
 const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY');
 if(!url||!anon)return send({error:'backend_not_ready'},503,o);
 const client=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await client.auth.getUser(auth.substring(7));
 if(error||!data.user?.id)return send({error:'invalid_session'},401,o);
 const providers=providerAccess(env,data.user);
 if(req.method==='GET')return send({ok:true,providers,limit_per_day:12},200,o);
 let input;try{input=await req.json()}catch{return send({error:'invalid_json'},400,o)}
 const provider=String(input?.provider||'').toLowerCase(),query=String(input?.query||'').trim().replace(/\s+/g,' ');
 if(!['etsy','ebay'].includes(provider)||query.length<3||query.length>100)return send({error:'invalid_search',detail:'Select a marketplace and enter 3–100 characters.'},400,o);
 if(!providers[provider])return send({error:'provider_not_configured',detail:'Approved '+provider+' API credentials are not connected yet.'},503,o);
 const key=env('SUPABASE_SERVICE_ROLE_KEY');if(!key)return send({error:'usage_protection_not_configured'},503,o);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:allowed,error:guardError}=await admin.rpc('sellerpilot_reserve_research_request',{p_user_id:data.user.id,p_date:new Date().toISOString().slice(0,10),p_cap:12});
 if(guardError)return send({error:'usage_protection_unavailable'},503,o);
 if(allowed!==true)return send({error:'daily_limit_reached',detail:'12 searches per account per day.'},429,o);
 try{
 const out=provider==='etsy'?await etsy(query):await ebay(query);
 if(out.error)return send(out,502,o);
 return send({ok:true,query,checked_at:new Date().toISOString(),...out},200,o);
 }catch{return send({error:'provider_unavailable',detail:'The approved marketplace API did not respond.'},502,o)}
});
