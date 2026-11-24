// V38 server-only checkout candidate. Not imported by the website or deployed.
// The caller MUST establish verified identity and retrieve the price mapping from
// trusted server configuration. This module cannot grant subscription entitlement.
const plans=new Set(['starter','professional']);
const currencies=new Set(['GBP','USD']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const origin='https://sellerpilot-ai.github.io/sellerpilot-ai/';
const priceId=/^price_[A-Za-z0-9_]{4,100}$/;
const customerId=/^cus_[A-Za-z0-9_]{4,100}$/;
export function testCheckout({verifiedUser,selection,config,customer=null}){
 if(config?.mode!=='test'||config?.enabled!==true||!/^sk_test_/.test(config?.secretKey||''))throw Error('Test checkout disabled');
 if(!uuid.test(verifiedUser?.id||'')||!verifiedUser?.email_confirmed_at||verifiedUser?.is_anonymous===true)throw Error('Verified account required');
 if(!selection||Object.keys(selection).some(k=>!['plan','currency'].includes(k))||!plans.has(selection.plan)||!currencies.has(selection.currency))throw Error('Unsupported plan selection');
 const price=config.prices?.[selection.plan]?.[selection.currency];
 if(!priceId.test(price||''))throw Error('Test price not configured');
 if(customer!==null&&(!customerId.test(customer?.providerId||'')||customer.userId!==verifiedUser.id||customer.mode!=='test'))throw Error('Customer mapping mismatch');
 return {mode:'subscription',line_items:[{price,quantity:1}],client_reference_id:verifiedUser.id,subscription_data:{metadata:{sellerpilot_user_id:verifiedUser.id}},success_url:origin+'?billing=test-return',cancel_url:origin+'?billing=test-cancel',...(customer?{customer:customer.providerId}:{})};
}
// A browser redirect, checkout result or unsigned event NEVER grants access.
// Future provider adapter must retrieve authoritative subscription/invoice state
// and persist it using a verified, deduplicated webhook transaction.
export function proposedAccess({verifiedUserId,subscription,now=Date.now()}){
 if(!uuid.test(verifiedUserId||'')||!subscription||subscription.userId!==verifiedUserId||subscription.source!=='verified_provider'||subscription.mode!=='test'||!plans.has(subscription.plan)||!['active','trialing'].includes(subscription.status)||!Number.isFinite(subscription.periodEnd)||subscription.periodEnd<=now)return {allowed:false,scope:'none'};
 return {allowed:true,scope:'sandbox-only',plan:subscription.plan};
}
