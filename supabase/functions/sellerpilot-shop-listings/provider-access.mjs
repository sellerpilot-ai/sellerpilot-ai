// V65: credentials alone never constitute approval. No live calls unless explicitly enabled for a confirmed, allowlisted operator.
export function providerAccess(env,user){
 const uid=user?.id||'';
 const allowed=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid)&&!!user.email_confirmed_at&&user.is_anonymous!==true&&String(env('SELLERPILOT_MARKETPLACE_BETA_USER_IDS')||'').split(',').map(x=>x.trim()).includes(uid);
 return {etsy:!!(allowed&&env('SELLERPILOT_ETSY_APPROVED')==='true'&&env('SELLERPILOT_ETSY_API_KEY')),ebay:!!(allowed&&env('SELLERPILOT_EBAY_APPROVED')==='true'&&env('SELLERPILOT_EBAY_CLIENT_ID')&&env('SELLERPILOT_EBAY_CLIENT_SECRET'))};
}
