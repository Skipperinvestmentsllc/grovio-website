const ENDPOINT = 'https://trqqcvevrfuijjxsqqlt.supabase.co/functions/v1/submit-influencer-application';
const PUBLISHABLE_KEY = 'sb_publishable_-jpPulVPJrZ2JV3BTZBhAA_kwyXVCXt';
const form = document.querySelector('#creator-application');
const message = document.querySelector('#form-message');
const confirmation = document.querySelector('#confirmation');
const submit = form.querySelector('button[type="submit"]');
function validUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    return url.protocol === 'https:' && (host === 'instagram.com' || host === 'tiktok.com');
  } catch { return false; }
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
  if (!validUrl(String(data.get('instagram_url') || '')) || !validUrl(String(data.get('tiktok_url') || ''))) return presentError('Please use complete Instagram or TikTok links for your social profiles.');
  if (!data.get('agreed_to_terms')) return presentError('Please agree to the program terms and disclosure requirement.');
  const primaryPlatform = String(data.get('primary_platform') || '');
  if (primaryPlatform === 'instagram' && !String(data.get('instagram_url') || '')) return presentError('Please add your Instagram link.');
  if (primaryPlatform === 'tiktok' && !String(data.get('tiktok_url') || '')) return presentError('Please add your TikTok link.');
  submit.disabled = true;
  submit.textContent = 'Sending your application…';
  try {
    const payload = {
      fullName: String(data.get('full_name') || ''),
      email: String(data.get('email') || ''),
      instagramUrl: String(data.get('instagram_url') || ''),
      tiktokUrl: String(data.get('tiktok_url') || ''),
      primaryPlatform,
      followerCount: String(data.get('follower_count') || ''),
      averageStoryViews: String(data.get('average_story_views') || ''),
      averageVideoViews: String(data.get('average_short_form_views') || ''),
      audienceLocation: String(data.get('audience_top_country') || ''),
      whyGrovio: String(data.get('why_grovio') || ''),
      contentIdeas: String(data.get('excited_to_create') || ''),
      termsAccepted: true,
      website: String(data.get('website') || ''),
    };
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json', 'x-client-info': 'grovio-creator-program/1.1' },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || 'submission_failed');
    form.hidden = true;
    confirmation.hidden = false;
    confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch {
    presentError('We could not submit that right now. Please try again in a moment.');
    submit.disabled = false;
    submit.textContent = 'Apply to partner with Grovio';
  }
});
