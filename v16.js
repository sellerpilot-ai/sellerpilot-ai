/* SellerPilot AI — Version 16 auth/cloud beta (2026-11-23)
 * Add to existing v14/v15 GitHub Pages after v15.js:
 * <script src="v16.js"></script>
 * Only the public Supabase URL and PUBLISHABLE KEY are embedded.
 * No secrets, AI key, or service-role token may be placed here.
 * Cloud sync is manual. Existing browser drafts stay local until user opts in.
 */
(async () => {
  'use strict';
  const PROJECT_URL = 'https://aczqdgjyeztaexsxmdww.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_wH2kvU7SEKsC6-z6X0DLYw_-X2NZ93q';
  const REDIRECT_URL = 'https://sellerpilot-ai.github.io/sellerpilot-ai/';
  const LOCAL_KEY = 'sellerpilot_demo_v1';
  const APP_VERSION = 'v16';
  const byId = (id) => document.getElementById(id);
  const settings = byId('settings');
  if (!settings) return;

  const style = document.createElement('style');
  style.textContent = `
    .v16-card{background:#fff;border:1px solid #e5e8f3;border-radius:19px;padding:24px;margin:20px 0;box-shadow:0 8px 28px #252a4b0a}
    .v16-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
    .v16-heading h2{font-size:20px;color:#1f2947;margin:0}
    .v16-kicker{display:inline-flex;color:#5b4bd5;background:#eeebff;border-radius:999px;font-weight:750;font-size:11px;padding:6px 10px}
    .v16-intro{color:#6e7b97;font-size:13px;line-height:1.65;margin:10px 0 17px}
    .v16-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .v16-field{margin:10px 0}.v16-field label{display:block;color:#3c4663;font-size:12px;font-weight:750;margin:0 0 7px}
    .v16-field input{background:#fbfcff;border:1px solid #dfe3f0;border-radius:10px;padding:12px;width:100%;color:#16213e}
    .v16-field input:focus{outline:3px solid #e6e2ff;border-color:#7e6ff0}
    .v16-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}
    .v16-btn{border:0;border-radius:11px;background:#5b4eea;color:white;font-size:13px;padding:11px 15px;font-weight:760;cursor:pointer}
    .v16-btn.secondary{background:#f0efff;color:#4c3dc4}
    .v16-btn.danger{background:#fff0f1;color:#a6334a}
    .v16-btn:disabled{opacity:.58;cursor:wait}
    .v16-status{border:1px solid #e0e4f0;border-radius:11px;background:#f7f8fc;color:#4b5871;padding:12px 14px;font-size:12px;line-height:1.6;white-space:pre-wrap}
    .v16-status[data-kind="success"]{background:#eaf8f0;border-color:#ccebd7;color:#166440}
    .v16-status[data-kind="error"]{background:#fff1ef;border-color:#f4cfc9;color:#9a322c}
    .v16-note{font-size:12px;line-height:1.6;color:#756238;background:#fff9e8;border:1px solid #f5e7bd;border-radius:11px;padding:12px 14px;margin:12px 0}
    .v16-hide{display:none!important}.v16-identity{color:#1a6247;font-weight:750;font-size:14px}
    .v16-list{margin:10px 0 0;padding-left:19px;color:#485671;font-size:12px;line-height:1.7}
    @media(max-width:620px){.v16-card{padding:16px}.v16-row{grid-template-columns:1fr}.v16-btn{padding:12px 13px}}
  `;
  document.head.appendChild(style);
  const panel = document.createElement('div');
  panel.className = 'v16-card';
  panel.id = 'v16-account-panel';
  panel.innerHTML = `
    <div class="v16-heading"><h2>🔐 Customer Account & Cloud</h2><span class="v16-kicker">Version 16 · Beta</span></div>
    <p class="v16-intro">Create an account to test private product storage. This is a development preview, not yet a public commercial service.</p>
    <div id="v16-guest">
      <div class="v16-row">
        <div class="v16-field"><label for="v16-email">Email address</label><input id="v16-email" type="email" autocomplete="email" placeholder="you@example.com" maxlength="254"></div>
        <div class="v16-field"><label for="v16-password">Password (at least 8 characters)</label><input id="v16-password" type="password" minlength="8" autocomplete="current-password" placeholder="Enter password"></div>
      </div>
      <div class="v16-actions">
        <button type="button" class="v16-btn" id="v16-signin">Sign in</button>
        <button type="button" class="v16-btn secondary" id="v16-signup">Create account</button>
        <button type="button" class="v16-btn secondary" id="v16-forgot">Forgot password?</button>
      </div>
      <p class="v16-intro">Email verification is required. Check your inbox after creating an account.</p>
    </div>
    <div id="v16-user" class="v16-hide">
      <p>Signed in as <span class="v16-identity" id="v16-user-email"></span></p>
      <div class="v16-actions">
        <button type="button" class="v16-btn secondary" id="v16-refresh">Check cloud products</button>
        <button type="button" class="v16-btn danger" id="v16-signout">Sign out</button>
      </div>
    </div>
    <div id="v16-password-recovery" class="v16-hide">
      <p class="v16-intro">Choose a new password after opening your recovery email link.</p>
      <div class="v16-field"><label for="v16-new-password">New password (at least 8 characters)</label><input id="v16-new-password" type="password" autocomplete="new-password" minlength="8"></div>
      <div class="v16-actions"><button class="v16-btn" type="button" id="v16-set-password">Update password</button></div>
    </div>
    <div role="status" aria-live="polite" id="v16-auth-status" class="v16-status">Connecting to the authentication service…</div>
    <div id="v16-cloud" class="v16-hide">
      <h3 style="font-size:16px;margin:23px 0 9px">Private cloud product library</h3>
      <p class="v16-intro"><strong id="v16-cloud-count">0</strong> cloud drafts found. Only the signed-in user should see their own rows.</p>
      <div class="v16-actions">
        <button type="button" class="v16-btn" id="v16-upload">Upload browser drafts</button>
        <button type="button" class="v16-btn secondary" id="v16-merge">Import cloud drafts into browser</button>
        <button type="button" class="v16-btn secondary" id="v16-export">Back up local drafts</button>
      </div>
      <p class="v16-note">Cloud transfer is manual. Your existing browser drafts are never deleted or automatically uploaded. Download a backup before transferring. Deletions and local edits do not auto-sync yet.</p>
      <div id="v16-cloud-status" class="v16-status">Cloud operations have not run yet.</div>
      <ul id="v16-cloud-preview" class="v16-list"></ul>
    </div>
    <p class="v16-note"><strong>Testing only.</strong> Never paste database passwords, service-role keys or AI API keys here. Browser-stored drafts remain visible on this device even after signing out; don't share this prototype with real customers yet.</p>
  `;
  settings.insertBefore(panel, settings.firstChild);

  const authStatus = (message, kind = 'info') => { byId('v16-auth-status').textContent = message; byId('v16-auth-status').dataset.kind = kind; };
  const cloudStatus = (message, kind = 'info') => { byId('v16-cloud-status').textContent = message; byId('v16-cloud-status').dataset.kind = kind; };
  const lock = async (fn) => {
    const buttons = [...panel.querySelectorAll('button')];
    buttons.forEach(b => b.disabled = true);
    try { await fn(); } catch (e) { authStatus(e?.message || 'Unexpected error.', 'error'); }
    finally { buttons.forEach(b => b.disabled = false); }
  };

  let client;
  try {
    const sdk = await import('https://esm.sh/@supabase/supabase-js@2.119.2');
    if (typeof sdk.createClient !== 'function') throw new Error('Client library unavailable.');
    client = sdk.createClient(PROJECT_URL, PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
    });
  } catch (error) {
    authStatus('Cannot load Supabase client. Check your internet connection and refresh. ' + (error?.message || ''), 'error');
    return;
  }

  const readCredentials = () => {
    const email = byId('v16-email').value.trim();
    const password = byId('v16-password').value;
    if (!email.includes('@') || !email.includes('.')) throw new Error('Enter a valid email address.');
    if (password.length < 8) throw new Error('Enter a password containing at least 8 characters.');
    return { email, password };
  };
  const showUser = (user) => {
    const signedIn = Boolean(user?.id);
    byId('v16-guest').classList.toggle('v16-hide', signedIn);
    byId('v16-user').classList.toggle('v16-hide', !signedIn);
    byId('v16-cloud').classList.toggle('v16-hide', !signedIn);
    byId('v16-user-email').textContent = signedIn ? (user.email || 'Verified user') : '';
    if (!signedIn) { byId('v16-cloud-count').textContent = '0'; byId('v16-cloud-preview').replaceChildren(); }
  };
  const currentUser = async () => {
    const { data, error } = await client.auth.getUser();
    if (error || !data?.user?.id) throw new Error('Your session has expired. Sign in again.');
    return data.user;
  };

  byId('v16-signup').onclick = () => lock(async () => {
    const { email, password } = readCredentials();
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: REDIRECT_URL } });
    if (error) throw error;
    authStatus(data?.session ? 'Account created and signed in.' : 'If registration is available for this email, check your inbox for a confirmation link.', 'success');
    byId('v16-password').value = '';
  });
  byId('v16-signin').onclick = () => lock(async () => {
    const { email, password } = readCredentials();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    byId('v16-password').value = '';
    showUser(data.user);
    authStatus('Signed in successfully.', 'success');
    await refreshCloud();
  });
  byId('v16-forgot').onclick = () => lock(async () => {
    const email = byId('v16-email').value.trim();
    if (!email.includes('@')) throw new Error('Enter your email address first.');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_URL });
    if (error) throw error;
    authStatus('If an account exists for this email, a password recovery link has been requested.', 'success');
  });
  byId('v16-set-password').onclick = () => lock(async () => {
    const password = byId('v16-new-password').value;
    if (password.length < 8) throw new Error('New password must be at least 8 characters.');
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
    byId('v16-new-password').value = '';
    byId('v16-password-recovery').classList.add('v16-hide');
    authStatus('Password updated. Keep it safe.', 'success');
  });
  byId('v16-signout').onclick = () => lock(async () => {
    const { error } = await client.auth.signOut();
    if (error) throw error;
    showUser(null);
    authStatus('Signed out of cloud. Browser drafts remain on this device.', 'success');
  });

  const localProducts = () => {
    try {
      const p = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      return Array.isArray(p) ? p.filter(x => x && typeof x.title === 'string').slice(0, 5000) : [];
    } catch { return []; }
  };
  const downloadFile = (filename, text) => {
    const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2500);
  };
  byId('v16-export').onclick = () => {
    downloadFile('sellerpilot-local-backup.json', JSON.stringify({format:'sellerpilot-backup',version:16,products:localProducts()},null,2));
    cloudStatus('Browser backup download requested.', 'success');
  };

  const fetchCloud = async () => {
    await currentUser();
    const { data, error } = await client.from('products')
      .select('id,title,description,tags,price,sku,attributes,created_at')
      .order('created_at', { ascending: false }).limit(1000);
    if (error) throw error;
    return data || [];
  };
  const showCloudRows = rows => {
    byId('v16-cloud-count').textContent = String(rows.length);
    const ul = byId('v16-cloud-preview'); ul.replaceChildren();
    rows.slice(0, 6).forEach(p => { const li = document.createElement('li'); li.textContent = p.title; ul.appendChild(li); });
    if (rows.length > 6) { const li = document.createElement('li'); li.textContent = `…and ${rows.length - 6} more`; ul.appendChild(li); }
  };
  const refreshCloud = async () => {
    try {
      const rows = await fetchCloud();
      showCloudRows(rows);
      cloudStatus('Cloud list loaded. Products shown above belong to your signed-in account.', 'success');
    } catch (e) { cloudStatus(e?.message || 'Unable to load cloud data.', 'error'); }
  };
  byId('v16-refresh').onclick = () => lock(refreshCloud);

  byId('v16-upload').onclick = () => lock(async () => {
    const entries = localProducts();
    if (!entries.length) { cloudStatus('No local drafts to upload.'); return; }
    if (entries.length > 200) throw new Error('For safety, upload 200 or fewer drafts per batch in this beta.');
    if (!confirm(`Upload ${entries.length} browser product drafts to your private Supabase account? Nothing will be deleted locally.`)) return;
    const remote = await fetchCloud();
    const byBrowserId = new Map();
    remote.forEach(row => { if (row.attributes?.browser_id) byBrowserId.set(String(row.attributes.browser_id), row); });
    let added = 0, updated = 0, failed = 0;
    for (const p of entries) {
      const price = Number(p.price);
      if (!p.title?.trim() || !Number.isFinite(price) || price < 0) { failed++; continue; }
      const browserId = String(p.id || `p-${p.title}`);
      const fields = {
        title: String(p.title).slice(0,250), description: String(p.description || '').slice(0,10000),
        tags: String(p.tags || '').slice(0,6000), sku: String(p.sku || '').slice(0,200),
        price, attributes: { browser_id: browserId, source: 'sellerpilot-v16-browser' },
        updated_at: new Date().toISOString()
      };
      const existing = byBrowserId.get(browserId);
      const result = existing
        ? await client.from('products').update(fields).eq('id', existing.id).select('id').single()
        : await client.from('products').insert(fields).select('id').single();
      if (result.error) { failed++; continue; }
      if (existing) updated++; else { added++; byBrowserId.set(browserId, { id: result.data.id, attributes: fields.attributes }); }
    }
    await refreshCloud();
    cloudStatus(`Upload finished. Added ${added}, updated ${updated}, skipped/failed ${failed}. Local drafts were not deleted.`, failed ? 'error' : 'success');
  });

  byId('v16-merge').onclick = () => lock(async () => {
    const rows = await fetchCloud();
    const original = localProducts();
    const local = [...original];
    const seenCloudIds = new Set(local.map(x => String(x.cloud_id || '')).filter(Boolean));
    const byLocalId = new Map(local.map((x,i) => [String(x.id || ''), i]));
    let added = 0, linked = 0;
    for (const row of rows) {
      if (seenCloudIds.has(String(row.id))) continue;
      const oldId = String(row.attributes?.browser_id || '');
      if (oldId && byLocalId.has(oldId)) {
        local[byLocalId.get(oldId)].cloud_id = row.id;
        linked++;
        continue;
      }
      local.push({
        id: 'p-cloud-' + row.id, cloud_id: row.id, title: row.title,
        description: row.description || '', tags: row.tags || '', price: Number(row.price), sku: row.sku || ''
      });
      added++;
    }
    if (!added && !linked) { cloudStatus('All cloud drafts are already present in this browser.'); return; }
    if (local.length > 5000) throw new Error('Local storage would exceed the 5000-item limit.');
    if (!confirm(`Merge cloud drafts into this browser? ${added} new drafts and ${linked} existing matches. Existing local drafts are preserved. A backup will be downloaded first.`)) return;
    downloadFile('sellerpilot-before-cloud-merge.json', JSON.stringify({format:'sellerpilot-backup',version:16,products:original},null,2));
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); }
    catch (e) { throw new Error('Browser storage is full. Backup downloaded; existing data unchanged.'); }
    cloudStatus(`Merged: ${added} new, ${linked} linked. Refresh this page to see them in Products.`, 'success');
    if (added || linked) alert('Cloud merge saved. Refresh this page to update the product catalogue.');
  });

  client.auth.onAuthStateChange((event, session) => {
    showUser(session?.user || null);
    if (event === 'PASSWORD_RECOVERY') {
      byId('v16-password-recovery').classList.remove('v16-hide');
      authStatus('Recovery link verified. Set a new password below.', 'success');
    } else if (event === 'SIGNED_IN') {
      authStatus('Cloud account connected.', 'success');
    } else if (event === 'SIGNED_OUT') {
      byId('v16-password-recovery').classList.add('v16-hide');
      authStatus('Signed out. Existing browser drafts remain local.');
    }
  });
  const { data, error } = await client.auth.getSession();
  if (error) authStatus(error.message, 'error');
  else {
    showUser(data?.session?.user || null);
    authStatus(data?.session ? 'Account session restored.' : 'Ready. Create an account or sign in.');
    if (data?.session?.user) await refreshCloud();
  }
})();
