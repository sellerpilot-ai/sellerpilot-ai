# V56 Etsy connection readiness — 24 Nov 2026

## Verified current state
- SellerPilot AI developer application last reported pending personal approval. Do not treat it as approved or use it to circumvent any prior restriction. Resolve prior developer app restriction with Etsy officially.
- GitHub has a read-only OAuth/PKCE candidate; the sellerpilot-etsy-preview Edge Function and sellerpilot_etsy_begin/consume RPCs are not deployed. Do not deploy or enable until approval and agreed scope are confirmed.
- Existing public shop-listings and competitor-search functions are deployed with JWT verification. Their current Etsy code uses a legacy single x-api-key configuration. The current Etsy request standard requires keystring:shared_secret, so both endpoints need reviewed and tested credential handling before activation. Deployment is not evidence of valid credentials or permissions.
- SellerPilot's private catalogue, CSV workflow and independently supplied/expressly authorised product information remain separate from API-derived content.

## Approval gates
1. Confirm the new app's exact status and resolve the old app restriction with Etsy developer support. Obtain approval for the intended commercial multi-seller scope, not merely personal access.
2. Obtain Etsy's express written permission for analytics, automated collection and any AI processing of Etsy-derived content. Seller consent and OAuth scopes alone do not establish this.
3. Review permitted retention, data freshness, privacy, app attribution and pricing (including restrictions on charging for capabilities Etsy provides free). Review the permitted scope with Etsy before enabling.
4. Register exact redirect https://sellerpilot-ai.github.io/sellerpilot-ai/etsy-return.html; request listings_r only, store credentials in server-side secrets, never paste shared secrets into chat or browser code.
5. Review and apply V31 private nonce/PKCE SQL only after approval, verify service-only grants and JWT authentication, deploy candidate disabled first. Test with an authorised shop only after explicit activation approval.
6. Keep API-derived preview transient, read-only, no AI transmission, no automatic import or publishing. Separately review the public listing/competitor functions before any Etsy calls.
7. Verify actual API response and permission with a real authorised test; test revoked access, errors and rate limits. No scraping, fake statistics, or credential workarounds.

## Data limitation
Listing and shop endpoints are not evidence of actual keyword search volume, historical buyer search trends, conversion rates or competitor revenue. Any future data source must be licensed and verified; do not label result counts as searches.

References:
- https://developers.etsy.com/documentation/essentials/authentication/
- https://developers.etsy.com/documentation/essentials/requests/
- https://developers.etsy.com/documentation/reference
- https://www.etsy.com/legal/api/
- https://www.etsy.com/legal/terms-of-use
