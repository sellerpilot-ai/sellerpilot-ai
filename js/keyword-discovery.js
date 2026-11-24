// Local deterministic keyword discovery. No network, marketplace metrics or invented facts.
const normalize=x=>String(x??'').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const tokens=x=>normalize(x).split(' ').filter(Boolean);
const stop=new Set('a an the and or for of to in on with is are this that it from by as your our you'.split(' '));
const significant=x=>tokens(x).filter(w=>!stop.has(w));
const contains=(text,phrase)=>(' '+normalize(text)+' ').includes(' '+normalize(phrase)+' ');
function intent(phrase){const t=tokens(phrase);if(t.some(x=>['gift','present','birthday','anniversary','wedding','christmas','mother','daughter','father','son','bridesmaid'].includes(x)))return 'Gift / occasion';if(t.some(x=>['personalised','personalized','custom','engraved','initial'].includes(x)))return 'Personalisation';if(t.some(x=>['minimalist','modern','vintage','boho','simple','classic','dainty'].includes(x)))return 'Style';return 'Product / descriptive'}
export function discover(product,seed='',extra=''){
 const title=String(product?.title||'').slice(0,250),description=String(product?.description||'').slice(0,4000),tags=String(product?.tags||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,100);
 const query=normalize(seed).slice(0,120),extras=String(extra).slice(0,500).split(/[,\n]/).map(normalize).filter(Boolean).slice(0,15);
 const map=new Map(),add=(p,source)=>{p=normalize(p);if(!p||p.length>120||tokens(p).length>10||!significant(p).length)return;if(!map.has(p))map.set(p,new Set());map.get(p).add(source)};
 for(const t of tags)add(t,'Existing tag');
 for(const [text,source] of [[title,'Title phrase'],[description,'Description phrase']]){for(const clause of text.split(/[.!?;:\n,]/).slice(0,40)){const w=tokens(clause).slice(0,60);for(let n=2;n<=4;n++)for(let i=0;i+n<=w.length;i++){const part=w.slice(i,i+n);if(!stop.has(part[0])&&!stop.has(part.at(-1))&&part.filter(x=>!stop.has(x)).length>=2)add(part.join(' '),source)}}}
 if(query)add(query,'Your focus phrase');for(const x of extras)add(x,'Your confirmed phrase');
 // Combine only explicit seller-provided modifiers and the seller's own focus phrase.
 if(query)for(const x of extras){if(!contains(query,x)&&!contains(x,query))add(x+' '+query,'Suggested combination — verify wording')}
 const reference=new Set(significant([title,description,...tags].join(' '))),focus=new Set(significant(query)),confirmed=new Set(significant(extras.join(' ')));
 const rows=[...map].map(([phrase,sources])=>{const w=[...new Set(significant(phrase))],coverage={title:contains(title,phrase),description:contains(description,phrase),tag:tags.some(t=>normalize(t)===phrase)};const basis=reference.size?reference:new Set([...focus,...confirmed]);const match=w.filter(x=>basis.has(x)).length/w.length;const focusMatch=focus.size?w.filter(x=>focus.has(x)).length/focus.size:match;const score=Math.round(100*(.6*match+.25*focusMatch+.15*(coverage.title||coverage.description||coverage.tag?1:0)));return{phrase,sources:[...sources],score,intent:intent(phrase),longTail:tokens(phrase).length>=3,tagEligible:Array.from(phrase).length<=20,coverage}});
 rows.sort((a,b)=>b.score-a.score||Number(b.longTail)-Number(a.longTail)||Number(a.coverage.tag)-Number(b.coverage.tag)||a.phrase.localeCompare(b.phrase));
 const counts=new Map();for(const t of tags){const k=normalize(t);if(k)counts.set(k,(counts.get(k)||0)+1)}
 return{rows:rows.slice(0,60),duplicates:[...counts].filter(([,n])=>n>1).map(([phrase,count])=>({phrase,count})),uniqueTags:counts.size,overlength:tags.filter(t=>Array.from(t).length>20),tagCount:tags.length};
}
