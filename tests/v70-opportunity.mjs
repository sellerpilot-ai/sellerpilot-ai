import assert from 'node:assert/strict';
import {sortRows,opportunity,filterOpportunities} from '../js/demand-intelligence.js';
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
