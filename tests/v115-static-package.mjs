// Build an allowlisted static frontend directory. No upload, network or deployment.
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const pages=['index.html','app.html','demo.html','help.html','privacy.html','terms.html','beta.html','etsy-return.html','subscription-dashboard.html','sandbox-checkout.html','sandbox-access.html'];
const fixed=[...pages,'css/styles.css','css/public.css','assets/sellerpilot-logo.svg','js/subscription-dashboard.mjs','js/sandbox-access.mjs'];
export async function buildStaticPackage(source,output){
 const root=await realpath(source),out=resolve(output);
 assert.notEqual(out,root,'Output must not be repository root');
 assert.ok(!root.startsWith(out+sep),'Output must not contain repository');
 const app=await readFile(resolve(root,'app.html'),'utf8');
 const match=app.match(/<script type="importmap">([\s\S]*?)<\/script>/);
 assert.ok(match,'Missing workspace import map');
 const modules=Object.values(JSON.parse(match[1]).imports).map(v=>{
  assert.match(v,/^\.\/js\/[a-z0-9-]+\.js\?v=\d+$/,'Unexpected module path');
  return v.slice(2).split('?')[0];
 });
 const files=[...new Set([...fixed,...modules])].sort();
 assert.ok(files.includes('js/app.js')&&files.includes('js/demo.js'));
 const contents=new Map();
 for(const file of files){
  const src=resolve(root,file),info=await lstat(src);
  assert.ok(info.isFile()&&!info.isSymbolicLink(),'Not a regular file: '+file);
  assert.equal(await realpath(src),src,'Symlink in frontend path: '+file);
  contents.set(file,await readFile(src));
 }
 for(const page of pages){
  const html=contents.get(page).toString('utf8');
  for(const m of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)(?:[^"']*)["']/g)){
   assert.ok(contents.has(m[1]),'Unpackaged local reference '+m[1]+' in '+page);
  }
 }
 // Refuse any existing destination; never overwrite a prior package.
 await mkdir(out);
 for(const [file,bytes] of contents){
  const dest=resolve(out,file);
  await mkdir(dirname(dest),{recursive:true});
  await writeFile(dest,bytes,{flag:'wx'});
 }
 return files;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(!process.argv[2])throw Error('Usage: node tests/v115-static-package.mjs NEW_OUTPUT_DIRECTORY');
 const files=await buildStaticPackage(process.cwd(),process.argv[2]);
 console.log('Prepared '+files.length+' frontend files locally; no deployment.');
}
