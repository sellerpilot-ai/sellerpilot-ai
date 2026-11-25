import {productAudit} from './audit.js';
import {esc,tagList,norm} from './core.js';
import {discover} from './keyword-discovery.js';
import {buildPlan} from './listing-plan.js';
const original=[
 {title:'Minimalist Gold Tone Bracelet',description:'Simple bracelet for everyday wear.',tags:'bracelet,gold jewellery,bracelet',price:18.5},
 {title:'Gift mug',description:'Ceramic mug with a printed floral design. Holds 330 ml. Hand wash recommended.',tags:'mug,flower mug,ceramic mug',price:12},
 {title:'Cotton canvas tote bag with leaf design',description:'A reusable cotton canvas tote with a printed leaf design, suitable for carrying everyday essentials. The bag measures 38 cm by 42 cm. Wash gently in cool water and air dry. Includes one tote bag.',tags:'tote bag,canvas tote,leaf design,cotton bag,reusable bag,gift bag,shopping bag,printed tote',price:14}
];
let products=original.map(x=>({...x})),selected=0,history=new Map(),showKeywords=false;
const el=id=>document.getElementById(id);
// Static, illustrative icons for fictional listings. No external image request.
const sampleArt=[
 '<ellipse cx="32" cy="32" rx="20" ry="15" fill="none" stroke="#b48b35" stroke-width="5"/><circle cx="49" cy="22" r="5" fill="#e8cb83"/>',
 '<path d="M15 20h29v29H15z" fill="#f1d9c1" stroke="#916a56" stroke-width="2"/><path d="M44 25h5a8 8 0 0 1 0 16h-5" fill="none" stroke="#916a56" stroke-width="3"/><path d="M24 34l6-7 6 7-6 7z" fill="#075b4a"/>',
 '<path d="M14 24h36l4 28H10z" fill="#e4d9bc" stroke="#927f56" stroke-width="2"/><path d="M23 24v-6a9 9 0 0 1 18 0v6" fill="none" stroke="#927f56" stroke-width="3"/><path d="M23 44q0-15 18-15-1 14-18 15" fill="#075b4a"/>'
];
const sampleThumb=i=>'<svg class="demo-thumb" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="12" fill="#edf4f0"/>'+sampleArt[i]+'</svg>';
function render(){
 const ranked=products.map((p,i)=>({i,p,a:productAudit(p)})).sort((x,y)=>x.a.score-y.a.score);
 el('demo-summary').textContent=products.length+' sample listings · average quality '+Math.round(ranked.reduce((sum,x)=>sum+x.a.score,0)/ranked.length)+'/100';
 el('demo-list').innerHTML=ranked.map(({p,i,a})=>'<button class="demo-item" type="button" data-demo-id="'+i+'" aria-pressed="'+(i===selected)+'">'+sampleThumb(i)+'<span class="demo-item-name">'+esc(p.title)+'<small>£'+p.price.toFixed(2)+'</small></span><span class="demo-score">'+a.score+'/100</span></button>').join('');
 const p=products[selected],audit=productAudit(p),baseline=productAudit(original[selected]),tags=tagList(p.tags),unique=tags.filter((x,i)=>tags.findIndex(t=>norm(t)===norm(x))===i),delta=audit.score-baseline.score;
 const kw=discover(p,'',''),plan=buildPlan(audit,baseline,kw,null);
 el('demo-tutorial').textContent=selected!==0?'Choose the bracelet to practise removing duplicate tags, or explore this fictional product.':history.has(0)?'Step 3 of 3: compare your original and revised scores. Undo or reset to practise again.':'Step 2 of 3: the bracelet is selected. Remove its repeated tag to see what changes.';
 el('demo-panel').innerHTML='<h2>'+esc(p.title)+'</h2><p class="demo-score" id="demo-score">'+audit.score+'/100 — internal quality score</p><p class="note" id="demo-delta">Original '+baseline.score+'/100 · Current '+audit.score+'/100 · Change '+(delta>0?'+':'')+delta+'</p><section id="demo-details"><h3>Sample listing details</h3><p class="mini">Fictional product · not retrieved from Etsy</p><p><b>Price:</b> £'+p.price.toFixed(2)+'</p><p><b>Description:</b> '+esc(p.description)+'</p><p><b>Tags:</b> '+esc(p.tags)+'</p><div class="demo-illustration">'+sampleThumb(selected)+'<span class="mini">Illustration only — not a product photo.</span></div></section><h3>Recommended actions</h3><ul>'+plan.actions.map(x=>'<li><b>'+esc(x.label)+'</b> — '+esc(x.findings[0].heading)+' ('+esc(x.severity)+')</li>').join('')+'</ul><div class="demo-actions">'+(unique.length<tags.length?'<button class="button" id="demo-fix">Remove repeated tags</button>':'')+(history.has(selected)?'<button class="button secondary" id="demo-undo">Undo last fix</button>':'')+'<button class="button secondary" id="demo-keywords">'+(showKeywords?'Hide':'Explore')+' keyword ideas</button><button class="button ghost" id="demo-reset">Reset sample shop</button></div>'+(showKeywords?'<section id="demo-ideas"><h3>Local keyword ideas</h3><p class="mini">From fictional listing wording; no buyer search-volume data.</p><ul>'+kw.rows.slice(0,6).map(x=>'<li>'+esc(x.phrase)+' · '+x.score+'/100 local relevance</li>').join('')+'</ul></section>':'')+'<p class="mini">No cloud data or paid AI is used. Scores are not ranking or sales predictions. Demo edits disappear on reload.</p>';
}
document.addEventListener('click',e=>{
 const item=e.target.closest('[data-demo-id]');if(item){selected=Number(item.dataset.demoId);showKeywords=false;render();el('demo-panel').scrollIntoView({block:'nearest'});return}
 if(e.target.id==='demo-reset'){products=original.map(x=>({...x}));selected=0;history.clear();showKeywords=false;render()}
 if(e.target.id==='demo-fix'){const tags=tagList(products[selected].tags);history.set(selected,products[selected].tags);products[selected].tags=tags.filter((x,i)=>tags.findIndex(t=>norm(t)===norm(x))===i).join(', ');render();el('demo-undo')?.focus()}
 if(e.target.id==='demo-undo'&&history.has(selected)){products[selected].tags=history.get(selected);history.delete(selected);render();el('demo-fix')?.focus()}
 if(e.target.id==='demo-keywords'){showKeywords=!showKeywords;render();el('demo-keywords')?.focus()}
});
render();
