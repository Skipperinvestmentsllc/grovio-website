import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const supabase = createClient('https://trqqcvevrfuijjxsqqlt.supabase.co', 'sb_publishable_-jpPulVPJrZ2JV3BTZBhAA_kwyXVCXt');
const app = document.querySelector('#app');
const LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(window.location.hostname);
const ACCESS_CHECK_TIMEOUT_MS = 15000;
let authRenderVersion = 0;

function signInView(error = '') {
  app.innerHTML = `<section class="login-card"><div class="wordmark">grovio</div><p class="eyebrow">OWNER WORKSPACE</p><h1>Grovio Admin</h1><p>One secure place for your influencer program and marketing dashboard.</p>${error ? `<p class="notice">${escapeHtml(error)}</p>` : ''}<button class="primary" data-login="apple">Continue with Apple</button><button class="secondary" data-login="google">Continue with Google</button><small>${LOCAL_PREVIEW ? 'Apple and Google sign-in must be completed on the live Grovio website.' : 'Access is restricted to authorized Grovio owners.'}</small></section>`;
  app.querySelectorAll('[data-login]').forEach(button => button.addEventListener('click', () => signIn(button.dataset.login)));
}

function portalView(session) {
  const email = escapeHtml(session.user?.email || 'Grovio owner');
  app.innerHTML = `<section class="portal"><header><div><div class="wordmark">grovio</div><p class="eyebrow">ADMIN</p><h1>Choose your workspace</h1><p>Manage partnerships or plan and review your marketing work.</p></div><div class="account"><span>${email}</span><button data-signout>Sign out</button></div></header><div class="workspace-grid"><a class="workspace-card" href="/admin/influencers"><span class="card-icon">↗</span><div><p class="eyebrow">PARTNERSHIPS</p><h2>Influencer Program</h2><p>Create private access and follower trial codes, copy share links, and follow paid conversions toward rewards.</p></div><span class="card-link">Open influencer program →</span></a><a class="workspace-card" href="/admin/marketing"><span class="card-icon">✦</span><div><p class="eyebrow">CONTENT &amp; PERFORMANCE</p><h2>Marketing Dashboard</h2><p>Plan approved assets, drafts, social posts, SEO content, community opportunities, and channel analytics.</p></div><span class="card-link">Open marketing dashboard →</span></a></div></section>`;
  app.querySelector('[data-signout]').addEventListener('click', async () => {
    await supabase.auth.signOut();
    signInView();
  });
}

function deniedView() {
  app.innerHTML = `<section class="login-card"><div class="wordmark">grovio</div><p class="eyebrow">ADMIN</p><h1>Access isn’t enabled for this account</h1><p>Sign in with the Grovio owner account that is authorized to manage partnerships and marketing.</p><button class="secondary" data-signout>Sign out</button></section>`;
  app.querySelector('[data-signout]').addEventListener('click', async () => {
    await supabase.auth.signOut();
    signInView();
  });
}

function connectionErrorView(message = 'We could not finish checking your access.') {
  app.innerHTML = `<section class="login-card"><div class="wordmark">grovio</div><p class="eyebrow">ADMIN</p><h1>Let’s try that again</h1><p>${escapeHtml(message)}</p><button class="primary" data-retry>Retry access check</button><button class="secondary" data-signout>Use a different account</button></section>`;
  app.querySelector('[data-retry]').addEventListener('click', async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      signInView(error?.message || 'Your sign-in could not be restored. Please sign in again.');
      return;
    }
    scheduleSessionRender(session);
  });
  app.querySelector('[data-signout]').addEventListener('click', async () => {
    await supabase.auth.signOut();
    signInView();
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function signIn(provider) {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/admin/` } });
  if (error) signInView(error.message);
}

async function verifyAndRender(session) {
  app.innerHTML = '<p class="loading">Checking access…</p>';
  try {
    const result = await Promise.race([
      supabase.functions.invoke('promo-admin', { body: { action: 'list_partners' } }),
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('access_check_timeout')), ACCESS_CHECK_TIMEOUT_MS)),
    ]);
    const { data, error } = result;
    const status = error?.context?.status;
    if (status === 401 || status === 403 || data?.reason === 'forbidden') {
      deniedView();
      return;
    }
    if (error || data?.reason) throw error || new Error(data.reason);
    portalView(session);
  } catch (error) {
    console.error('Admin access check failed:', error);
    connectionErrorView(error?.message === 'access_check_timeout'
      ? 'The access check took too long. Your sign-in is safe; please retry.'
      : 'We could not reach the admin service. Please retry in a moment.');
  }
}

function scheduleSessionRender(session) {
  const renderVersion = ++authRenderVersion;
  // Supabase calls made directly inside onAuthStateChange can deadlock the
  // auth client. Deferring lets the auth callback finish before verification.
  window.setTimeout(() => {
    if (renderVersion !== authRenderVersion) return;
    if (session) verifyAndRender(session);
    else signInView();
  }, 0);
}

supabase.auth.onAuthStateChange((_event, session) => {
  scheduleSessionRender(session);
});
