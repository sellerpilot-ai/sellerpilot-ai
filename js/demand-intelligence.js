// Pure, local analysis of already retrieved Google Ads data. No provider calls.
const normal=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const stop=new Set('a an the and or of for to in on with by from'.split(' '));
const words=x=>[...new Set(normal(x).split(' ').filter(w=>w&&!stop.has(w)))];
const number=x=>Number.isSafeInteger(x)&&x>=0?x:null;
const monthPattern=/^\d{4}-(0[1-9]|1[0-2])$/;
export function validateReport(r){
 if(r?.source!=='Google Ads via DataForSEO'||!['UK','US'].includes(r.region)||!Number.isFinite(Date.parse(r.retrieved_at))||!Array.isArray(r.rows)||!r.rows.length||r.rows.length>20)throw Error('Invalid Google demand report.');
 const seen=new Set();
 return {source:r.source,region:r.region,retrieved_at:r.retrieved_at,rows:r.rows.map(x=>{
  if(typeof x?.keyword!=='string'||!x.keyword.trim()||x.keyword.length>80||seen.has(x.keyword)||!Array.isArray(x.monthly)||x.monthly.length>12)throw Error('Invalid Google demand row.');
  seen.add(x.keyword);const months=new Map();
  for(const m of x.monthly)if(typeof m?.month==='string'&&monthPattern.test(m.month))months.set(m.month,number(m.searches));
  return {keyword:x.keyword,average_monthly_searches:number(x.average_monthly_searches),ads_competition:['LOW','MEDIUM','HIGH'].includes(x.ads_competition)?x.ads_competition:null,monthly:[...months].sort((a,b)=>a[0].localeCompare(b[0])).map(([month,searches])=>({month,searches}))};
 })};
}
export function seasonal(monthly){
 const known=monthly.filter(m=>number(m.searches)!==null);
 if(!known.length)return {peak:null,peaks:[],observed:0};
 const peak=Math.max(...known.map(m=>m.searches));
 return {peak,peaks:known.filter(m=>m.searches===peak).map(m=>m.month),observed:known.length};
}
export function relevance(product,phrase){
 if(!product)return null;
 const target=words(phrase),basis=new Set(words([product.title,product.description,product.tags].join(' ')));
 if(!target.length)return null;
 const matched=target.filter(w=>basis.has(w)).length;
 const exactTitle=(' '+normal(product.title)+' ').includes(' '+normal(phrase)+' ');
 const exactTag=String(product.tags||'').split(',').some(t=>normal(t)===normal(phrase));
 return {matched,total:target.length,score:Math.round(100*matched/target.length),exactTitle,exactTag,tagEligible:Array.from(phrase).length<=20};
}
export function sortRows(rows,sort,product=null,filter=''){
 const term=normal(filter),arr=rows.filter(r=>!term||normal(r.keyword).includes(term)).map(row=>({...row,season:seasonal(row.monthly),relevance:relevance(product,row.keyword)}));
 const descending=(a,b)=>a===null?b===null?0:1:b===null?-1:b-a;
 return arr.sort((a,b)=>(sort==='alpha'?0:sort==='peak'?descending(a.season.peak,b.season.peak):sort==='relevance'?descending(a.relevance?.score??null,b.relevance?.score??null)||descending(a.average_monthly_searches,b.average_monthly_searches):descending(a.average_monthly_searches,b.average_monthly_searches))||a.keyword.localeCompare(b.keyword));
}
export function compareReports(a,b){
 if(!a||!b||a.region===b.region)return [];
 const uk=a.region==='UK'?a:b,us=a.region==='US'?a:b;
 const map=new Map(us.rows.map(r=>[r.keyword,r]));
 return uk.rows.filter(r=>map.has(r.keyword)).map(r=>({keyword:r.keyword,UK:r.average_monthly_searches,US:map.get(r.keyword).average_monthly_searches}));
}
