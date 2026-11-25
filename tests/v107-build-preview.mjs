// Build a single-file, network-blocked copy of the real V106 interface for owner testing.
// Run only in local/CI testing; never publish this file to production hosting.
import {build} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
const read=p=>readFile(p,'utf8');
const root=process.cwd(),out=resolve(root,'preview-output');
const app=await read('app.html'),css=await read('css/styles.css'),logo=await read('assets/sellerpilot-logo.svg');
const logoUrl='data:image/svg+xml;base64,'+Buffer.from(logo).toString('base64');
const bundle=await build({
 entryPoints:['js/app.js'],bundle:true,write:false,format:'esm',platform:'browser',target:'es2022',
 define:{localStorage:'globalThis.__previewMemoryStorage'},
 plugins:[{name:'offline-preview-only',setup(b){
  b.onResolve({filter:/^https?:\/\//},args=>{
   if(/^https:\/\/esm\.sh\/@supabase\/supabase-js@/.test(args.path))return {path:resolve(root,'tests/v107-offline-client.mjs')};
   return {errors:[{text:'Unexpected external import in offline preview: '+args.path}]};
  });
  b.onResolve({filter:/^\.\/.*\.js\?v=\d+$/},args=>({path:resolve(args.resolveDir,args.path.split('?')[0])}));
  b.onLoad({filter:/[\\/]supabase-client\.js$/},async args=>{
   let contents=await read(args.path);
   for(const name of ['PROJECT_URL','PUBLISHABLE_KEY','REDIRECT_URL']){
    const pattern=new RegExp("export const "+name+"='[^']*';");
    if(!pattern.test(contents))throw Error('Missing preview configuration: '+name);
    contents=contents.replace(pattern,"export const "+name+"='offline-preview';");
   }
   contents=contents.replaceAll('Cloud synced ·','Offline fixture synced ·').replaceAll('Signed in · private cloud','Fictional offline account');
   return {contents,loader:'js',resolveDir:dirname(args.path)};
  });
 }}]
});
const code=bundle.outputFiles[0].text;
if(/sb_publishable_|\.supabase\.co/.test(code))throw Error('Live project configuration in offline preview');
const csp="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'";
const setup=[
 'const previewMap=new Map();',
 'globalThis.__previewMemoryStorage={getItem:k=>previewMap.get(String(k))??null,setItem:(k,v)=>previewMap.set(String(k),String(v)),removeItem:k=>previewMap.delete(String(k)),clear:()=>previewMap.clear()};',
 "document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;const h=a.getAttribute('href');if(h&&!h.startsWith('#')&&!h.startsWith('blob:')&&!h.startsWith('data:')){e.preventDefault();e.stopImmediatePropagation();document.getElementById('preview-status').textContent='External navigation is disabled in this offline preview.';}},true);",
 "document.addEventListener('submit',e=>e.preventDefault(),true);",
 "document.addEventListener('click',e=>{if(e.target.id==='preview-restart')location.reload()},true);"
].join('\n');
const notice='<div id="preview-notice" role="note" style="position:sticky;top:0;z-index:9999;background:#173b35;color:white;padding:9px 12px;font:600 13px/1.4 system-ui;text-align:center">V106 OFFLINE TEST COPY — fictional data only. All cloud messages and saves are simulated. No real login, payments or API calls. Changes disappear on reload. <button id="preview-restart" type="button" style="font:inherit;padding:3px 8px">Restart sample</button><span id="preview-status" role="status"></span></div>';
let html=app.replace('<meta charset="utf-8">','<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+csp+'">')
 .replace('<title>SellerPilot AI — Seller Workspace v106</title>','<title>SellerPilot AI — V106 offline test copy</title>')
 .replace(/<link rel="stylesheet" href="\.\/css\/styles\.css\?v=\d+">/,'<style>'+css+'</style>')
 .replaceAll('./assets/sellerpilot-logo.svg',logoUrl)
 .replace(/<script type="importmap">[\s\S]*?<\/script>/,'')
 .replace(/<script type="module">[\s\S]*?<\/script>/,()=>'<script type="module">\n'+code.replace(/<\/script/gi,'<\\/script')+'\n</script>')
 .replace(/<body[^>]*>/,m=>m+notice+'<script>'+setup+'</script>');
// The preview never needs credentials, including after a simulated sign-out.
html=html.replace('</head>','<style>#view-auth input,#view-auth button,#view-auth form,#reset-container{display:none!important}#view-auth::before{content:"Offline test copy: select Restart sample at the top to reopen the fictional account.";display:block;padding:18px;font-weight:700}</style></head>');
if(html.includes('<script type="importmap">')||html.includes('./js/app.js')||!html.includes('Offline fixture synced'))throw Error('Preview assembly incomplete');
await mkdir(out,{recursive:true});
await writeFile(resolve(out,'SellerPilot-V106-Offline-Preview.html'),html);
await writeFile(resolve(out,'READ-ME.txt'),'Open the HTML file directly in a modern desktop browser, or a mobile browser that supports local HTML files. Unzip first. This is an offline copy of the V106 interface using fictional listings and an in-memory simulated account. No live database, API, billing or actual sign-in. Do not enter private data or credentials. Reload to reset. Use Products, Audit, Find a tool, Keyword Lab local tools, tasks, reports and profit planner. Downloaded exports are local files. Some phone file viewers block scripts; use Chrome/Edge on a computer if the preview does not start. Do not upload this file to a public host.\n');
console.log('Built standalone offline preview; '+Buffer.byteLength(html)+' bytes.');
