# V70–V84 review checklist

Review branch: overnight-v70-v79; draft PR #48. Production baseline V69. All work here is review-only. No automatic publication, paid provider calls, new subscription activation, real Etsy authentication, production database/credential changes, or production deployment are authorised.

## Development status
- V70: local review-priority scoring, warnings, sorting and filters implemented. Score = 70% local word overlap and 30% logarithmic Google volume relative to report maximum; missing inputs yield no score. Warnings are heuristics, not factual or legal verification. Historical peak signal requires six observed months and a peak at least 1.5 times observed mean; no forecast.
- V71: filtered Google research CSV export, source/region/time provenance and spreadsheet formula protection implemented.
- V72: review-only tag addition to a private draft editor. Reject ambiguous, unreported, unsupported or stale product actions; require explicit confirmation; never save automatically or publish. Browser test covers cancel, accept and unchanged cloud fixture.
- V73: accessible research controls and trend focus; existing offline OAuth state/PKCE fixtures.
- V74: local, no-cost quick-start tutorial; offline read-only catalogue validation. No live Etsy access.
- V75: phrase count and preflight length/count validation; clearly distinguish local actions from external research task reservations. Existing sandbox billing and server allowance controls retained unchanged. No new provider call or subscription purchase.
- V76: approved 32px PNG from the saved logo pack embedded unchanged in a local SVG wrapper. Replaced header symbol and added favicon across app, landing, help, beta, privacy, terms and demo. Emerald and Indigo palette retained. Asset SHA-256 pinned in browser regression; visual/high-density QA still recommended.
- V77: offline-only PKCE and authorization state foundation, strict read-only scopes, single-use mock state, timestamp and challenge integrity. No token exchange, durable storage or connected-shop route yet.
- V78: reject cross-shop and malformed catalogue fields, minimise returned fields and flag Etsy API data as read-only / AI prohibited. No live data processed; no claim of complete production security certification.
- V79: expanded mock browser regression for filtered CSV download, preview cancel/accept, unchanged stored product, input guard, trend focus, logo and favicon. Existing full suite retained.

## Verified test baseline and release gates
- [x] Checkpoint c61aff11: offline and existing mock browser workflows passed.
- [x] c969e309: offline and existing mock browser workflows passed after first customer-facing fixes.
- [x] a8f520da: expanded offline keyword, OAuth and catalogue fixtures passed.
- [x] V79 code head 8364abe8: both offline (45573450749) and expanded mock browser (45573450637) passed, including direct mobile return navigation and unchanged cloud product.
- [ ] Confirm offline and full mock browser workflows at the latest V84 head.
- [ ] Check final branch CI, no merge conflicts, no credential exposure, and confirm manual desktop/mobile visual QA.
- [ ] Keep the draft PR unmerged; no production or live billing changes without explicit owner approval.
- [ ] Etsy integration remains disabled pending official app approval, exact registered callback configuration, durable atomic user-bound state, secure encrypted token storage, authorised shop identity verification, rate limits, and review of applicable Etsy API restrictions. Do not enable live authentication or data access as part of this review.

Offline command: `node --experimental-default-type=module tests/v70-opportunity.mjs`; run the existing offline Etsy tests and existing browser regression in a mocked environment. GitHub Actions is authoritative for per-commit results. Do not mark pending tests as passed based on an earlier head.

## V80–V84 customer-facing batch
- V80: bounded local multi-tag plan from already retrieved, currently filtered research; evaluate each suggestion against original listing wording, reject duplicates, unsupported phrases and over-capacity selections.
- V81: accessible multi-select panel in Keyword Lab with free slots and candidate count; selection resets when results redraw.
- V82: live before/after tag preview and clear selection; no provider request or storage write.
- V83: explicit confirmation opens the editor with the proposed tags; no automatic cloud save or marketplace publication. Existing edits may be replaced only after confirmation.
- V84: offline fixtures for duplicate/over-capacity/unknown rows, immutable original and marketplace restrictions; mocked browser checks for multi-selection, clear, cancel, preview, return and no cloud save. Final-head CI and manual visual QA still required.
