// Release evidence only. Does not deploy, change credentials or contact providers.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {packageFingerprint} from './v115-static-package.mjs';
import {buildCloudflarePackage} from './v122-cloudflare-package.mjs';
const [output,evidence]=process.argv.slice(2);
if(!output||!evidence)throw Error('Usage: node tests/v119-release-manifest.mjs NEW_FRONTEND_DIR NEW_EVIDENCE_DIR');
const out=resolve(output),proof=resolve(evidence);
assert.ok(out!==proof&&!proof.startsWith(out+'/')&&!out.startsWith(proof+'/'),'Keep evidence outside the frontend output');
const candidate=process.env.SELLERPILOT_CANDIDATE_SHA||'';
const checkout=process.env.SELLERPILOT_CHECKOUT_SHA||'';
assert.match(candidate,/^[a-f0-9]{40}$/,'Candidate SHA required');
assert.match(checkout,/^[a-f0-9]{40}$/,'Checkout SHA required');
const files=await buildCloudflarePackage(process.cwd(),out);
const entries=await Promise.all(files.map(async path=>[path,await readFile(resolve(out,path))]));
const manifest={
 format:'sellerpilot-cloudflare-release-evidence-v2',
 status:'DEVELOPMENT CANDIDATE — NOT APPROVED FOR DEPLOYMENT',
 candidate_sha:candidate,checkout_sha:checkout,
 fingerprint_sha256:packageFingerprint(entries),
 file_count:entries.length,
 files:entries.map(([path,bytes])=>({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}))
};
await mkdir(proof);
await writeFile(resolve(proof,'manifest.json'),JSON.stringify(manifest,null,2)+'\n',{flag:'wx'});
console.log('Release evidence: '+manifest.file_count+' frontend files; SHA-256 '+manifest.fingerprint_sha256+'; no deployment.');
