import { $, esc, state, toast } from './core.js';
import { productQuality } from './audit.js';
import { verifiedUser, refreshCloud, guarded } from './supabase-client.js';

export function toCSV(rows){return rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+@\-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}).join(',')).join('\r\n')}
export function download(name,content,type='text/plain;charset=utf-8'){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000)}
export function exportProducts(){if(!state.ready){toast('Cloud not loaded',true);return}const rows=[['title','description','tags','price','sku'],...state.products.map(p=>[p.title,p.description,p.tags,p.price,p.sku])];download('sellerpilot-v18-products.csv','\ufeff'+toCSV(rows),'text/csv;charset=utf-8')}
export function parseCSV(text){const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);row=[];cell=''}else cell+=c}if(quoted)throw Error('CSV contains an unmatched quotation mark.');row.push(cell);if(row.some(x=>String(x).trim()))rows.push(row);return rows}
/* Etsy CSV and SellerPilot template preview. No writes occur until explicit confirmation. */
export function prepareImport(text,existing=[],market='Etsy'){
 const rows=parseCSV(String(text).replace(/^\ufeff/,''));
 if(rows.length<2)throw Error('CSV needs a header and at least one product.');
 if(rows.length>201)throw Error('Maximum 200 product rows per import.');
 const aliases={title:['title','listing title','product title','name'],description:['description','listing description'],tags:['tags','keywords'],price:['price','listing price'],sku:['sku','seller sku'],currency:['currency code','currency'],materials:['materials','material']};
 const clean=s=>String(s||'').trim().toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
 const header=rows.shift().map(clean),index={};
 for(const [key,names] of Object.entries(aliases)){const matches=header.map((h,i)=>names.includes(h)?i:-1).filter(i=>i>=0);if(matches.length>1)throw Error('Ambiguous '+key+' columns. Use one column for each field.');index[key]=matches[0]??-1}
 if(['title','description','tags','price'].some(k=>index[k]<0))throw Error('CSV needs title, description, tags and price columns (Etsy or SellerPilot format).');
 const key=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
 const titles=new Set(existing.map(p=>key(p.title)).filter(Boolean)),skus=new Set(existing.map(p=>key(p.sku)).filter(Boolean));
 return rows.map((row,i)=>{
  const read=k=>String(row[index[k]]??'').trim(),title=read('title'),sku=read('sku'),currency=read('currency').toUpperCase(),rawPrice=read('price');
  const priceText=rawPrice.replace(/^£\s*/,'');
  const price=/^\d+(?:\.\d{1,2})?$/.test(priceText)?Number(priceText):NaN;
  const item={title,description:read('description'),tags:read('tags').replaceAll('|',','),price,sku,attributes:{sellerpilot:{market,materials:read('materials')}}};
  let error='';
  if(row.length!==header.length)error='Column count does not match header';
  else if(!title||title.length>250)error='Title must contain 1–250 characters';
  else if(currency&&currency!=='GBP')error='Unsupported currency '+currency+' — prices currently use GBP';
  else if(!Number.isFinite(price)||price<=0)error='A positive GBP price is required';
  else if(item.description.length>10000||item.tags.length>6000||sku.length>200||item.attributes.sellerpilot.materials.length>2000)error='One or more fields exceed import limits';
  const duplicate=!error&&(titles.has(key(title))||!!sku&&skus.has(key(sku)));
  if(!error){titles.add(key(title));if(sku)skus.add(key(sku))}
  return {row:i+2,item,error,duplicate,score:error?null:productQuality(item).score};
 });
}
function previewImport(entries,fileName){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='v26-import-dialog';
  const valid=entries.filter(r=>!r.error&&!r.duplicate);
  const dup=entries.filter(r=>r.duplicate).length,invalid=entries.filter(r=>r.error).length;
  dialog.innerHTML='<h2>Review your CSV import</h2><p class="mini">'+esc(fileName)+' · '+entries.length+' rows · '+valid.length+' ready · '+dup+' duplicate · '+invalid+' invalid</p><p>Prices are interpreted as GBP when no currency is specified. Invalid rows and duplicate titles or SKUs are excluded. Nothing is written until you confirm.</p><div class="v26-import-list">'+entries.map(r=>'<label class="v26-import-row"><input type="checkbox" data-row="'+r.row+'" '+(!r.error&&!r.duplicate?'checked':'disabled')+'><span><strong>'+esc(r.item.title||'Untitled row')+'</strong><small>Row '+r.row+' · '+esc(r.error|| (r.duplicate?'Duplicate — skipped':'Quality '+r.score+'/100'))+'</small></span></label>').join('')+'</div><div class="form-actions"><button class="button secondary" type="button" data-cancel>Cancel</button><button class="button" type="button" data-confirm '+(!valid.length?'disabled':'')+'>Import selected</button></div>';
  document.body.appendChild(dialog);
  let result=[];
  const confirm=dialog.querySelector('[data-confirm]');
  dialog.addEventListener('change',()=>{confirm.disabled=!dialog.querySelector('input:checked:not(:disabled)')});
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  confirm.onclick=()=>{const selected=new Set([...dialog.querySelectorAll('input:checked:not(:disabled)')].map(x=>Number(x.dataset.row)));result=valid.filter(r=>selected.has(r.row)).map(r=>r.item);dialog.close()};
  dialog.addEventListener('close',()=>{dialog.remove();resolve(result)},{once:true});dialog.showModal();
 });
}
export async function importCSV(file){
 if(!state.ready||!state.uid||state.busy)return;
 const uid=state.uid,serial=state.serial;
 try{
  if(file.size>3000000)throw Error('CSV file exceeds the 3 MB limit.');
  const rows=prepareImport(await file.text(),state.products,state.preferences.market||'Etsy');
  if(state.uid!==uid||state.serial!==serial)return;
  const items=await previewImport(rows,file.name);
  if(!items.length)return;
  if(state.uid!==uid||state.serial!==serial||!state.ready)throw Error('Account changed during preview. Reopen the CSV.');
  await guarded(async()=>{
   const user=await verifiedUser();if(user.id!==uid||state.serial!==serial)throw Error('Account changed during import.');
   const titles=new Set(state.products.map(x=>String(x.title||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' '))),skus=new Set(state.products.map(x=>String(x.sku||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')));
   const key=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
   if(items.some(p=>titles.has(key(p.title))||p.sku&&skus.has(key(p.sku))))throw Error('Your catalogue changed after preview. Reopen the CSV to recheck duplicates.');
   const {error}=await state.client.from('products').insert(items.map(x=>({...x,user_id:uid})));if(error)throw error;
   await refreshCloud();toast(items.length+' products imported and ready for audit.');
  });
 }catch(e){toast(e.message||'CSV preview failed',true)}
}
export function exportAudit(){const data=[['title','marketplace','score','top_issues','issues_count'],...state.products.map(p=>{const a=productQuality(p);return[p.title,a.market,a.score,a.issues.map(x=>x.heading).join(' | '),a.issues.length]})];download('sellerpilot-v18-audit.csv','\ufeff'+toCSV(data),'text/csv;charset=utf-8')}
