# V34 — AI beta activation and model strategy (24 November 2026)

Default candidate: gpt-6.1-terra for text and image. gpt-6-luna may be selected separately for images or text after a synthetic quality comparison. Standard processing only; no premium processing, search tools, automatic retries or client model selection. Compare quality against synthetic Etsy listings and photos; do not assume the cheapest model is best. New models require reviewed allowlist/pricing changes and regression tests. The single-provider adapter avoids a second billing account during beta.

Configuration (set in Supabase Edge Function Secrets; no actual secret values in repository):
- SELLERPILOT_OPENAI_KEY = dedicated restricted project API key, Responses permission only as appropriate
- SELLERPILOT_OPENAI_MODEL = gpt-6.1-terra
- SELLERPILOT_OPENAI_IMAGE_MODEL = gpt-6.1-terra
- SELLERPILOT_AI_DAILY_CAP = 10
- SELLERPILOT_AI_MONTHLY_CAP = 100
- SELLERPILOT_AI_USER_DAILY_CAP = 3
- SELLERPILOT_AI_BETA_USER_IDS = comma-separated verified test-account UUIDs (private config)
- SELLERPILOT_AI_ENABLED = false initially
- SELLERPILOT_AI_IMAGE_ENABLED = false initially

The handler supports new Supabase default publishable and secret keys from runtime JSON, with legacy compatibility. It verifies the user's JWT via Auth before account access; admin requests send new secret keys only in apikey headers. Use JWT verification when compatible with project config. Test real user authentication separately. Paid calls require an atomic server-side reservation; failures count conservatively. Cap is request count, not exact currency spend.

Approved testing budget £10 inclusive of applicable taxes/FX; set OpenAI dedicated project USD spend hard limit below that, suggest US$5 initially, alerts, restrict model access and disable automatic credit reload if applicable. Actual provider enforcement may lag; no absolute monetary guarantee. API billing is separate from ChatGPT subscription. Do not enable before verifying project billing controls, secure key, private allowlist and review of provider data handling. Use synthetic input first. No automatic fallback to expensive models.

References:
https://developers.openai.com/api/docs/models/gpt-6.1-terra
https://developers.openai.com/api/docs/models/gpt-6-luna
https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform
https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys
