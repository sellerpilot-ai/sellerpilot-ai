import assert from 'node:assert/strict';
import {previewResearchTag,researchActionKeyword,researchExportRows,sortRows,opportunity,filterOpportunities} from '../js/demand-intelligence.js';
const product={title:'Gold plated bracelet',description:'Gold plated chain bracelet',tags:'bracelet'};
const row=(keyword,volume=100,monthly=[])=>({keyword,average_monthly_searches:volume,monthly});
assert.equal(opportunity(row('gold bracelet'),product,100).score,100);
assert.equal(opportunity(row('gold bracelet'),null,100).score,null);
assert.equal(opportunity(row('gold bracelet',null),product,100).score,null);
assert.equal(opportunity(row('solid gold bracelet'),product,100).reviewCandidate,false);
assert.ok(opportunity(row('solid gold bracelet'),product,100).warnings.length);
assert.ok(opportunity(row('cartier bracelet'),product,100).warnings.length);
assert.equal(opportunity(row('gold plated bracelet'),product,100).longTail,true);
assert.equal(opportunity(row('gold bracelet',100,[{searches:100}]),product,100).seasonalSignal,false);
const rows=[row('gold bracelet',100),row('chain bracelet',10)];
assert.equal(sortRows(rows,'volume',product,'chain')[0].opportunity.demand,Math.round(100*Math.log1p(10)/Math.log1p(100)));


const ranked=sortRows([row('cartier bracelet'),row('gold plated bracelet'),row('gold bracelet',null)],'opportunity',product);
assert.equal(ranked[0].keyword,'gold plated bracelet');
assert.equal(ranked.at(-1).opportunity.score,null);
assert.equal(filterOpportunities(ranked,'long').length,1);
assert.equal(filterOpportunities(ranked,'warnings')[0].keyword,'cartier bracelet');
assert.equal(filterOpportunities(ranked,'seasonal').length,0);
assert.equal(filterOpportunities(ranked,'all').length,3);

const seasonalRows=sortRows([row('chain bracelet',100,[10,10,10,10,10,100].map((searches,i)=>({month:`2026-0${i+1}`,searches}))),row('bracelet')],'opportunity',product);
assert.equal(filterOpportunities(seasonalRows,'seasonal').length,1);
assert.equal(filterOpportunities(seasonalRows,'candidates')[0].keyword,'chain bracelet');
assert.equal(filterOpportunities(seasonalRows,'candidates').length,1);
console.log('PASS V70 local opportunity fixtures');

const report={source:'Google Ads via DataForSEO',region:'UK',retrieved_at:'2026-11-25T00:00:00Z'};
const exportRows=sortRows([row('=1+1'),row('  @SUM(1)'),row('bracelet',0)],'alpha',product);
const exported=researchExportRows(report,exportRows);
assert.equal(exported.length,3);
assert.ok(exported.some(r=>r[0]==="'=1+1"));
assert.ok(exported.some(r=>r[0]==="'  @SUM(1)"));
assert.ok(exported.every(r=>r[1]===report.source&&r[2]==='UK'&&r[3]===report.retrieved_at));
assert.equal(exported.find(r=>r[0]==='bracelet')[4],0);
assert.deepEqual(researchExportRows(report,[]),[]);
assert.equal(researchExportRows(report,exportRows.slice(0,1)).length,1);
console.log('PASS V71 export row fixtures');

assert.deepEqual(previewResearchTag(product,'gold bracelet'),{before:'bracelet',after:'bracelet, gold bracelet',candidate:'gold bracelet'});
assert.equal(previewResearchTag(product,'bracelet'),null);
assert.equal(previewResearchTag(product,'solid gold bracelet'),null);
assert.equal(previewResearchTag(product,'cartier bracelet'),null);
assert.equal(previewResearchTag(product,'gold, bracelet'),null);
assert.equal(previewResearchTag({...product,tags:Array.from({length:13},(_,i)=>'tag'+i).join(',')},'gold bracelet'),null);
assert.equal(previewResearchTag(product,'gold plated chain bracelet'),null);
assert.equal(previewResearchTag(null,'gold bracelet'),null);
assert.equal(product.tags,'bracelet');
console.log('PASS V72 tag preview fixtures');

const activeReport={rows:[{keyword:'gold bracelet'}]};
for(const key of ['v68Trend','v68Save','v68Audit','v72Tag'])assert.equal(researchActionKeyword(activeReport,{[key]:'gold bracelet'}),'gold bracelet');
assert.equal(researchActionKeyword(activeReport,{v72Tag:'unknown'}),null);
assert.equal(researchActionKeyword(activeReport,{v72Tag:'gold bracelet',v68Save:'gold bracelet'}),null);
assert.equal(researchActionKeyword(activeReport,{}),null);
assert.equal(researchActionKeyword(null,{v72Tag:'gold bracelet'}),null);
assert.equal(previewResearchTag(product,'gold\nbracelet'),null);
assert.equal(previewResearchTag({...product,attributes:{sellerpilot:{market:'Amazon'}}},'gold bracelet'),null);
console.log('PASS V72 research action routing and marketplace safety fixtures');
