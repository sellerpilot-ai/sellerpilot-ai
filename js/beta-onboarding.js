import {$,esc,state} from './core.js';
import {chosenView} from './ui.js';
import {editProduct} from './product-editor.js';
import {getAuditHistory,productQuality} from './audit.js';
import {v19Store} from './workspace.js';

export function v61Checklist(products,workspace){
 const count=products.length, audits=products.reduce((n,p)=>n+getAuditHistory(p).length,0);
 return [
 {label:'Add or import your listings',done:count>0,detail:count?count+' saved listing(s)':'Use Products to add a listing or preview a compatible CSV.',action:'products'},
 {label:'Review your listing quality',done:audits>0,detail:audits?audits+' saved audit snapshot(s)':'Open a listing, analyse it and save an audit snapshot.',action:'audit'},
 {label:'Build your research library',done:!!workspace?.keywords?.length,detail:workspace?'Discover relevant phrases and explicitly save one to your research library.':'Research sync unavailable. Refresh before saving research.',action:'keywords'},
 {label:'Save a shop health baseline',done:!!workspace?.weekly?.length,detail:workspace?'Save a weekly health report to compare your catalogue over time.':'Research sync unavailable. Refresh before saving a report.',action:'reports'}
 ];
}
// Static directory: opening a tool never starts a provider request or changes a listing.
const tools=[
 {id:'products',name:'Products',detail:'Add listings or preview a catalogue CSV.',kind:'Local review',terms:'import upload catalogue'},
 {id:'audit',name:'Listing quality audit',detail:'Review a saved listing and its improvement plan.',kind:'Local review',terms:'SEO listing optimisation score tags'},
 {id:'bulk',name:'Bulk Audit',detail:'Compare listing quality across your catalogue.',kind:'Local review',terms:'catalogue score batch'},
 {id:'assistant',name:'Shop Assistant',detail:'Prioritise recurring listing issues and next actions.',kind:'Local review',terms:'catalogue quality review queue recurring findings shop health'}, 
 {id:'keywords',name:'Keyword Lab',detail:'Discover local ideas, plan tags and optionally research Google demand when enabled.',kind:'Local + gated research',terms:'SEO search volume keywords tags research'},
 {id:'research',name:'Research Hub',detail:'Organise saved keyword notes and research.',kind:'Private workspace',terms:'library notebook saved'},
 {id:'competitors',name:'Competitor Notebook',detail:'Compare manually supplied, authorised observations.',kind:'Local review',terms:'competition price comparison'},
 {id:'profits',name:'Profit Planner',detail:'Estimate contribution using your own costs and fees.',kind:'Local calculation',terms:'margin money fees pricing calculator'},
 {id:'tasks',name:'Review Tasks',detail:'Organise listing improvements and mark completed work.',kind:'Private workspace',terms:'action centre checklist'},
 {id:'reports',name:'Reports',detail:'Review weekly catalogue quality and export reports.',kind:'Private workspace',terms:'progress history analytics'},
 {id:'ai',name:'AI Studio',detail:'Check separately gated AI writing availability and consent.',kind:'Gated service',terms:'description title writing'},
 {id:'image',name:'Image Intelligence',detail:'Check separately gated image analysis availability and consent.',kind:'Gated service',terms:'photos image listing pictures'},
 {id:'shop',name:'Analyse a Shop',detail:'Use your own listings or CSV; limited owner-only Etsy preview is separately gated.',kind:'Gated integration',terms:'Etsy marketplace shop link import'},
 {id:'settings',name:'Settings & Account',detail:'Manage preferences, privacy information and beta feedback.',kind:'Account',terms:'help support privacy account'}
];
export function findTools(query=''){
 const words=String(query).trim().toLowerCase().split(/\s+/).filter(Boolean).slice(0,12);
 return tools.filter(t=>words.every(w=>(t.name+' '+t.detail+' '+t.terms+' '+t.kind).toLowerCase().includes(w)));
}
function drawTools(){
 const root=$('v95-tools'),input=$('v95-search');if(!root||!input||!state.ready||!state.uid)return;
 const rows=findTools(input.value);
 $('v95-tool-count').textContent=rows.length+(rows.length===1?' tool found':' tools found');
 root.innerHTML=rows.map(t=>'<div class="v19-entry"><div class="row" style="flex-wrap:wrap"><b>'+esc(t.name)+'</b><span class="pill">'+esc(t.kind)+'</span></div><p class="mini">'+esc(t.detail)+'</p>'+link('Open '+esc(t.name),t.id)+'</div>').join('')||'<p class="mini">No matching tools. Try keyword, profit, audit or reports, or clear the search.</p>';
}
const link=(label,action)=>'<button type="button" class="button secondary sm" data-v61-go="'+action+'">'+label+'</button>';
let owner=null;
export function v61Reset(){owner=null;if($('v61-checklist'))$('v61-checklist').replaceChildren();if($('v61-start-status'))$('v61-start-status').textContent='Sign in to see your setup progress.';if($('v61-start'))$('v61-start').open=false;if($('v95-search'))$('v95-search').value='';if($('v95-tools'))$('v95-tools').replaceChildren();if($('v95-tool-count'))$('v95-tool-count').textContent='';if($('v95-directory'))$('v95-directory').open=false;if($('v96-next'))$('v96-next').replaceChildren()}
export function v61Render(){
 const root=$('v61-checklist');if(!root)return;if(!state.ready||!state.uid){v61Reset();return}
 if(owner!==state.uid){owner=state.uid;if($('v61-start'))$('v61-start').open=state.products.length===0;}
 $('yuvilist-first-run').hidden=state.products.length!==0;
 const steps=v61Checklist(state.products,v19Store.loaded?v19Store.data:null),done=steps.filter(s=>s.done).length;
 $('v61-start-status').textContent=done+' of '+steps.length+' setup milestones · '+(v19Store.loaded?'Synced workspace':'Research sync unavailable');
 const next=steps.find(s=>!s.done);$('v96-next').innerHTML=next&&!v19Store.loaded&&['keywords','reports'].includes(next.action)?'<b>Research sync unavailable.</b> Open Settings &amp; Account and refresh your cloud workspace. '+link('Open settings','settings'):next?'<b>Suggested next step:</b> '+esc(next.label)+' '+link('Continue setup',next.action):'<b>Setup milestones complete.</b> Review saved progress or open a tool for your next task. '+link('Review shop progress','reports');drawTools();
 root.innerHTML=steps.map((s,i)=>'<div class="v61-step"><span class="v61-number" aria-hidden="true">'+(s.done?'✓':i+1)+'</span><div><b>'+esc(s.label)+'</b><span class="mini">'+(s.done?'Completed · ':'')+esc(s.detail)+'</span></div>'+link(s.done?'Revisit':'Open',s.action)+'</div>').join('');
}
export function v61Init(){
 const home=$('view-overview');if(!home)return;
 home.querySelector('.v22-home-top').insertAdjacentHTML('afterend','<details class="card v61-start" id="v61-start"><summary><b>Getting started</b><span id="v61-start-status" class="mini"></span></summary><p class="mini">Follow these milestones at your own pace. Completion reflects saved catalogue and research records, not external marketplace activity.</p><div id="yuvilist-first-run" class="note" hidden><b>Choose how to start</b><p class="mini">Start with the fictional sample to practise an audit and import rehearsal, or use information you own. No marketplace connection or paid request is required.</p><div class="v61-help-links"><a class="button secondary sm" href="./demo.html">Try sample shop</a>'+link('Import a CSV','products')+link('Add a listing','new-listing')+'</div></div><div class="note" id="v96-next" style="margin:12px 0"></div><div id="v61-checklist"></div><div class="v61-help-links"><a class="button ghost sm" href="./demo.html?v=64">Try fictional sample shop</a><a class="button ghost sm" href="./help.html">Help &amp; tutorials</a>'+link('Explore tools','directory')+'</div></details>');
 home.querySelector('.v22-home-top').insertAdjacentHTML('afterend','<details class="card" id="v95-directory" style="margin-bottom:18px"><summary><b>Find a tool</b></summary><p class="mini">Search by your goal. Opening a tool does not start a paid request or connect a marketplace.</p><div class="field"><label for="v95-search">Search tools</label><input type="search" id="v95-search" maxlength="100" placeholder="e.g. tags, profit, reports"></div><div class="v61-help-links"><button type="button" class="button ghost sm" id="v95-clear">Clear search</button></div><p class="mini" id="v95-tool-count" role="status"></p><div id="v95-tools" class="stack"></div></details>');
 $('v95-search').addEventListener('input',drawTools);$('v95-clear').onclick=()=>{if(!state.ready||!state.uid)return;$('v95-search').value='';drawTools();$('v95-search').focus()};
 const settings=$('view-settings');settings?.querySelector('.section-header')?.insertAdjacentHTML('afterend','<section class="card v61-help"><h2>Help &amp; private beta</h2><p class="mini">Start with the interactive sample shop or step-by-step guides. Public registration and real payments remain unavailable.</p><div class="v61-help-links">'+link('Open Shop Assistant','assistant')+link('Find a tool','directory')+'<a class="button secondary sm" href="./help.html">Help centre</a><a class="button ghost sm" href="./help.html#support">Troubleshoot a problem</a><a class="button ghost sm" href="./demo.html?v=64">Sample shop</a><a class="button ghost sm" href="./index.html#pricing">Preview plans</a><button type="button" class="button ghost sm" data-v61-feedback>Prepare feedback</button></div></section>');
 document.addEventListener('click',e=>{const b=e.target.closest('[data-v61-go],[data-v61-feedback]');if(!b||!state.ready||!state.uid)return;if(b.hasAttribute('data-v61-feedback')){$('v32-beta')?.scrollIntoView({block:'start'});$('v32-area')?.focus();return}const action=b.dataset.v61Go;if(action==='new-listing'){chosenView('intelligence');$('new-draft')?.click();$('edit-title')?.focus();return}if(action==='directory'){chosenView('overview');const directory=$('v95-directory'),search=$('v95-search');if(directory&&search&&state.ready&&state.uid){directory.open=true;search.value='';drawTools();search.focus({preventScroll:true});directory.scrollIntoView({block:'start'});}return}if(action==='assistant'){chosenView('overview');const target=$('v60-assistant');if(target&&state.ready){const heading=target.querySelector('h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true})}target.scrollIntoView({block:'start'});}return}if(action==='audit'){const p=[...state.products].sort((a,b)=>productQuality(a).score-productQuality(b).score)[0];if(p)editProduct(p.id);else chosenView('products');return}if(tools.some(t=>t.id===action)&&action!=='audit')chosenView(action)});
 v61Reset();
}
