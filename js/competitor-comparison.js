// V58: compare independently supplied observations only. No marketplace requests.
const norm=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const phrases=x=>[...new Set(String(x??'').slice(0,3000).split(/[,\n]/).map(norm).filter(Boolean))].slice(0,60);
const amount=x=>{if(x===null||x===undefined||String(x).trim()==='')return null;const n=Number(x);return Number.isFinite(n)&&n>=0&&n<=1000000?Math.round(n*100):null};
const has=(text,phrase)=>(' '+norm(text)+' ').includes(' '+phrase+' ');
export function compareListings(own,rival){
 if(!own||!rival||!String(own.title||'').trim()||!String(rival.title||'').trim())throw Error('Choose your product and enter an observed competitor title.');
 const a=amount(own.price),b=amount(rival.price),same=['GBP','USD','EUR','CAD','AUD'].includes(own.currency)&&own.currency===rival.currency;
 const price={own:a===null?null:a/100,rival:b===null?null:b/100,ownCurrency:own.currency,rivalCurrency:rival.currency,difference:same&&a!==null&&b!==null?(a-b)/100:null,percentage:same&&a!==null&&b>0?Math.round((a-b)/b*1000)/10:null};
 const ownTags=phrases(own.tags),known=rival.tagsKnown===true,rivalTags=known?phrases(rival.tags):[];
 const shared=known?rivalTags.filter(t=>ownTags.includes(t)):[];
 const gaps=known?rivalTags.filter(t=>!ownTags.includes(t)).map(phrase=>({phrase,ownTitle:has(own.title,phrase),ownDescription:has(own.description,phrase),tagEligible:Array.from(phrase).length<=20})):[];
 const ownOnly=known?ownTags.filter(t=>!rivalTags.includes(t)):[];
 const facts=phrases(own.facts),rivalFacts=phrases(rival.facts),distinct=facts.filter(t=>!rivalFacts.includes(t));
 const recommendations=[];
 if(price.difference!==null&&price.difference>0)recommendations.push('Your observed price is higher. Check whether verified materials, features, service or packaging justify the difference; do not assume lowering price improves sales.');
 if(price.difference!==null&&price.difference<0)recommendations.push('Your observed price is lower. Review your costs and margin before changing price.');
 if(price.difference===null)recommendations.push('No comparable price difference: supply both prices in the same currency. Check delivery, tax, variants and quantity separately.');
 if(known&&gaps.length)recommendations.push('Review missing exact tags for relevance and factual accuracy. Do not copy another listing or use unsupported claims.');
 if(!known)recommendations.push('Competitor tags were not supplied; keyword gaps cannot be assessed.');
 if(distinct.length)recommendations.push('Review your confirmed features that were not recorded in this observation. Absence in the notes does not establish a unique selling point.');
 return {price,known,ownTags,rivalTags,shared,gaps,ownOnly,distinct,recommendations};
}
