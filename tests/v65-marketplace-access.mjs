import assert from 'node:assert/strict';
import {providerAccess as shop} from '../supabase/functions/sellerpilot-shop-listings/provider-access.mjs';
import {providerAccess as competitor} from '../supabase/functions/sellerpilot-competitor-search/provider-access.mjs';
const uid='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const user={id:uid,email_confirmed_at:'2026-01-01',is_anonymous:false};
const config={SELLERPILOT_ETSY_API_KEY:'fixture',SELLERPILOT_EBAY_CLIENT_ID:'fixture',SELLERPILOT_EBAY_CLIENT_SECRET:'fixture'};
const disabled={etsy:false,ebay:false};
for(const access of [shop,competitor]){
 const run=(c={},u=user)=>access(k=>({...config,...c})[k]||'',u);
 assert.deepEqual(run(),disabled);
 const ready={SELLERPILOT_ETSY_APPROVED:'true',SELLERPILOT_EBAY_APPROVED:'true',SELLERPILOT_MARKETPLACE_BETA_USER_IDS:uid};
 assert.deepEqual(run({...ready,SELLERPILOT_MARKETPLACE_BETA_USER_IDS:''}),disabled);
 assert.deepEqual(run({...ready,SELLERPILOT_MARKETPLACE_BETA_USER_IDS:other,SELLERPILOT_AI_BETA_USER_IDS:uid}),disabled);
 assert.deepEqual(run(ready,{...user,email_confirmed_at:null}),disabled);
 assert.deepEqual(run(ready,{...user,is_anonymous:true}),disabled);
 assert.deepEqual(run({...ready,SELLERPILOT_ETSY_APPROVED:'false'}),{etsy:false,ebay:true});
 assert.deepEqual(run({...ready,SELLERPILOT_EBAY_CLIENT_SECRET:''}),{etsy:true,ebay:false});
 assert.deepEqual(run(ready),{etsy:true,ebay:true});
}
console.log('PASS: both marketplace gates require explicit approval, provider credentials and a separately authorized confirmed account. No network calls.');
