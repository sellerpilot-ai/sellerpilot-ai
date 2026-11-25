// Server-side primitives only; no route, storage or network requests.
import {randomBytes, createHash} from 'node:crypto';
export function createPendingAuthorization(userId, now=Date.now()) {
 if(typeof userId!=='string'||!userId.trim()||!Number.isSafeInteger(now)||now<0) throw Error('Invalid authorization context');
 const verifier=randomBytes(32).toString('base64url');
 return {userId, state:randomBytes(32).toString('base64url'), verifier, challenge:createHash('sha256').update(verifier).digest('base64url'), expiresAt:now+600000};
}
export function authorizationUrl(pending, clientId, redirectUri) {
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=='https:'||redirect.username||redirect.password||redirect.hash||typeof clientId!=='string'||!clientId.trim()) throw Error('Invalid OAuth configuration');
 const url=new URL('https://www.etsy.com/oauth/connect');
 url.search=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,scope:'listings_r shops_r',state:pending.state,code_challenge:pending.challenge,code_challenge_method:'S256'}).toString();
 return url.toString();
}
// Caller MUST atomically consume the stored state for this authenticated user before exchanging a code.
export function validCallback(pending,userId,state,now=Date.now()) {
 return !!pending&&typeof state==='string'&&state.length===43&&pending.state===state&&pending.userId===userId&&Number.isSafeInteger(now)&&now>=0&&now<pending.expiresAt;
}
