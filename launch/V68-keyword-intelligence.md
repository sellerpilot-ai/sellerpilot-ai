# V68 — Advanced Google keyword intelligence
- Frontend-only release; existing DataForSEO account allowlist, five-task trial cap, private cache and backend remain unchanged.
- Sort/filter actual returned phrases, select monthly bar chart, identify tied highest observed months, retain unknown values as unavailable, distinguish zero.
- Compare the latest UK and US reports in the current authenticated session using exact shared phrases, separate retrieval timestamps, and no implied common collection date. No background calls; preparing the other region clears consent. Identical batch may reuse the 30-day cache.
- Optional local product wording overlap is not validated product relevance, Etsy demand or a ranking score. User confirms audit editor handoff; focus phrase remains unsaved. Phrase shortlist uses existing per-account device storage. No provider data automatically sent to AI or marketplace.
- No new provider requests during building/testing; CI uses synthetic fixtures. After green CI and deploy, confirm the original UK batch cache hit, then one explicitly authorised US batch and verify counters. Trial budget remains 1/5 consumed from V67's initial live test until real requests are made.
- Etsy data approval, production billing, privacy/retention and beta access gates remain separate.
