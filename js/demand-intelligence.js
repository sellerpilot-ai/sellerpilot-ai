// Pure, local analysis of already retrieved Google Ads data. No provider calls.
const normal=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const stop=new Set('a an the and or of for to in on with by from'.split(' '));
const words=x=>[...new Set(normal(x).split(' ').filter(w=>w&&!stop.has(w)))];
const number=x=>Number.isSafeInteger(x)&&x>=0?x:null;
const monthPattern=/^\d{4}-(0[1-9]|1[0-2])$/;
export function validateReport(r){
 if(r?.source!=='Google Ads via DataForSEO'||!['UK','US'].includes(r.region)||!Number.isFinite(Date.parse(r.retrieved_at))||!Array.isArray(r.rows)||(!r.rows.length&&r.mode!=='discover')||r.rows.length>20)throw Error('Invalid Google demand report.');
 if(r.mode!==undefined&&(r.mode!=='discover'||!Array.isArray(r.seeds)||r.seeds.length!==1||typeof r.seeds[0]!=='string'||!r.seeds[0].trim()||r.seeds[0].length>80))throw Error('Invalid discovery report.');
 const seen=new Set();
 return {source:r.source,region:r.region,retrieved_at:r.retrieved_at,...(r.mode==='discover'?{mode:r.mode,seeds:r.seeds.slice()}:{}),rows:r.rows.map(x=>{
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
 const maximum=Math.max(0,...rows.map(r=>number(r.average_monthly_searches)??0));
 const term=normal(filter),arr=rows.filter(r=>!term||normal(r.keyword).includes(term)).map(row=>({...row,season:seasonal(row.monthly),relevance:relevance(product,row.keyword),opportunity:opportunity(row,product,maximum)}));
 const descending=(a,b)=>a===null?b===null?0:1:b===null?-1:b-a;
 return arr.sort((a,b)=>(sort==='alpha'?0:sort==='opportunity'?descending(a.opportunity.score,b.opportunity.score):sort==='peak'?descending(a.season.peak,b.season.peak):sort==='relevance'?descending(a.relevance?.score??null,b.relevance?.score??null)||descending(a.average_monthly_searches,b.average_monthly_searches):descending(a.average_monthly_searches,b.average_monthly_searches))||a.keyword.localeCompare(b.keyword));
}
export function compareReports(a,b){
 if(!a||!b||a.region===b.region||a.mode!==b.mode||a.mode==='discover'&&JSON.stringify(a.seeds)!==JSON.stringify(b.seeds))return [];
 const uk=a.region==='UK'?a:b,us=a.region==='US'?a:b;
 const map=new Map(us.rows.map(r=>[r.keyword,r]));
 return uk.rows.filter(r=>map.has(r.keyword)).map(r=>({keyword:r.keyword,UK:r.average_monthly_searches,US:map.get(r.keyword).average_monthly_searches}));
}

/* V70: review priority, not a marketplace prediction. No network or storage. */
const materialPhrases=['solid gold','gold plated','gold filled','sterling silver','solid silver','white gold','rose gold','14k','18k','24k','diamond','platinum'];
const brandPhrases=['van cleef','cartier','tiffany','pandora','swarovski','bvlgari','bulgari'];
const containsPhrase=(text,phrase)=>(' '+normal(text)+' ').includes(' '+normal(phrase)+' ');
export function opportunity(row,product,maximum){
 const coverage=relevance(product,row.keyword);
 const basis=product?[product.title,product.description,product.tags].join(' '):'';
 const warnings=[];
 if(brandPhrases.some(p=>containsPhrase(row.keyword,p)))warnings.push('Potential brand reference; verify authorisation and accuracy.');
 if(materialPhrases.some(p=>containsPhrase(row.keyword,p)&&!containsPhrase(basis,p)))warnings.push('Material or purity wording not confirmed by listing text.');
 if(containsPhrase(row.keyword,'solid gold')&&['gold plated','gold filled'].some(p=>containsPhrase(basis,p)))warnings.push('Possible solid gold versus plated or filled mismatch.');
 const volume=number(row.average_monthly_searches);
 const demand=volume===null||!Number.isFinite(maximum)||maximum<=0?null:Math.round(100*Math.log1p(volume)/Math.log1p(Math.max(maximum,volume)));
 const score=coverage&&demand!==null?Math.round(.7*coverage.score+.3*demand):null;
 const known=row.monthly.filter(m=>number(m.searches)!==null);
 const mean=known.length?known.reduce((s,m)=>s+m.searches,0)/known.length:0;
 const seasonalSignal=known.length>=6&&mean>0&&Math.max(...known.map(m=>m.searches))>=1.5*mean;
 return {score,demand,warnings,longTail:words(row.keyword).length>=3,seasonalSignal,reviewCandidate:!!(coverage&&coverage.score===100&&!coverage.exactTag&&coverage.tagEligible&&!warnings.length)};
}

export function filterOpportunities(rows, mode='all') {
 return rows.filter(r=>mode==='long'?r.opportunity.longTail:mode==='seasonal'?r.opportunity.seasonalSignal:mode==='warnings'?r.opportunity.warnings.length>0:mode==='candidates'?r.opportunity.reviewCandidate:true);
}

export function researchExportRows(report,rows){
 const safe=v=>typeof v==='string'&&/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/u.test(v)?"'"+v:v??'';
 return rows.map(r=>[r.keyword,report.source,report.region,report.retrieved_at,r.average_monthly_searches,r.ads_competition,r.relevance?.score,r.opportunity.score,r.opportunity.seasonalSignal,r.opportunity.warnings.join('; ')].map(safe));
}

export function previewResearchTag(product,phrase){
 if(!product||typeof phrase!=='string'||!phrase.trim()||phrase.includes(','))return null;
 const candidate=phrase.trim();
 const tags=String(product.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
 if(tags.length>=13||!opportunity({keyword:candidate,average_monthly_searches:null,monthly:[]},product,0).reviewCandidate)return null;
 return {before:String(product.tags||''),after:[...tags,candidate].join(', '),candidate};
}
