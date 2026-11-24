// Local deterministic keyword discovery. No search-volume, competition or sales data.
const normalize=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const tokens=x=>normalize(x).split(' ').filter(Boolean);
const stop=new Set('a an the and or for of to in on with is are this that it from by as your our you includes suitable ideal made use using'.split(' '));
const significant=x=>tokens(x).filter(w=>!stop.has(w));
const contains=(text,phrase)=>(' '+normalize(text)+' ').includes(' '+normalize(phrase)+' ');
const weakStart=new Set('tone plated filled coated finish style inspired colour color wear everyday ml cm mm inches inch'.split(' '));
const weakEnd=new Set('tone plated filled coated finish inspired everyday colour color suitable ideal made printed reusable simple minimalist personalised personalized custom'.split(' '));
const connective=new Set(['for','with','of','in','on','and','or','to','from']);
function intent(phrase){const t=tokens(phrase);if(t.some(x=>['gift','present','birthday','anniversary','wedding','christmas','mother','daughter','father','son','bridesmaid'].includes(x)))return 'Gift / occasion';if(t.some(x=>['personalised','personalized','custom','engraved','initial'].includes(x)))return 'Personalisation';if(t.some(x=>['minimalist','modern','vintage','boho','simple','classic','dainty'].includes(x)))return 'Style';return 'Product / descriptive'}
function clauses(text){return text.split(/[.!?;:\n,|]/).slice(0,40).map(x=>tokens(x).slice(0,60)).filter(x=>x.length)}
export function discover(product,seed='',extra=''){
 const title=String(product?.title||'').slice(0,250),description=String(product?.description||'').slice(0,4000),tags=String(product?.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100);
 const query=normalize(seed).slice(0,120),extras=String(extra).slice(0,500).split(/[,\n]/).map(normalize).filter(Boolean).slice(0,15);
 const titleClauses=clauses(title),titleWords=new Set(significant(title));
 // Conservative product anchors from title clause heads and words shared with explicit tags.
 const heads=new Set(titleClauses.map(w=>w.slice(0,w.findIndex(t=>connective.has(t))<0?w.length:w.findIndex(t=>connective.has(t))).at(-1)).filter(x=>x&&!weakEnd.has(x)&&!stop.has(x)));
 for(const t of tags){const w=significant(t).at(-1);if(w&&titleWords.has(w)&&!weakEnd.has(w))heads.add(w)}
 const map=new Map(),add=(p,source)=>{p=normalize(p);if(!p||p.length>120||tokens(p).length>10||!significant(p).length)return;if(!map.has(p))map.set(p,new Set());map.get(p).add(source)};
 for(const t of tags)add(t,'Existing tag');
 for(const [parts,source] of [[titleClauses,'Title phrase'],[clauses(description),'Description phrase']]){
  for(const w of parts)for(let n=2;n<=6;n++)for(let i=0;i+n<=w.length;i++){
   const part=w.slice(i,i+n),first=part[0],last=part.at(-1),end=i+n;
   if(stop.has(first)||stop.has(last)||weakStart.has(first)||weakEnd.has(last)||significant(part.join(' ')).length<2)continue;
   if(!part.some(x=>heads.has(x)))continue;
   if(!heads.has(last)&&end!==w.length)continue;
   if(i>0&&connective.has(w[i-1])&&!heads.has(last))continue;
   if(part.some((x,j)=>connective.has(x)&&(j===0||j===part.length-1||connective.has(part[j+1]))))continue;
   add(part.join(' '),source);
  }
 }
 if(query)add(query,'Your focus phrase');for(const x of extras)add(x,'Your confirmed phrase');
 if(query)for(const x of extras){if(!contains(query,x)&&!contains(x,query))add(x+' '+query,'Suggested combination — verify wording')}
 const reference=new Set(significant([title,description,...tags].join(' '))),focus=new Set(significant(query)),confirmed=new Set(significant(extras.join(' ')));
 const rows=[...map].map(([phrase,sources])=>{
  const w=[...new Set(significant(phrase))],coverage={title:contains(title,phrase),description:contains(description,phrase),tag:tags.some(t=>normalize(t)===phrase)};
  const basis=reference.size?reference:new Set([...focus,...confirmed]),match=w.filter(x=>basis.has(x)).length/w.length;
  const focusMatch=focus.size?w.filter(x=>focus.has(x)).length/focus.size:0;
  const anchored=w.some(x=>heads.has(x)),sourceList=[...sources],explicit=sources.has('Your focus phrase')||sources.has('Your confirmed phrase');
  const evidence=coverage.title?1:coverage.tag?.9:coverage.description?.75:explicit?.65:.45;
  const specificity=w.length===1?.35:w.length===2?.75:w.length===3?1:w.length<=5?.85:.6;
  const context=focus.size?focusMatch:anchored?.85:explicit?.65:.25;
  let score=Math.round(100*(.40*match+.25*context+.20*evidence+.15*specificity));
  if(query&&phrase===query&&coverage.title&&match===1)score=100;else score=Math.min(95,score);
  const tagEligible=Array.from(phrase).length<=20;
  const opportunity=coverage.tag?'Already tagged':!tagEligible?'Longer phrase':anchored&&w.length>=2&&score>=70?'Review tag candidate':explicit?'Seller-supplied idea':'Review relevance';
  return{phrase,sources:sourceList,score,intent:intent(phrase),longTail:tokens(phrase).length>=3,tagEligible,coverage,opportunity};
 });
 rows.sort((a,b)=>b.score-a.score||Number(a.coverage.tag)-Number(b.coverage.tag)||Number(b.tagEligible)-Number(a.tagEligible)||a.phrase.localeCompare(b.phrase));
 const counts=new Map();for(const t of tags){const k=normalize(t);if(k)counts.set(k,(counts.get(k)||0)+1)}
 return{rows:rows.slice(0,60),duplicates:[...counts].filter(([,n])=>n>1).map(([phrase,count])=>({phrase,count})),uniqueTags:counts.size,overlength:tags.filter(t=>Array.from(t).length>20),tagCount:tags.length};
}
