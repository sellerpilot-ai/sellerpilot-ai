import { $, esc, norm, tagList, state, toast } from './core.js';
import { productAudit, productQuality, analyseProduct } from './audit.js';
import { readEditor, editProduct, updateTitleHint, saveProduct } from './product-editor.js';

/* SellerPilot v23 — Guided listing improvements. Never generates unverified product claims.
   All preview/apply actions modify the editor only, never the marketplace or database. */
export const v23={sourceId:null,baseline:0,originalIssues:[],selectedField:'',selectedHeading:'',undo:null,notice:'',saved:false};
export function v23ClearGuide(){
 v23.sourceId=null;v23.baseline=0;v23.originalIssues=[];v23.selectedField='';v23.selectedHeading='';v23.undo=null;v23.notice='';v23.saved=false;
 const panel=document.getElementById('v23-guide');if(panel){panel.classList.add('hidden');panel.replaceChildren()}
 document.querySelectorAll('.v23-field-note').forEach(el=>el.remove());document.querySelectorAll('.v23-field-highlight').forEach(el=>el.classList.remove('v23-field-highlight'));
}
export function v23OpenGuide(p){
 v23.sourceId=p.id;v23.originalIssues=productQuality(p).issues.map(x=>x.heading);v23.baseline=productQuality(p).score;v23.selectedField='';v23.selectedHeading='';v23.undo=null;v23.notice='';v23.saved=false;
 analyseProduct();v23Render();
}
export function v23Sorted(issues){return [...issues].sort((a,b)=>({critical:0,important:1,minor:2}[a.severity]??3)-({critical:0,important:1,minor:2}[b.severity]??3)||(b.penalty||0)-(a.penalty||0))}
export function v23ScoreNow(){const f=readEditor();return productAudit(f,f.market,f.focusKeyword)}
export function v23Advice(field){
 const tips={
 'edit-description':{title:'Improve your description with verified facts',message:'Explain what the customer receives, how the product is used, its actual materials, size, colour/variants and care instructions. Only include details you can confirm. The product title alone does not prove any of these claims.'},
 'edit-materials':{title:'Confirm the actual materials',message:'Check your supplier specifications or packaging. Enter the genuine materials only (including plating or metal type when known). Do not guess sterling silver, gold, or hypoallergenic properties.'},
 'edit-dimensions':{title:'Add verified measurements',message:'Measure the item or confirm the supplier specification. Give the correct units (e.g. cm or mm), and specify whether a size is chain length, pendant dimension or bracelet circumference.'},
 'edit-tags':{title:'Improve your tags',message:'Avoid duplicate phrases. Etsy allows up to 13 tags with at most 20 characters each. Add only distinct search phrases relevant to this actual product; there is no reliable search-volume data connected yet.'},
 'edit-title':{title:'Make the title clear and accurate',message:'Lead with the product type and verified features. Avoid repetition or unsupported claims. Title limits and best practices differ by marketplace and category.'},
 'edit-focus':{title:'Choose a truthful focus phrase',message:'Pick a phrase buyers may use that genuinely describes the product. This field does not provide marketplace search-volume validation.'},
 'edit-price':{title:'Review the selling price',message:'Enter a positive price that reflects your actual listing. SellerPilot does not automatically update or verify live marketplace prices.'}
 };return tips[field]||{title:'Review this field',message:'Make changes using accurate, verifiable product information.'}
}
export function v23Proposal(field){
 const el=document.getElementById(field);if(!el)return null;
 const before=el.value, f=readEditor();
 if(field==='edit-tags'){
  const tags=tagList(before),seen=new Set(),unique=[];
  for(const tag of tags){const key=norm(tag);if(key&&!seen.has(key)){seen.add(key);unique.push(tag)}}
  const duplicates=tags.length-unique.length;
  if(duplicates)return {before,after:unique.join(', '),reason:'Remove '+duplicates+' repeated tag phrase'+(duplicates===1?'':'s')+' only. This does not invent new tags. Review the remaining phrases before saving.'};
 }
 if(field==='edit-title'){
  const after=before.replace(/\s+/g,' ').replace(/\b([\p{L}\p{N}]+)(?:\s+\1)+\b/giu,'$1').trim();
  if(after!==before&&after)return{before,after,reason:'Remove extra spaces and immediately repeated words only. Check the resulting title before saving.'};
 }
 return null;
}
export function v23Render(){
 const root=$('v23-guide');if(!root||!state.editing||v23.sourceId!==state.editing){if(root)root.classList.add('hidden');return}
 const p=state.products.find(x=>x.id===state.editing);if(!p){root.classList.add('hidden');return}
 const a=v23ScoreNow(),all=v23Sorted(a.issues),solved=v23.originalIssues.filter(h=>!a.issues.some(x=>x.heading===h)).length,active=all.find(i=>i.field===v23.selectedField&&i.heading===v23.selectedHeading)||all.find(i=>i.field===v23.selectedField);
 const selectedHeading=v23.selectedHeading||(active?.heading||'');
 if(!v23.selectedField&&all.length){v23.selectedField=all[0].field;v23.selectedHeading=all[0].heading}
 const advice=v23Advice(v23.selectedField),proposal=v23Proposal(v23.selectedField);
 const currentPill=a.score===v23.baseline?'Current audit score':(a.score>v23.baseline?'Improved from '+v23.baseline:'Changed from '+v23.baseline);
 root.classList.remove('hidden');
 root.innerHTML=`<div class="v23-guide-top"><div><span class="v23-guide-eyebrow">GUIDED LISTING IMPROVEMENTS · V24</span><h2>${esc(p.title)}</h2><p class="mini">Fix issues one by one. The suggestions use internal completeness rules, not Etsy ranking signals.</p></div><div class="v23-guide-score">${a.score}/100<small>${esc(currentPill)}</small></div></div>
 <div class="row" style="flex-wrap:wrap"><strong style="font-size:13px;color:#264d43">${all.length?all.length+' issues to review':'No basic issues flagged'} · ${solved} of ${v23.originalIssues.length} original findings cleared in editor</strong><span class="pill green">${v23.saved?'Saved in cloud · further changes are drafts':'Draft only · not yet saved'}</span></div>
 ${all.length?`<div class="v23-steps">${all.map((issue,index)=>`<div class="v23-step ${issue.field===v23.selectedField?'selected':''}"><span class="v23-num">${index+1}</span><div><strong>${esc(issue.heading)}</strong><small>${esc(issue.severity)} · ${esc(issue.detail)}</small></div><button class="button secondary sm" type="button" data-v23-select="${esc(issue.field)}" data-v23-heading="${esc(issue.heading)}">Fix now</button></div>`).join('')}</div>`:'<div class="v23-empty">The current checks found no obvious gaps. Verify all product claims and marketplace requirements before publishing.</div>'}
 ${all.length&&v23.selectedField?`<div class="v23-workbench" id="v23-workbench"><h3>${esc(advice.title)}</h3><p>${esc(advice.message)}</p>${proposal?`<div class="v23-dual"><div><b>Before</b><p>${esc(proposal.before)}</p></div><div><b>Suggested local draft</b><p>${esc(proposal.after)}</p></div></div><p>${esc(proposal.reason)}</p>`:'<p><strong>Manual verification required.</strong> No automatic text is inserted because the product facts are not verified.</p>'}<div class="v23-operations"><button type="button" class="button secondary" data-v23-action="go-field">Go to this field</button>${proposal?`<button type="button" class="button" data-v23-action="apply">Apply safe draft</button>`:''}</div></div>`:''}
 <div class="v23-operations"><button type="button" class="button secondary" data-v23-action="recheck">Recheck my changes</button>${v23.undo?`<button type="button" class="button ghost" data-v23-action="undo">Undo last quick fix</button>`:''}<button type="button" class="button" data-v23-action="save">Save changes to cloud</button></div>
 ${v23.notice?`<p class="note" role="status" style="margin-top:12px">${esc(v23.notice)}</p>`:''}<p class="v23-safety">No product changes are stored until you tap Save changes to cloud. Nothing is published to Etsy, eBay, Amazon or Shopify. The audit score is an internal heuristic, not a guarantee of search ranking or sales.</p>`;
 v23ShowInline();
}
export function v23ShowInline(){
 document.querySelectorAll('.v23-field-note').forEach(el=>el.remove());document.querySelectorAll('.v23-field-highlight').forEach(el=>el.classList.remove('v23-field-highlight'));
 const el=document.getElementById(v23.selectedField);if(!el)return;const wrap=el.closest('.field');if(!wrap)return;
 wrap.classList.add('v23-field-highlight');
 const p=document.createElement('p');p.className='v23-field-note';p.textContent=v23Advice(v23.selectedField).message;wrap.appendChild(p);
}
export function v23Select(field,heading='',focus=false){
 const el=document.getElementById(field);if(!el)return;
 v23.selectedField=field;v23.selectedHeading=heading;v23.notice='';v23Render();
 if(focus||!state.editing||v23.sourceId!==state.editing){el.focus({preventScroll:true});el.scrollIntoView({behavior:'smooth',block:'center'})}
 else{document.getElementById('v23-workbench')?.scrollIntoView({behavior:'smooth',block:'start'})}
}
export function v23FromShop(id,field,heading){const p=state.products.find(x=>x.id===id);if(!p){toast('Product no longer exists. Refresh your cloud library.',true);return}
 editProduct(id);v23Select(field,heading);
}
export function v23Apply(){
 const field=v23.selectedField,proposal=v23Proposal(field);if(!proposal){toast('This issue needs your verified product details.',true);return}
 const el=document.getElementById(field);v23.undo={field,before:el.value,after:proposal.after};el.value=proposal.after;if(field==='edit-title')updateTitleHint();
 v23.notice='Safe correction applied to the editor only. Review it, recheck, then choose Save changes to cloud when ready.';analyseProduct();v23Render();
}
export function v23Undo(){
 if(!v23.undo)return;const u=v23.undo,el=document.getElementById(u.field);if(!el)return;
 if(el.value!==u.after){v23.notice='This field was edited after the quick fix. Undo is cancelled to protect your newer changes.';v23.undo=null;v23Render();return}
 el.value=u.before;if(u.field==='edit-title')updateTitleHint();v23.undo=null;v23.notice='Last quick fix undone in the editor. Nothing was saved to the cloud.';analyseProduct();v23Render();
}
export function v23Saved(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;
 v23.sourceId=id;v23.baseline=productQuality(p).score;v23.originalIssues=productQuality(p).issues.map(x=>x.heading);v23.undo=null;v23.saved=true;
 v23.notice='Saved successfully to your private cloud product. Marketplace listings were not changed.';analyseProduct();v23Render();
}
export function v23Recheck(){analyseProduct();const a=v23ScoreNow();v23.notice='Rechecked the edited fields: '+a.score+'/100 ('+(a.score>=v23.baseline?'+':'')+(a.score-v23.baseline)+' relative to the loaded product). Save separately to preserve changes.';v23Render();}
export function v23Init(){
 document.addEventListener('click',e=>{
  const fromShop=e.target.closest('[data-v23-open]');if(fromShop){e.preventDefault();e.stopPropagation();v23FromShop(fromShop.dataset.v23Open,fromShop.dataset.v23Field,fromShop.dataset.v23Heading);return}
  const field=e.target.closest('[data-v23-fix]');if(field){e.preventDefault();e.stopPropagation();v23Select(field.dataset.v23Fix,field.dataset.v23Heading);return}
  const selector=e.target.closest('[data-v23-select]');if(selector){e.preventDefault();e.stopPropagation();v23Select(selector.dataset.v23Select,selector.dataset.v23Heading);return}
  const action=e.target.closest('[data-v23-action]');if(!action)return;e.preventDefault();e.stopPropagation();
  if(action.dataset.v23Action==='go-field')v23Select(v23.selectedField,v23.selectedHeading,true);
  else if(action.dataset.v23Action==='apply')v23Apply();
  else if(action.dataset.v23Action==='undo')v23Undo();
  else if(action.dataset.v23Action==='recheck')v23Recheck();
  else if(action.dataset.v23Action==='save')void saveProduct();
 });
 for(const id of ['edit-title','edit-description','edit-tags','edit-focus','edit-market','edit-price','edit-materials','edit-dimensions','edit-sku']){
  const el=document.getElementById(id);if(!el)continue;
  const update=()=>{if(v23.sourceId&&state.editing===v23.sourceId){v23.notice='';v23Render()}};
  if(el.tagName==='SELECT')el.addEventListener('change',update);else el.addEventListener('input',update);
 }
}
