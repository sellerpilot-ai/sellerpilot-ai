# V66 — Real AI allowance (pre-beta)
- The AI Studio reads real quota availability on opening, manual refresh and after a generation attempt.
- Same existing server caps, not Stripe test credits. Read-only service-role query; returns only personal remaining requests and effective shared availability, daily/monthly reset, monthly-exhausted flag. No usage reset, no cap increase, no provider call.
- SQL and Edge Function are staged. After CI and merge, apply the new read-only RPC, verify service-only privileges and no writes, deploy reviewed ai-copy version preserving all existing files and JWT verification, then verify live with both accounts. The old status action remains unchanged for compatibility.
- A successful deployment does not open the beta. Separate Stripe operator secret/deployment, secure invitation settings, actual text/photo generation tests, approved legal/support information, and direct API security checks remain release gates.
