import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const supabase = createClient('https://trqqcvevrfuijjxsqqlt.supabase.co', 'sb_publishable_-jpPulVPJrZ2JV3BTZBhAA_kwyXVCXt');
const app = document.querySelector('#app');
const LOCAL_PREVIEW = ['127.0.0.1', 'localhost'].includes(window.location.hostname);

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

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

async function signIn(provider) {
  const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: `${window.location.origin}/admin/` } });
  if (error) signInView(error.message);
}

async function verifyAndRender(session) {
  app.innerHTML = '<p class="loading">Checking access…</p>';
  const { data, error } = await supabase.functions.invoke('promo-admin', { body: { action: 'list_partners' } });
  if (error || data?.reason) {
    deniedView();
    return;
  }
  portalView(session);
}

async function boot() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) await verifyAndRender(session);
  else signInView();
}

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) verifyAndRender(session);
});

boot();
