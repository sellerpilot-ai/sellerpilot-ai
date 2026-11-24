const severity={critical:0,important:1,minor:2};
export function shopSummary(rows,weekly=[]){
 const valid=rows.filter(r=>r&&r.audit&&Number.isFinite(r.audit.score));
 const queue=valid.filter(r=>r.audit.issues.length).map(r=>{const issues=[...r.audit.issues].sort((a,b)=>(severity[a.severity]??3)-(severity[b.severity]??3)||(b.penalty||0)-(a.penalty||0));return {id:r.id,title:r.title,score:r.audit.score,market:r.audit.market,issue:issues[0],count:issues.length,critical:issues.filter(i=>i.severity==='critical').length,history:r.history||[]};}).sort((a,b)=>Number(b.critical>0)-Number(a.critical>0)||a.score-b.score||b.count-a.count||String(a.id).localeCompare(String(b.id)));
 const previous=[...weekly].filter(x=>Number.isFinite(x.average)&&/^\d{4}-\d{2}-\d{2}$/.test(x.week||'')).sort((a,b)=>b.week.localeCompare(a.week))[0]||null;
 const avg=valid.length?Math.round(valid.reduce((s,r)=>s+r.audit.score,0)/valid.length):null;
 return {total:valid.length,average:avg,critical:queue.filter(x=>x.critical).length,review:queue.length,strong:valid.filter(r=>r.audit.score>=85).length,queue,previous,delta:previous&&avg!==null?avg-previous.average:null};
}
export function filterQueue(queue,filter='all',sort='priority',search=''){
 const term=String(search).trim().toLowerCase();
 const items=queue.filter(x=>(filter==='critical'?x.critical>0:filter==='low'?x.score<70:true)&&(!term||String(x.title).toLowerCase().includes(term)||String(x.issue.heading).toLowerCase().includes(term)));
 if(sort==='score')items.sort((a,b)=>a.score-b.score||String(a.id).localeCompare(String(b.id)));
 if(sort==='name')items.sort((a,b)=>String(a.title).localeCompare(String(b.title))||String(a.id).localeCompare(String(b.id)));
 return items;
}
