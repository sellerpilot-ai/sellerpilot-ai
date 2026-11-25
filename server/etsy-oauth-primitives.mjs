// Server-side primitives only; no route, storage or network requests.
import {randomBytes, createHash} from 'node:crypto';
export function createPendingAuthorization(userId, now=Date.now()) {
 if(typeof userId!=='string'||!userId.trim()||!Number.isSafeInteger(now)||now<0||now>Number.MAX_SAFE_INTEGER-600000) throw Error('Invalid authorization context');
 const verifier=randomBytes(32).toString('base64url');
 return {userId, state:randomBytes(32).toString('base64url'), verifier, challenge:createHash('sha256').update(verifier).digest('base64url'), issuedAt:now, expiresAt:now+600000};
}
export function authorizationUrl(pending, clientId, redirectUri) {
 if(!pending||!validCallback(pending,pending.userId,pending.state,pending.issuedAt)||!/^[-_A-Za-z0-9]{43}$/.test(pending.verifier)||pending.challenge!==createHash('sha256').update(pending.verifier).digest('base64url')) throw Error('Invalid pending authorization');
 const redirect=new URL(redirectUri);
 if(redirect.protocol!=='https:'||redirect.username||redirect.password||redirect.hash||typeof clientId!=='string'||!clientId.trim()) throw Error('Invalid OAuth configuration');
 const url=new URL('https://www.etsy.com/oauth/connect');
 url.search=new URLSearchParams({response_type:'code',client_id:clientId,redirect_uri:redirectUri,scope:'listings_r shops_r',state:pending.state,code_challenge:pending.challenge,code_challenge_method:'S256'}).toString();
 return url.toString();
}
// Caller MUST atomically consume the stored state for this authenticated user before exchanging a code.
export function validCallback(pending,userId,state,now=Date.now()) {
 return !!pending&&typeof state==='string'&&/^[-_A-Za-z0-9]{43}$/.test(state)&&pending.state===state&&typeof userId==='string'&&!!userId.trim()&&pending.userId===userId&&Number.isSafeInteger(pending.issuedAt)&&pending.issuedAt>=0&&Number.isSafeInteger(pending.expiresAt)&&pending.expiresAt-pending.issuedAt===600000&&Number.isSafeInteger(now)&&now>=pending.issuedAt&&now<pending.expiresAt;
}

// Offline prototype only. Production requires durable atomic storage across instances.
export function createMockStateStore(limit=100){
 if(!Number.isSafeInteger(limit)||limit<1||limit>1000)throw Error('Invalid state limit');
 const records=new Map();
 const key=state=>createHash('sha256').update(state).digest('hex');
 return {
  issue(userId,now=Date.now()){
   const pending=createPendingAuthorization(userId,now);
   for(const [id,record] of records)if(record.expiresAt<=now)records.delete(id);
   if(records.size>=limit)throw Error('Pending authorization capacity reached');
   records.set(key(pending.state),{...pending});
   return pending;
  },
  consume(userId,state,now=Date.now()){
   if(typeof state!=='string'||state.length!==43)return null;
   const id=key(state),pending=records.get(id);
   if(!validCallback(pending,userId,state,now))return null;
   records.delete(id);
   return {userId:pending.userId,verifier:pending.verifier};
  }
 };
}
