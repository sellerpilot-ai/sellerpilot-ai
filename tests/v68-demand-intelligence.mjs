import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../js/demand-intelligence.js',import.meta.url));
const {validateReport,seasonal,relevance,sortRows,compareReports}=await import('data:text/javascript;base64,'+source.toString('base64'));
const report={source:'Google Ads via DataForSEO',region:'UK',retrieved_at:'2026-11-24T12:00:00Z',rows:[
 {keyword:'gold bracelet',average_monthly_searches:120,ads_competition:'HIGH',monthly:[{month:'2026-10',searches:100},{month:'2026-09',searches:0},{month:'2026-08',searches:null},{month:'2026-07',searches:100}]},
 {keyword:'silver bracelet',average_monthly_searches:null,ads_competition:null,monthly:[]},
 {keyword:'gold necklace',average_monthly_searches:0,ads_competition:'UNKNOWN',monthly:[{month:'2026-09',searches:0},{month:'2026-19',searches:200}]}
]};
const uk=validateReport(report);
assert.equal(uk.rows[0].monthly[0].month,'2026-07');
assert.equal(uk.rows[2].monthly.length,1);
assert.equal(uk.rows[2].ads_competition,null);
assert.deepEqual(seasonal(uk.rows[0].monthly),{peak:100,peaks:['2026-07','2026-10'],observed:3});
assert.deepEqual(seasonal([]),{peak:null,peaks:[],observed:0});
assert.equal(seasonal(uk.rows[2].monthly).peak,0);
assert.deepEqual(sortRows(uk.rows,'volume').map(r=>r.keyword),['gold bracelet','gold necklace','silver bracelet']);
const product={title:'Gold Tone Bracelet',description:'Simple bracelet',tags:'bracelet, gold tone'};
assert.equal(relevance(product,'gold bracelet').score,100);
assert.equal(relevance(product,'gold bracelet').exactTitle,false);
assert.equal(relevance(product,'silver bracelet').score,50);
assert.equal(relevance(product,'bracelet').exactTag,true);
assert.equal(relevance(null,'bracelet'),null);
assert.deepEqual(sortRows(uk.rows,'alpha',null,'silver').map(r=>r.keyword),['silver bracelet']);
const us=validateReport({...report,region:'US',rows:[{...report.rows[0],average_monthly_searches:240}]});
assert.deepEqual(compareReports(uk,us),[{keyword:'gold bracelet',UK:120,US:240}]);
assert.deepEqual(compareReports(uk,uk),[]);
assert.throws(()=>validateReport({...report,source:'Etsy'}));
assert.throws(()=>validateReport({...report,rows:[report.rows[0],report.rows[0]]}));
console.log('PASS: source validation, zero/null distinction, ties, chronological history, local word overlap, exact-phrase comparison and sorting.');

assert.throws(()=>validateReport({...report,retrieved_at:0}));
assert.throws(()=>validateReport({...report,rows:[{...report.rows[0],keyword:'gold\nbracelet'}]}));
assert.throws(()=>validateReport({...report,rows:[{...report.rows[0],keyword:'gold\u0000bracelet'}]}));
assert.throws(()=>validateReport({...report,mode:'discover',seeds:['gold\tbracelet']}));
console.log('PASS V100 strict provenance and single-line provider phrase validation');
