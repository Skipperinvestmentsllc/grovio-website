const ENDPOINT = 'https://trqqcvevrfuijjxsqqlt.supabase.co/functions/v1/submit-influencer-application';
const PUBLISHABLE_KEY = 'sb_publishable_-jpPulVPJrZ2JV3BTZBhAA_kwyXVCXt';
const form = document.querySelector('#creator-application');
const message = document.querySelector('#form-message');
const confirmation = document.querySelector('#confirmation');
const submit = form.querySelector('button[type="submit"]');
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function validUrl(value) {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}
function presentError(text) { message.textContent = text; message.classList.remove('success'); }

form.addEventListener('submit', async event => {
  event.preventDefault();
  message.textContent = '';
  const data = new FormData(form);
  const requiredText = ['full_name', 'why_grovio', 'excited_to_create'];
  if (requiredText.some(name => String(data.get(name) || '').trim().length < (name === 'full_name' ? 2 : 20))) return presentError('Please complete the required fields before submitting.');
  if (!/^\S+@\S+\.\S+$/.test(String(data.get('email') || ''))) return presentError('Please enter a valid email address.');
  if (!data.get('follower_count') || Number(data.get('follower_count')) < 0) return presentError('Please enter a valid follower count.');
  if (!validUrl(String(data.get('instagram_url') || '')) || !validUrl(String(data.get('tiktok_url') || ''))) return presentError('Please use complete links for your social profiles.');
  if (!data.get('agreed_to_terms')) return presentError('Please agree to the program terms and disclosure requirement.');
  const asset = data.get('media_kit');
  if (asset instanceof File && asset.size && (asset.size > 10 * 1024 * 1024 || !allowedTypes.has(asset.type))) return presentError('Upload a PDF, JPG, PNG, or WebP under 10 MB.');
  data.set('agreed_to_terms', 'true');
  submit.disabled = true;
  submit.textContent = 'Sending your application…';
  try {
    const response = await fetch(ENDPOINT, { method: 'POST', headers: { apikey: PUBLISHABLE_KEY, 'x-client-info': 'grovio-creator-program/1.0' }, body: data });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.submitted) throw new Error(body.reason || 'submission_failed');
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    presentError('We could not submit that right now. Please try again in a moment.');
    submit.disabled = false;
    submit.textContent = 'Apply to partner with Grovio';
  }
});
