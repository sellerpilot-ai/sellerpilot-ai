import { $, esc, state, toast } from './core.js';
import { verifiedUser } from './supabase-client.js';
let photo='',serial=0,pending=false;
const empty='<p class="mini">Review findings and suggested additional photographs will appear here.</p>';
function update(){if($('v28-run'))$('v28-run').disabled=pending||!photo||!$('v28-consent').checked}
export function v28Reset(){
 serial++;photo='';pending=false;
 if(!$('v28-file'))return;
 $('v28-file').value='';$('v28-consent').checked=false;$('v28-preview').removeAttribute('src');$('v28-preview-box').classList.add('hidden');$('v28-dimensions').textContent='';$('v28-result').innerHTML=empty;$('v28-status').textContent='Select an image to start.';update();
}
async function load(file){
 const ticket=++serial;photo='';pending=true;$('v28-consent').checked=false;$('v28-preview').removeAttribute('src');$('v28-preview-box').classList.add('hidden');$('v28-result').innerHTML=empty;update();
 try{
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8000000)throw Error('Choose a JPEG, PNG or WebP image under 8 MB.');
  $('v28-status').textContent='Preparing a private local preview…';
  const bitmap=await createImageBitmap(file);
  try{
   if(bitmap.width*bitmap.height>32000000)throw Error('The photo is too large to prepare. Resize it first.');
   const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   const ctx=canvas.getContext('2d');if(!ctx)throw Error('Image preparation unavailable.');
   ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   let url=canvas.toDataURL('image/jpeg',.82);if(url.length>1400000)url=canvas.toDataURL('image/jpeg',.55);if(url.length>1400000||!url.startsWith('data:image/jpeg;base64,'))throw Error('Unable to prepare a compact JPEG.');
   if(ticket!==serial)return;photo=url;$('v28-preview').src=url;$('v28-preview-box').classList.remove('hidden');$('v28-dimensions').textContent='Original '+bitmap.width+' × '+bitmap.height+' · prepared '+canvas.width+' × '+canvas.height+' pixels';$('v28-status').textContent='Preview ready. Confirm permission before sending.';
  }finally{bitmap.close()}
 }catch(e){if(ticket===serial)$('v28-status').textContent=e.message||'Could not prepare this photo.'}
 finally{if(ticket===serial){pending=false;update()}}
}
async function invoke(body){
 const {data,error}=await state.client.functions.invoke('sellerpilot-ai-copy',{body});
 if(error){let detail='';try{detail=(await error.context?.json())?.detail||''}catch{}throw Error(detail||'Image AI is not available yet.')}
 if(!data?.ok)throw Error(data?.detail||'Image AI returned an invalid result.');return data;
}
export function validateImageReview(raw){
 if(!raw)return null;
 for(const key of ['summary','lighting','background','composition','thumbnail','alt_text'])if(typeof raw[key]!=='string'||!raw[key].trim()||raw[key].length>(key==='alt_text'?160:600))return null;
 for(const key of ['recommended_shots','caveats'])if(!Array.isArray(raw[key])||raw[key].length>8||raw[key].some(x=>typeof x!=='string'||x.length>300))return null;
 return raw;
}
function render(raw){
 const r=validateImageReview(raw);if(!r)throw Error('Image review failed validation.');
 const list=items=>items.length?'<ul>'+items.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="mini">None listed.</p>';
 $('v28-result').innerHTML='<h3>Summary</h3><p>'+esc(r.summary)+'</p>'+[['Lighting',r.lighting],['Background',r.background],['Composition',r.composition],['Thumbnail clarity',r.thumbnail]].map(([k,v])=>'<div class="result-strip v28-finding"><b>'+k+'</b><p>'+esc(v)+'</p></div>').join('')+'<h3>Recommended additional photographs</h3>'+list(r.recommended_shots)+'<h3>Suggested alt text</h3><p>'+esc(r.alt_text)+'</p><button class="button secondary sm" id="v28-copy-alt" type="button">Copy alt text</button><h3>Limitations</h3>'+list(r.caveats);
 $('v28-copy-alt').onclick=async()=>{try{await navigator.clipboard.writeText(r.alt_text);toast('Alt text copied.')}catch{toast('Select the text manually to copy it.',true)}};
}
async function check(){
 if(!state.ready||pending)return;const uid=state.uid,ticket=serial;
 try{await verifiedUser();const data=await invoke({action:'image_status'});if(ticket!==serial||uid!==state.uid)return;$('v28-status').textContent=data.enabled?'Image AI is available with usage limits.':'Image AI is not enabled yet. The local preview still works.'}
 catch(e){if(ticket===serial&&uid===state.uid)$('v28-status').textContent=e.message}
}
async function analyse(){
 if(!state.ready||!photo||pending||!$('v28-consent').checked)return;
 const uid=state.uid,ticket=++serial,prepared=photo;pending=true;$('v28-consent').checked=false;update();$('v28-result').innerHTML=empty;$('v28-status').textContent='Requesting AI photography feedback…';
 try{await verifiedUser();if(ticket!==serial||uid!==state.uid)return;const data=await invoke({action:'image_analyse',image:prepared,consent:true});if(ticket!==serial||uid!==state.uid)return;render(data.review);$('v28-status').textContent='Review ready. No photograph has been saved to your catalogue.'}
 catch(e){if(ticket===serial&&uid===state.uid)$('v28-status').textContent=e.message}
 finally{if(ticket===serial){pending=false;update()}}
}
export function v28Init(){
 $('v28-file').onchange=e=>{const file=e.target.files?.[0];if(file)void load(file)};$('v28-clear').onclick=v28Reset;$('v28-check').onclick=check;$('v28-run').onclick=analyse;$('v28-consent').onchange=update;v28Reset();
}
