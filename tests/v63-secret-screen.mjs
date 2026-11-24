// Credential-pattern screening. Never print matched token values. Not a substitute for a managed secret scanner.
import {execFileSync} from 'node:child_process';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:30*1024*1024});
const fixtures=new Set(['sk_test_fixture_not_real','sk_test_fixture_not_a_real_key','sk_live_fixture_not_real','whsec_fixture_signing_secret']);
const rules=[
 ['OpenAI',/\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{24,}\b/g],
 ['Stripe private key',/\b(?:sk|rk)_(?:test|live)_[A-Za-z0-9_]{12,}\b/g],
 ['Stripe signing secret',/\bwhsec_[A-Za-z0-9_]{16,}\b/g],
 ['Supabase secret',/\bsb_secret_[A-Za-z0-9_-]{15,}\b/g],
 ['GitHub access token',/\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g],
 ['Database password URI',/postgres(?:ql)?:\/\/[^\s"'<>:@]+:[^\s"'<>@]+@[^\s"'<>]+/g],
 ['Private key PEM',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
 ['JWT candidate',/\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{16,}\b/g]
];
function scan(text,path){let findings=[];for(const [label,pattern] of rules){for(const match of text.matchAll(pattern)){const v=match[0];if(fixtures.has(v))continue;if(label==='JWT candidate'){try{const p=JSON.parse(Buffer.from(v.split('.')[1],'base64url').toString());if(p.role==='anon')continue;if(p.role!=='service_role'&&!p.role)continue;}catch{continue}}findings.push({path,label})}}return findings}
const objects=git('rev-list','--objects','HEAD').trim().split('\n').map(l=>{const i=l.indexOf(' ');return [i<0?l:l.slice(0,i),i<0?'':l.slice(i+1)]}).filter(([,p])=>p&&/\.(?:js|mjs|ts|html|md|txt|json|sql|yml|yaml|env|ini|toml|pem|key)$/i.test(p)||p&&/(^|\/)\.env(?:\.|$)/.test(p));
let findings=[],checked=0;
for(const [sha,path] of objects){const type=git('cat-file','-t',sha).trim();if(type!=='blob')continue;const content=git('cat-file','blob',sha);checked++;findings.push(...scan(content,path))}
if(findings.length){for(const {path,label} of [...new Map(findings.map(f=>[f.path+'|'+f.label,f])).values()])console.error('Possible credential: '+label+' in '+path);process.exitCode=1}
else console.log('PASS: screened '+checked+' reachable historical/current text blobs; no matched credential patterns. This is not a comprehensive secret audit.');
