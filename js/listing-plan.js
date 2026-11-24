// Local action planning. Audit penalties are completeness signals, not sales impact.
const rank={critical:0,important:1,minor:2};
const fields={'edit-title':'Title','edit-description':'Description','edit-tags':'Tags','edit-materials':'Materials','edit-dimensions':'Size','edit-price':'Price','edit-focus':'Focus keyword'};
export function buildPlan(audit,baseline,keywordData,observation){
 const issues=Array.isArray(audit?.issues)?audit.issues:[],groups=new Map();
 for(const i of issues){if(!fields[i.field])continue;let g=groups.get(i.field);if(!g){g={field:i.field,label:fields[i.field],severity:i.severity,points:0,findings:[]};groups.set(i.field,g)}if((rank[i.severity]??3)<(rank[g.severity]??3))g.severity=i.severity;g.points+=Number.isFinite(i.penalty)?i.penalty:0;g.findings.push({heading:i.heading,detail:i.detail,severity:i.severity,penalty:i.penalty});}
 const actions=[...groups.values()].sort((a,b)=>(rank[a.severity]??3)-(rank[b.severity]??3)||b.points-a.points||a.field.localeCompare(b.field));
 for(const a of actions)a.findings.sort((x,y)=>(rank[x.severity]??3)-(rank[y.severity]??3)||(y.penalty||0)-(x.penalty||0));
 const keywords=audit.market==='Etsy'&&keywordData?keywordData.rows.filter(r=>r.tagEligible&&!r.coverage.tag&&r.score>=60&&(r.coverage.title||r.coverage.description)&&r.phrase.split(' ').length>=2).slice(0,4).map(r=>({phrase:r.phrase,source:r.coverage.title?'Title':'Description',score:r.score})):[]; 
 const slots=audit.market==='Etsy'&&keywordData?Math.max(0,13-keywordData.tagCount):null;
 const cleared=baseline?baseline.issues.filter(i=>!issues.some(j=>j.heading===i.heading&&j.field===i.field)).length:null;
 const progress=baseline?{savedScore:baseline.score,currentScore:audit.score,change:audit.score-baseline.score,cleared,total:baseline.issues.length}:null;
 let price=null;
 if(observation&&Number.isFinite(observation.difference)&&['GBP','USD'].includes(observation.currency)&&/^\d{4}-\d{2}-\d{2}$/.test(observation.date)){
 const delta=observation.difference;
 price={...observation,advice:delta<0?'Your item price is lower. Review costs and margin before changing it.':delta>0?'Your item price is higher. Check whether verified features, service or packaging justify the difference.':'The observed item prices match. Review margin, delivery, quantity and variants separately.'};
 }
 return {actions,keywords,slots,progress,price,score:audit.score,issueCount:issues.length};
}
