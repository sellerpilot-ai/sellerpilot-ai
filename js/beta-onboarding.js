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
 {label:'Build your research library',done:!!workspace?.keywords?.length,detail:'Discover relevant phrases and explicitly save one to your research library.',action:'keywords'},
 {label:'Save a shop health baseline',done:!!workspace?.weekly?.length,detail:'Save a weekly health report to compare your catalogue over time.',action:'reports'}
 ];
}
const link=(label,action)=>'<button type="button" class="button secondary sm" data-v61-go="'+action+'">'+label+'</button>';
export function v61Reset(){if($('v61-checklist'))$('v61-checklist').replaceChildren();if($('v61-start-status'))$('v61-start-status').textContent='Sign in to see your setup progress.';if($('v61-start'))$('v61-start').open=false}
export function v61Render(){
 const root=$('v61-checklist');if(!root)return;if(!state.ready||!state.uid){v61Reset();return}
 const steps=v61Checklist(state.products,v19Store.loaded?v19Store.data:null),done=steps.filter(s=>s.done).length;
 $('v61-start-status').textContent=done+' of '+steps.length+' setup milestones · '+(v19Store.loaded?'Synced workspace':'Research sync unavailable');
 root.innerHTML=steps.map((s,i)=>'<div class="v61-step"><span class="v61-number" aria-hidden="true">'+(s.done?'✓':i+1)+'</span><div><b>'+esc(s.label)+'</b><span class="mini">'+(s.done?'Completed · ':'')+esc(s.detail)+'</span></div>'+link(s.done?'Revisit':'Open',s.action)+'</div>').join('');
}
export function v61Init(){
 const home=$('view-overview');if(!home)return;
 home.insertAdjacentHTML('afterbegin','<details class="card v61-start" id="v61-start"><summary><b>Getting started</b><span id="v61-start-status" class="mini"></span></summary><p class="mini">Follow these milestones at your own pace. Completion reflects saved catalogue and research records, not external marketplace activity.</p><div id="v61-checklist"></div><div class="v61-help-links"><a class="button ghost sm" href="./demo.html?v=61">Try fictional sample shop</a><a class="button ghost sm" href="./help.html">Help &amp; tutorials</a>'+link('Explore tools','research')+'</div></details>');
 const settings=$('view-settings');settings?.insertAdjacentHTML('afterbegin','<section class="card v61-help"><h2>Help &amp; private beta</h2><p class="mini">Start with the interactive sample shop or step-by-step guides. Public registration and real payments remain unavailable.</p><div class="v61-help-links"><a class="button secondary sm" href="./help.html">Help centre</a><a class="button ghost sm" href="./demo.html?v=61">Sample shop</a><a class="button ghost sm" href="./home.html#pricing">Preview plans</a><button type="button" class="button ghost sm" data-v61-feedback>Prepare feedback</button></div></section>');
 document.addEventListener('click',e=>{const b=e.target.closest('[data-v61-go],[data-v61-feedback]');if(!b||!state.ready||!state.uid)return;if(b.hasAttribute('data-v61-feedback')){$('v32-beta')?.scrollIntoView({block:'start'});$('v32-area')?.focus();return}const action=b.dataset.v61Go;if(action==='audit'){const p=[...state.products].sort((a,b)=>productQuality(a).score-productQuality(b).score)[0];if(p)editProduct(p.id);else chosenView('products');return}if(['products','keywords','reports','research'].includes(action))chosenView(action)});
 v61Reset();
}
