# Overnight review checklist

- [ ] V70: initial scoring, warnings and display implemented; filters, regression execution and browser review pending.
- [ ] V71: research workflow and exports.
- [ ] V72: review-only listing suggestions.
- [ ] V73: accessibility and mobile.
- [ ] V74: private beta onboarding.
- [ ] V75: usage and sandbox readiness.
- [ ] V76: approved icon asset verification required before integration.
- [ ] V77: official Etsy API readiness only.
- [ ] V78: security/privacy review and mock tests.
- [ ] V79: regression and release checklist.

V70 score is 70% local word overlap and 30% logarithmic Google volume relative to the maximum in the returned report. Missing inputs yield no score. Brand/material checks are limited heuristics, not legal or factual verification. Historical peak signal requires six observed months and peak >= 1.5 times observed mean; not a forecast. No paid calls or production changes authorised.

Run `node --experimental-default-type=module tests/v70-opportunity.mjs` and existing browser regression in a mock environment. Do not merge or deploy without approval.
