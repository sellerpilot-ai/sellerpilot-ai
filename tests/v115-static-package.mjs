// Build an allowlisted static frontend directory. No upload, network or deployment.
import {readFile,writeFile,mkdir,lstat,realpath} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const pages=['index.html','app.html','demo.html','help.html','privacy.html','terms.html','beta.html','etsy-return.html','subscription-dashboard.html','sandbox-checkout.html','sandbox-access.html'];
// A digest is kept outside the deployed directory; it is not a signature.
export function packageFingerprint(entries){
 const hash=createHash('sha256');
 for(const [path,bytes] of [...entries].sort(([a],[b])=>a<b?-1:a>b?1:0)){
  hash.update(JSON.stringify([path,bytes.length,createHash('sha256').update(bytes).digest('hex')])+'\n');
 }
 return hash.digest('hex');
}
export function checkFrontendSource(path,source){
 // Limited credential-pattern screen, not a full secret scanner.
 const forbidden=[/\bsk_(?:live|test)_[A-Za-z0-9]{12,}/,/\bwhsec_[A-Za-z0-9]{12,}/,/\bsb_secret_[A-Za-z0-9_-]{12,}/,/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}/,/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/];
 if(forbidden.some(pattern=>pattern.test(source)))throw Error('Potential private credential in '+path);
}
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
  const bytes=await readFile(src);
  checkFrontendSource(file,bytes.toString('utf8'));
  contents.set(file,bytes);
 }
 for(const page of pages){
  const html=contents.get(page).toString('utf8');
  for(const m of html.matchAll(/(?:src|href)=["']\.\/([^"'?#]+)(?:[^"']*)["']/g)){
   assert.ok(contents.has(m[1]),'Unpackaged local reference '+m[1]+' in '+page);
  }
 }
 // Check literal module dependencies; computed imports still require runtime checks.
 for(const [file,bytes] of contents){
  if(!/\.m?js$/.test(file))continue;
  for(const m of bytes.toString('utf8').matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)['"]([^'"]+)['"]/g)){
   const spec=m[1];
   if(!spec.startsWith('./')&&!spec.startsWith('../'))continue;
   const dependency=resolve(root,dirname(file),spec.split(/[?#]/)[0]);
   assert.ok(dependency.startsWith(root+sep),'Module escapes frontend root: '+file);
   const relative=dependency.slice(root.length+1).split(sep).join('/');
   assert.ok(contents.has(relative),'Unpackaged local module '+relative+' in '+file);
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
 const entries=await Promise.all(files.map(async path=>[path,await readFile(resolve(process.argv[2],path))]));
 console.log('Prepared '+files.length+' frontend files locally; no deployment.');
 console.log('Frontend SHA-256 fingerprint: '+packageFingerprint(entries));
}
