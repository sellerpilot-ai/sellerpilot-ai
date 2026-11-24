# SellerPilot private beta release checklist — V61
This document is a release gate, not a certification. Source changes and mocked tests do not establish production security, provider permission, legal readiness, or live availability.

## In scope for V61
- Account-scoped onboarding milestones; no new cloud schema.
- Public fictional demo; no authentication, cloud writes or provider calls.
- Help centre, transparent plan preview and feedback preparation.
- Recheck cached module URLs, mobile and desktop usability, demo isolation, account-change handling and existing mock regressions.
- Verify the deployed version with an existing authorised private tester before expanding private access.

## Blockers before public commercial launch
- Etsy commercial application and permission for relevant analytics/AI use; validate actual allowed endpoints and data retention. No fabricated demand, rankings or sales.
- Confirm provider terms, data processing and lawful data sources; marketplace approval alone does not supply search volumes.
- Production payment design, signed webhook reconciliation, server-side entitlement enforcement, refunds/cancellation, billing and taxes. Keep real billing disabled until separately tested.
- Confirm server-side registration restrictions, production Row Level Security and account isolation against the actual database. Mock tests are not a substitute for live review.
- Publish verified business/support identity and reviewed privacy/terms, retention, deletion and data subject request procedures.
- Review dependency vulnerabilities, secret storage, abuse limits, CSP/hosting limitations and operational recovery.
- Confirm commercial pricing separately; current test prices remain unchanged.
- Collect real tester feedback and measure actual load/performance before scale.

## Verification
- CI: full unit and browser workflow; attach run link to the pull request.
- Deployment: verify Pages success and canonical V61 module requests.
- Live private verification: open workspace, inspect onboarding, assistant, research and account screens; sample demo fix/undo; sign-out isolation; no real transactions.
- No public registration, paid AI activation, real checkout, marketplace integration or schema changes in this release.
