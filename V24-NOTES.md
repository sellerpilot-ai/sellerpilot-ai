# SellerPilot V24 — modular workspace

V23 rollback commit: 219fc68a09be85de38ce0b437175c2358a6459e1

Browser-native ES modules; no build step or dependencies added. Existing Supabase configuration, storage keys, schema, CSS and page markup preserved. Startup order: competitor listeners, shop, dashboard, guided fixes, workspace, dashboard post-init, auth init. Guided fix actions now scroll to the workbench, while Go to this field focuses the editor. Apply and undo refresh the intelligence report immediately.

Browser authentication, mobile navigation, cloud writes and deployment require regression testing before merge.
