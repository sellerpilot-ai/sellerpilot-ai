# V27 AI optimisation — activation checklist

This branch prepares a paid AI integration but does not deploy or activate it. No API credentials belong in GitHub, the browser, screenshots or logs.

1. Verify the SQL draft in a controlled Supabase environment, including concurrent requests, ownership, RLS and grants. Apply using the project's approved migration workflow; run security advisors.
2. Deploy the Edge Function with JWT verification enabled. The handler separately checks the verified user and reads only that user's RLS-protected product.
3. Configure a dedicated restricted OpenAI project key securely in Supabase Secrets. Review pricing and supported model; candidate model gpt-5.6-terra supports structured output and low reasoning effort. Set model, per-user daily cap, global daily/monthly cap and an approved OpenAI project budget. Keep SELLERPILOT_AI_ENABLED false until approval.
4. Verify disabled status and unauthorised access. Use a synthetic listing for a single approved paid end-to-end test. Validate output, actual cost, quotas and privacy notice. Review data retention requirements and update the public privacy policy before broad launch.
5. Only then set SELLERPILOT_AI_ENABLED=true for approved beta testing. No automatic publishing. The fallback brief remains free.

Required environment variable names: SELLERPILOT_OPENAI_KEY, SELLERPILOT_OPENAI_MODEL, SELLERPILOT_AI_ENABLED, SELLERPILOT_AI_DAILY_CAP, SELLERPILOT_AI_MONTHLY_CAP, SELLERPILOT_AI_USER_DAILY_CAP. Existing Supabase runtime secrets are used server-side only. Reservation counts attempts conservatively, including upstream failures; caps limit request counts, not exact cost.

References: https://supabase.com/docs/guides/functions/auth-headers ; https://developers.openai.com/api/docs/guides/structured-outputs ; https://developers.openai.com/api/docs/models/gpt-5.6-terra

## V28 addition
Image analysis uses the same AI endpoint and global/per-user quota, plus a separate SELLERPILOT_AI_IMAGE_ENABLED switch (false by default). Confirm image-processing costs and data handling before enabling. The browser re-encodes to a bounded JPEG; the backend rejects oversized dimensions and common metadata markers. No photo is stored by SellerPilot. Provider retention is subject to the applicable service terms. Reference: https://developers.openai.com/api/docs/guides/images-vision

## V34 superseding beta controls
See launch/V34-AI-BETA.md for the current configuration. Older model and quota suggestions above are historical. Only the two reviewed efficient models are accepted, with hard maximum request counts and a verified-account allowlist. No public activation.
