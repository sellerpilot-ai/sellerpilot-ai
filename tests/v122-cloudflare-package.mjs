// Cloudflare Pages candidate package; local preparation only, never deploy here.
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildStaticPackage} from './v115-static-package.mjs';
// Initial restrictive CSP for existing static UI and pinned CDN dependency.
// Inline code/styles remain necessary; remote images remain permitted for listing previews.
// The real CDN dependency graph and live browser behavior require hosting acceptance.
export const securityHeaders=Object.freeze({
 'X-Content-Type-Options':'nosniff',
 'X-Frame-Options':'DENY',
 'Referrer-Policy':'no-referrer',
 'Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()',
 'X-Robots-Tag':'noindex, nofollow',
 'Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline' https://esm.sh; style-src 'self' 'unsafe-inline'; connect-src 'self' https://aczqdgjyeztaexsxmdww.supabase.co; img-src 'self' data: blob: https:; font-src 'self' data:; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
 'Cache-Control':'no-store'
});
export const pagesHeaders='/*\n'+Object.entries(securityHeaders).map(([k,v])=>'  '+k+': '+v).join('\n')+'\n';
export const missingPage='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Page not found | YuviList</title></head><body style="margin:0;padding:36px;font-family:system-ui;color:#263653;background:#eef8f3"><main><h1>Page not found</h1><p>This YuviList page is unavailable.</p><p><a href="/" style="color:#08775f">Return to YuviList</a></p></main></body></html>';
export async function buildCloudflarePackage(source,output){
 const files=await buildStaticPackage(source,output);
 await writeFile(resolve(output,'_headers'),pagesHeaders,{flag:'wx'});
 await writeFile(resolve(output,'404.html'),missingPage,{flag:'wx'});
 return [...files,'_headers','404.html'].sort();
}
