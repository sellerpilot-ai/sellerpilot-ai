const severity={critical:0,important:1,minor:2};
export function shopSummary(rows,weekly=[]){
 const valid=rows.filter(r=>r&&r.audit&&Number.isFinite(r.audit.score));
 const queue=valid.filter(r=>r.audit.issues.length).map(r=>{const issues=[...r.audit.issues].sort((a,b)=>(severity[a.severity]??3)-(severity[b.severity]??3)||(b.penalty||0)-(a.penalty||0));return {id:r.id,title:r.title,score:r.audit.score,market:r.audit.market,issue:issues[0],issues,count:issues.length,critical:issues.filter(i=>i.severity==='critical').length,history:r.history||[]};}).sort((a,b)=>Number(b.critical>0)-Number(a.critical>0)||a.score-b.score||b.count-a.count||String(a.id).localeCompare(String(b.id)));
 const previous=[...weekly].filter(x=>Number.isFinite(x.average)&&/^\d{4}-\d{2}-\d{2}$/.test(x.week||'')).sort((a,b)=>b.week.localeCompare(a.week))[0]||null;
 const avg=valid.length?Math.round(valid.reduce((s,r)=>s+r.audit.score,0)/valid.length):null;
 return {total:valid.length,average:avg,critical:queue.filter(x=>x.critical).length,review:queue.length,strong:valid.filter(r=>r.audit.score>=85).length,queue,previous,delta:previous&&avg!==null?avg-previous.average:null};
}
export function filterQueue(queue,filter='all',sort='priority',search='',market='',heading=''){
 const term=String(search).trim().toLowerCase();
 const items=queue.filter(x=>(!market||x.market===market)&&(filter==='critical'?x.critical>0:filter==='low'?x.score<70:true)).map(x=>{
  const issues=x.issues||[x.issue];
  const matched=heading?issues.filter(i=>i.heading===heading):issues;
  return matched.length?{...x,issue:matched[0],issues}:null;
 }).filter(x=>x&&(!term||String(x.title).toLowerCase().includes(term)||x.issues.some(i=>String(i.heading).toLowerCase().includes(term))));
 if(sort==='score')items.sort((a,b)=>a.score-b.score||String(a.id).localeCompare(String(b.id)));
 if(sort==='name')items.sort((a,b)=>String(a.title).localeCompare(String(b.title))||String(a.id).localeCompare(String(b.id)));
 return items;
}

// V90–V94: count affected listings, not repeated flags, from current local audits.
export function issueGroups(queue){
 const groups=new Map();
 for(const x of queue){
  const unique=new Map();
  for(const issue of x.issues||[x.issue]){
   const label=typeof issue?.heading==='string'?issue.heading.trim():'';
   if(!label)continue;
   const old=unique.get(label);
   if(!old||(severity[issue.severity]??3)<(severity[old.severity]??3))unique.set(label,issue);
  }
  for(const [label,issue] of unique){
   const g=groups.get(label)||{heading:label,listings:0,critical:0,markets:new Set()};
   g.listings++;if(issue.severity==='critical')g.critical++;
   if(x.market)g.markets.add(x.market);groups.set(label,g);
  }
 }
 return [...groups.values()].map(g=>({...g,markets:[...g.markets].sort()})).sort((a,b)=>b.critical-a.critical||b.listings-a.listings||a.heading.localeCompare(b.heading));
}
export function reviewCSVCell(v){
 return typeof v==='string'&&/^[\s\u0000-\u001f]*[=+\-@]|^[\t\r\n]/u.test(v)?"'"+v:v;
}
