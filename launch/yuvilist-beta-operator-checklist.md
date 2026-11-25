# YuviList private beta operator checklist (draft)
 
This is an internal operating proposal, not a public invitation, binding privacy notice or authorisation to deploy or charge. Live Etsy access is out of scope. Use fictional or seller-owned/authorised listing data only. Do not copy customer details, access links, recovery tokens, financial details or secrets into this public repository.
 
## One consolidated owner-assisted acceptance session
 
Prerequisites: exact successful candidate CI, verified 54-file package, recorded current Cloudflare deployment/rollback, Access protection unchanged, legal operator and privacy/terms approval before onboarding anyone external.
 
1. Upload the verified inner ZIP to the existing protected Pages project only after approval. Preserve old deployment and original host. Test a fresh unauthorised browser against root, app and billing routes; confirm Access login rather than page content. Test authorised access separately. A missing OTP alone is not conclusive proof of rejection. Never ask for credentials or recovery links.
2. On new origin sign in to the existing workspace; verify known catalogue and saved research, inspect a listing, make an unsaved guided edit and undo, compare score, and test export. If a persisted create/edit/delete test is needed, use a uniquely marked fictional record and remove only that fixture. Do not alter real listings. Check a separately authorised test account shows only its own data. Verify mobile sign-out; distinguish Cloudflare Access from workspace sign-in.
3. From an authorised fresh browser initiate password recovery at the new host; check branded sender and new exact host recovery page. Do not change an existing account password solely to test. Test actual password replacement on an approved disposable account and verify old password rejected. No screenshots with secrets.
4. Check AI allowance/status and research availability read-only; no generation or paid lookup without consent and budget approval. Sandbox plan read-only status may be checked; real payments never enabled in this session.
5. Verify a support reply from the branded mailbox and its reply path; document actual sender, delivery and handling. Inbound forwarding is already tested, outbound human reply is not. Use a fictional message with no personal data.
6. After operator and policy approval, create a separate disposable account and perform the documented rights/deletion rehearsal. Verify session revocation/expiry, all relevant table counts and unrelated account unaffected. Never delete either existing account. Confirm third-party and backup limitations before making promises.
7. Record only pass/fail, candidate SHA, deployment identifier, browser/platform, date, and non-personal observations in GitHub. Roll back frontend if a critical issue occurs. Backend baseline is c34bf2366987ba60124f86142a5857cab11c8ef4; only roll back approved affected functions if necessary.
 
## First 5–10 external testers (after approval)
 
Invite individually and manually; no public signup or paid subscription. Verify identity and authorise exact Access email, create a private account via the approved invite method, send the final privacy/terms information and provide a clear exit/contact route. Do not share one account among testers. Keep optional paid providers disabled for new testers unless specifically budgeted and authorised.
 
Suggested 15–25 minute exercise: try the fictional sample, add/import five authorised products (or use sample only), run an audit, apply and save one safe improvement, inspect keyword ideas and the profit planner, return to the saved record and report confusion. Do not require any store connection. Never promise search volume, ranking or sales. Record time to first useful result, task completion, usefulness (1–5), friction, willingness to pay (optional), and feature requests; collect feedback privately with permission, without collecting listing content unnecessarily.
 
Suggested invitation draft (do not send until approved):
 
"You're invited to try YuviList, a private tool for reviewing product listings. This is a free test, not a paid subscription. You can start with fictional examples or listing information you own or have permission to use. No marketplace connection is required. We would appreciate feedback on one listing audit, a suggested correction and the research tools. Participation is optional; you can stop at any time and contact support@yuvilist.com. Please review the approved privacy and beta information before joining. Do not send passwords, payment details, buyer information or API keys."
 
Support acknowledgement draft (no automated send):
 
"Thank you for contacting YuviList. We have received your message and will review it. Please do not send passwords, authentication codes, recovery links, buyer information or API keys. If this is a data protection request, we may need to verify your identity proportionately before sharing or deleting account data."
 
## Triage and release decision
 
P0: unauthorised data/access, uncontrolled spend, wrong account or payment state, or inability to revoke access — stop invitations, isolate or roll back and investigate.
P1: sign-in/recovery, save/export, key onboarding or repeated service failure — fix and rerun regression before invitations.
P2: copy, spacing, ordinary navigation or noncritical improvements — prioritise using tester evidence.
No commercial launch until billing is redesigned and independently reviewed for production, business/terms are approved and feedback supports usefulness. A sandbox pass is not permission to take money.
