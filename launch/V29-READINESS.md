# Commercial launch readiness — draft, not legal advice or approval

Public preview: home.html. Workspace URL remains index.html so account recovery links and existing users are unaffected. Preview is noindex and does not offer payments or invite public registration; demo is unauthenticated. The existing private development workspace retains its current account controls.

## Required before commercial onboarding
- Confirm legal operator, appropriate business structure, registered/trading/contact address and verified business support email. Do not publish personal details without authorization.
- Confirm UK data controller, data inventory, processing purposes and lawful bases, recipients/processors, retention/deletion, international transfer safeguards, rights and complaint handling. Review any US state obligations relevant to launch, provider agreements, cookie/local storage handling and ICO registration/fee obligations where applicable. Finalise a real privacy notice before broad onboarding.
- Confirm terms, billing frequency, VAT treatment, total price, plan limits, cancellation/refunds, rights, service support and fair contract terms. Review consumer versus business customer classification and applicable laws; never remove statutory rights.
- Implement full account deletion/export request handling, support workflow, incident response, error monitoring and security checks.
- AI: confirm key and budget, deploy reviewed backend, apply and test quota migration, verify actual charges and provider data handling before activation. No paid requests authorised here.
- Payments: no checkout, billing agreement or payment credentials have been created.

## Etsy application preparation
Current Etsy guidance distinguishes Seller Apps for one shop from Personal Apps that can be upgraded to Commercial Access. SellerPilot is intended for multiple sellers; use the Personal App path first, then request commercial approval. Do not claim approval until Etsy confirms it.

Draft application description: "SellerPilot is an independent listing-quality and business workflow tool for Etsy sellers. Sellers can audit their own products, review and approve copy recommendations, and maintain an improvement plan. We intend to retrieve only authorised listing and shop data required for the seller's own workspace. We do not scrape Etsy, infer unavailable marketplace statistics, collect buyer addresses or payment data, or publish changes without seller consent. CSV-based functionality works independently of API access."

Plan read-only first: verify exact scopes/endpoints against the current API reference, use OAuth 2.0 with PKCE and state for private data, store tokens only on the server, provide disconnect/revocation, comply with Etsy caching and data use policies, do not request write/transaction/buyer data scopes unless a later approved use case genuinely requires them. The API now requires the keystring and shared secret together in x-api-key; update existing marketplace functions before activation. Verify policy requirements for passing Etsy-derived data to AI before enabling that workflow. The current preview uses an independence statement; the exact API attribution required by Etsy must be present when using its API.

Sources:
- https://developers.etsy.com/documentation/
- https://developers.etsy.com/documentation/essentials/authentication/
- https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/individual-rights/the-right-to-be-informed/what-privacy-information-should-we-provide/
- https://www.gov.uk/online-and-distance-selling-for-businesses/online-selling
