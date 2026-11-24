import { productAudit } from './audit.js';
import { esc, tagList, norm } from './core.js';
const original=[
 {title:'Minimalist Gold Tone Bracelet',description:'Simple bracelet for everyday wear.',tags:'bracelet,gold jewellery,bracelet',price:18.5},
 {title:'Gift mug',description:'Ceramic mug with a printed floral design. Holds 330 ml. Hand wash recommended.',tags:'mug,flower mug,ceramic mug',price:12},
 {title:'Cotton canvas tote bag with leaf design',description:'A reusable cotton canvas tote with a printed leaf design, suitable for carrying everyday essentials. The bag measures 38 cm by 42 cm. Wash gently in cool water and air dry. Includes one tote bag.',tags:'tote bag,canvas tote,leaf design,cotton bag,reusable bag,gift bag,shopping bag,printed tote',price:14}
];
let products=original.map(x=>({...x})),selected=0;
function render(){
 const ranked=products.map((p,i)=>({i,p,a:productAudit(p)})).sort((x,y)=>x.a.score-y.a.score);
 document.getElementById('demo-summary').textContent=products.length+' sample listings · average quality '+Math.round(ranked.reduce((sum,x)=>sum+x.a.score,0)/ranked.length)+'/100';
 document.getElementById('demo-list').innerHTML=ranked.map(({p,i,a})=>'<button class="demo-item" type="button" data-demo-id="'+i+'" aria-pressed="'+(i===selected)+'"><span>'+esc(p.title)+'</span><span class="demo-score">'+a.score+'/100</span></button>').join('');
 const p=products[selected],audit=productAudit(p),tags=tagList(p.tags),unique=tags.filter((x,i)=>tags.findIndex(t=>norm(t)===norm(x))===i);
 document.getElementById('demo-panel').innerHTML='<h2>'+esc(p.title)+'</h2><p class="demo-score">'+audit.score+'/100 — internal quality score</p><p>Tags: '+esc(p.tags)+'</p><h3>'+audit.issues.length+' checks flagged</h3><ul>'+audit.issues.map(x=>'<li><b>'+esc(x.heading)+'</b> — '+esc(x.detail)+'</li>').join('')+'</ul><div class="demo-actions">'+(unique.length<tags.length?'<button class="button" id="demo-fix">Remove repeated tags</button>':'')+'<button class="button secondary" id="demo-reset">Reset sample shop</button></div><p class="mini">These checks do not measure sales or predict marketplace ranking. Demo edits disappear when you reload.</p>';
}
document.addEventListener('click',e=>{
 const item=e.target.closest('[data-demo-id]');if(item){selected=Number(item.dataset.demoId);render();return}
 if(e.target.id==='demo-reset'){products=original.map(x=>({...x}));selected=0;render()}
 if(e.target.id==='demo-fix'){const tags=tagList(products[selected].tags);products[selected].tags=tags.filter((x,i)=>tags.findIndex(t=>norm(t)===norm(x))===i).join(', ');render()}
});
render();
