import { $, esc, state, toast, norm } from './core.js';
import { verifiedUser } from './supabase-client.js';
import { editProduct, updateTitleHint } from './product-editor.js';
import { analyseProduct, productAudit, savedDetails } from './audit.js';

let current=null,requestSerial=0,pending=false;
export function v27Reset(){
 requestSerial++;current=null;pending=false;
 const result=$('v27-ai-result');if(result){result.innerHTML='';result.classList.add('hidden')}
 if($('v27-consent'))$('v27-consent').checked=false;
 if($('v27-ai-status'))$('v27-ai-status').textContent='AI availability has not been checked.';
 if($('v27-generate'))$('v27-generate').disabled=false;
}
export function v27Validate(raw){
 if(!raw||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>140||typeof raw.description!=='string'||!raw.description.trim()||raw.description.length>4000||!Array.isArray(raw.tags)||!raw.tags.length||raw.tags.length>13||raw.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>20||t.includes(','))||new Set(raw.tags.map(norm)).size!==raw.tags.length)throw Error('AI returned an invalid draft. Nothing was applied.');
 for(const key of ['explanations','missing_facts'])if(!Array.isArray(raw[key])||raw[key].length>12||raw[key].some(x=>typeof x!=='string'||x.length>400))throw Error('AI returned invalid review notes.');
 return {title:raw.title.trim(),description:raw.description.trim(),tags:raw.tags.map(t=>t.trim()),explanations:raw.explanations,missing_facts:raw.missing_facts};
}
async function invoke(body){
 const {data,error}=await state.client.functions.invoke('sellerpilot-ai-copy',{body});
 if(error){let detail='';try{detail=(await error.context?.json())?.detail||''}catch{}throw Error(detail||'The AI service is unavailable. The free brief builder remains available.')}
 if(!data?.ok)throw Error(data?.detail||'The AI service returned an invalid response.');
 return data;
}
async function checkStatus(){
 if(!state.ready||!state.uid||pending)return;const serial=++requestSerial,uid=state.uid;
 const status=$('v27-ai-status');status.textContent='Checking secure AI service…';
 try{await verifiedUser();const data=await invoke({action:'status'});if(serial!==requestSerial||uid!==state.uid)return;status.textContent=data.enabled?'AI service is available. Usage is limited.':'AI generation is not enabled yet. The free brief builder is available.'}
 catch(e){if(serial===requestSerial&&uid===state.uid)status.textContent=e.message}
}
function renderDraft(product,draft){
 const before=productAudit(product,'Etsy',savedDetails(product).focusKeyword||''),after=productAudit({...product,title:draft.title,description:draft.description,tags:draft.tags.join(', ')},'Etsy',savedDetails(product).focusKeyword||'');
 const list=items=>items.length?'<ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="mini">None listed.</p>';
 const pair=(label,a,b)=>'<div class="v27-pair"><div><b>Current '+label+'</b><p>'+esc(a||'—')+'</p></div><div><b>AI draft '+label+'</b><p>'+esc(b)+'</p></div></div>';
 const result=$('v27-ai-result');result.classList.remove('hidden');
 result.innerHTML='<h3>Review your AI draft</h3><p class="mini">Internal quality checks: '+before.score+'/100 → '+after.score+'/100. Not a forecast of sales or ranking.</p>'+pair('title',product.title,draft.title)+pair('description',product.description,draft.description)+pair('tags',product.tags,draft.tags.join(', '))+'<h3>Why these changes?</h3>'+list(draft.explanations)+'<h3>Facts you still need to confirm</h3>'+list(draft.missing_facts)+'<label class="v25-toggle"><input type="checkbox" id="v27-review"> I reviewed the suggested text and verified the product facts.</label><button class="button" id="v27-apply" type="button" disabled>Open reviewed draft in editor</button><p class="mini">This creates an unsaved editor draft. Your existing cloud listing and marketplace listing are not changed.</p>';
 $('v27-review').onchange=()=>{$('v27-apply').disabled=!$('v27-review').checked};
 $('v27-apply').onclick=()=>{
  if(!current||current.uid!==state.uid||!$('v27-review').checked)return;
  const p=state.products.find(x=>x.id===current.id);if(!p||p.updated_at!==current.updatedAt){toast('The source listing changed. Generate a fresh draft.',true);return}
  if(!confirm('Load this reviewed draft into the editor? Any unsaved editor changes will be replaced. Nothing is saved or published yet.'))return;
  editProduct(p.id);$('edit-title').value=current.draft.title;$('edit-description').value=current.draft.description;$('edit-tags').value=current.draft.tags.join(', ');updateTitleHint();analyseProduct();toast('AI draft loaded. Review and save only when ready.');
 };
}
async function generate(){
 if(!state.ready||!state.uid||pending)return;
 const product=state.products.find(p=>p.id===$('ai-product').value),status=$('v27-ai-status');
 if(!product){toast('Select a saved cloud product first.',true);return}
 if($('ai-market').value!=='Etsy'||(savedDetails(product).market||'Etsy')!=='Etsy'){toast('AI optimisation currently supports Etsy listings.',true);return}
 if(!$('v27-consent').checked){toast('Confirm the AI data-sharing notice first.',true);return}
 const serial=++requestSerial,uid=state.uid;pending=true;current=null;$('v27-ai-result').classList.add('hidden');$('v27-ai-result').innerHTML='';$('v27-generate').disabled=true;$('v27-consent').checked=false;
 status.textContent='Requesting a reviewable AI draft…';
 try{
  await verifiedUser();if(uid!==state.uid||serial!==requestSerial)return;
  const data=await invoke({action:'generate',product_id:product.id,tone:$('ai-tone').value,audience:$('ai-audience').value.slice(0,200),facts:$('ai-facts').value.slice(0,1000),region:state.preferences.region==='United States'?'US':'UK',consent:true});
  if(serial!==requestSerial||uid!==state.uid)return;
  if(data.updated_at!==product.updated_at)throw Error('The cloud product changed. Refresh the catalogue and try again.');
  const draft=v27Validate(data.draft);current={id:product.id,uid,updatedAt:product.updated_at,draft};renderDraft(product,draft);status.textContent='AI draft ready for your review. No changes have been saved.';
 }catch(e){if(serial===requestSerial&&uid===state.uid)status.textContent=e.message||'AI generation failed.'}
 finally{if(serial===requestSerial){pending=false;$('v27-generate').disabled=false}}
}
export function v27Init(){
 $('v27-generate').onclick=generate;$('v27-status-check').onclick=checkStatus;
 $('ai-product').addEventListener('change',v27Reset);v27Reset();
}
