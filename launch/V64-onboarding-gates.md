# V64 — Public entry and invitation preparation

- `index.html` is the customer landing page; `app.html` is the private workspace. `home.html` stays a compatible public alias.
- Existing numbered workspace URLs, Supabase recovery/confirmation fragments and test billing return URLs are forwarded to the same-origin app. The configured Supabase redirect URL stays unchanged. Etsy's dedicated callback URL is unchanged; its final workspace link is updated.
- Recovery requires a Supabase PASSWORD_RECOVERY event and a verified session before password update. Mock browser regression covers forwarding and reset; real confirmation and recovery emails must be tested separately.
- Public beta checklist creates only a local file and does not collect personal details, register, submit or store a waitlist application.
- Before enabling actual beta intake, confirm legal operator and verified business support contact, publish approved privacy and beta terms, establish retention/deletion procedures, restrict public signup at Supabase, verify invitation SMTP/redirect settings, implement a secured invitation/intake process with abuse protection, and complete two-account RLS tests.
- No new API costs, payment settings, database mutations, secret changes, AI or marketplace activation.
- Existing operator sandbox remains test-only; do not grant new testers access to operator billing endpoints. Check production and sandbox authorization separately.
- Live deployment acceptance: clean browser opens landing page; Sign in opens app; legacy link resolves to app; existing owner can sign in and sees saved data; demo, help, beta checklist and policy links work; internal Pages artifacts remain excluded. Check actual recovery and invitation flows before admitting new users.
