import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  decryptMarketingCredential,
  encryptMarketingCredential,
  marketingChannelOAuthConfig,
  marketingMetaConfig,
  marketingMetaScopes,
  signMarketingOAuthState,
  type MarketingChannelProvider,
} from "../_shared/marketing-meta-oauth.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const owners = (Deno.env.get("GROVIO_OWNER_EMAILS") || "")
  .toLowerCase()
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const CAMPAIGN_OBJECTIVES = new Set(["awareness", "guide_growth", "activation", "launch", "seasonal"]);
const CAMPAIGN_STATUSES = new Set(["idea", "active", "paused", "complete", "archived"]);
const CONTENT_TYPES = new Set(["guide_article", "pin", "reel", "tiktok", "x_post", "reddit_reply", "carousel", "image_post"]);
const EDITABLE_CONTENT_STATUSES = new Set(["idea", "draft", "in_review", "approved", "scheduled", "archived"]);
const ASSET_KINDS = new Set(["image", "video", "screenshot", "logo", "template", "document"]);
const AI_CREATIVE_FORMATS = new Set(["carousel", "image_post"]);
const REDDIT_COMMUNITY_STATUSES = new Set(["watching", "participating", "paused", "not_a_fit"]);
const REDDIT_OPPORTUNITY_STATUSES = new Set(["new", "watching", "drafted", "approved", "replied", "dismissed"]);
const REDDIT_REPLY_STAGES = new Set(["helpful", "contextual", "transparent_mention"]);
const ASSET_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm", "application/pdf",
]);
const MAX_ASSET_BYTES = 100 * 1024 * 1024;
const CHANNEL_PLATFORMS = new Set(["instagram", "facebook", "tiktok", "pinterest", "x", "reddit"]);

function reply(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function text(value: unknown, max = 1000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max = 1000) {
  const result = text(value, max);
  return result || null;
}

function nullableTimestamp(value: unknown) {
  const raw = nullableText(value, 80);
  if (!raw) return null;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function colorList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter((item) => /^#[0-9A-F]{6}$/.test(item)))]
    .slice(0, 8);
}

function slugify(value: unknown, max = 120) {
  return text(value, max)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}

function enumValue(value: unknown, allowed: Set<string>, fallback: string) {
  return typeof value === "string" && allowed.has(value) ? value : fallback;
}

function keywordList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, 15);
}

function nullableUuid(value: unknown) {
  const result = nullableText(value, 80);
  return result && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)
    ? result
    : null;
}

function jsonObject(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function safeFileName(value: unknown) {
  const raw = text(value, 180).replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
  return raw.replace(/^[-.]+|[-.]+$/g, "") || "asset";
}

function ownedStoragePath(value: unknown, userId: string) {
  const path = text(value, 1000);
  return path.startsWith(`owners/${userId}/`) ? path : null;
}

function externalUrl(value: unknown) {
  const raw = nullableText(value, 2000);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function requireOwner(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user?.email || !owners.includes(user.email.toLowerCase())) return null;
  return user;
}

function responseOutputText(value: unknown) {
  if (!value || typeof value !== "object") return "";
  const response = value as Record<string, unknown>;
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return "";
  return response.output
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text as string)
    .join("\n");
}

function parseGeneratedJson(value: unknown) {
  const raw = responseOutputText(value).trim();
  const candidate = raw.match(/\{[\s\S]*\}/)?.[0] || "";
  if (!candidate) throw new Error("OpenAI returned an empty creative brief.");
  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid JSON");
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI returned an unusable creative brief.");
  }
}

function stringArray(value: unknown, limit: number, itemMax = 280) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim().slice(0, itemMax))
    .filter(Boolean)
    .slice(0, limit);
}

function creativeFormatInstructions(format: string) {
  if (format === "carousel") {
    return "Return exactly five concise slide lines in `slides`: hook, reassurance, practical point, Grovio proof cue, and an honest CTA. Each line must stand alone as a design-ready slide.";
  }
  if (format === "reel") {
    return "Return exactly four concise `scenes`, plus a short `voiceover` that a real person could naturally say in a 12–20 second Reel. Scene two must reference the supplied real Grovio screen, never an invented UI.";
  }
  return "Return one concise static-post hook in `headline` and a caption that adds practical value rather than repeating it.";
}

function normalizeCreative(value: Record<string, unknown>, format: string, fallbackTitle: string, fallbackMessage: string) {
  const slides = stringArray(value.slides, 5);
  const scenes = stringArray(value.scenes, 4);
  return {
    title: text(value.title, 160) || fallbackTitle,
    hook: text(value.hook, 220) || fallbackTitle,
    headline: text(value.headline, 220) || fallbackTitle,
    caption: text(value.caption, 3000) || fallbackMessage,
    voiceover: text(value.voiceover, 1000),
    visual_direction: text(value.visual_direction, 1000) || "A calm, candid editorial scene that leaves clean room for the real Grovio product screen.",
    slides: format === "carousel" && slides.length === 5 ? slides : [],
    scenes: format === "reel" && scenes.length === 4 ? scenes : [],
  };
}

function base64Bytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hashedSafetyIdentifier(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((item) => item.toString(16).padStart(2, "0")).join("").slice(0, 64);
}

async function openAIJson(key: string, path: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI request failed", response.status, detail.slice(0, 500));
    throw new Error("OpenAI could not complete this creative request.");
  }
  return await response.json();
}

async function findApprovedSourceAsset(assetId: string | null) {
  if (!assetId) return null;
  const { data, error } = await supabase
    .from("marketing_assets")
    .select("id, label, alt_text, approved")
    .eq("id", assetId)
    .maybeSingle();
  if (error) throw error;
  return data?.approved ? data : null;
}

async function storeGeneratedImage(userId: string, title: string, visualDirection: string, imageBase64: string) {
  const storagePath = `owners/${userId}/ai/${crypto.randomUUID()}.png`;
  const { error: uploadError } = await supabase.storage
    .from("marketing-assets")
    .upload(storagePath, base64Bytes(imageBase64), { contentType: "image/png", upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase.from("marketing_assets").insert({
    kind: "image",
    label: `OpenAI concept — ${title}`.slice(0, 160),
    storage_path: storagePath,
    alt_text: `OpenAI-generated supporting visual: ${visualDirection}`.slice(0, 500),
    notes: "Generated as a supporting visual concept. It must be approved before use in published Grovio content.",
    approved: false,
    created_by: userId,
  }).select("*").single();
  if (error) {
    await supabase.storage.from("marketing-assets").remove([storagePath]);
    throw error;
  }
  return data;
}

async function getBrandProfile() {
  const { data, error } = await supabase
    .from("marketing_brand_profiles")
    .select("workspace, name, website, colors, font, description, voice, audience, quality_guidelines, research_refreshed_at")
    .eq("workspace", "default")
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function latestBrandResearch() {
  const { data, error } = await supabase
    .from("marketing_research_reports")
    .select("report_markdown")
    .eq("report_type", "brand_landscape")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.report_markdown?.slice(0, 8000) || "";
}

function sourceUrlsFromResponse(value: unknown) {
  const urls = new Set<string>();
  const walk = (item: unknown) => {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) { item.forEach(walk); return; }
    const record = item as Record<string, unknown>;
    for (const key of ["url", "source_url", "href"]) {
      const url = externalUrl(record[key]);
      if (url) urls.add(url);
    }
    for (const value of Object.values(record)) walk(value);
  };
  walk(value);
  return [...urls].slice(0, 30);
}

async function createBrandResearch(user: { id: string }) {
  const key = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!key) return { reason: "ai_not_configured" as const };
  const profile = await getBrandProfile();
  const brandName = profile?.name || "Grovio";
  const productTruth = profile?.description || "A calm homeschool planner, portfolio, and records app for overwhelmed homeschool parents.";
  const voice = profile?.voice || "Warm, calm, useful, and never guilt-driven.";
  const audience = profile?.audience || "Overwhelmed homeschool parents.";
  const website = profile?.website || "https://grovioapp.com";
  const response = await openAIJson(key, "/responses", {
    model: "gpt-5",
    store: false,
    max_output_tokens: 4200,
    safety_identifier: await hashedSafetyIdentifier(user.id),
    tools: [{ type: "web_search" }],
    include: ["web_search_call.action.sources"],
    instructions: `Create a decision-useful marketing research brief for ${brandName}. Use web search to inspect the public website, publicly available Guide or blog content, app-store or press coverage, visible competitor positioning, and public ad or creative patterns where available. Do not fabricate results or say a competitor ad is proven to work. Mark uncertainty. Do not collect personal data or private community content. Return concise markdown with these sections exactly: Product truth to preserve; Audience tensions; Existing content and SEO gaps; Competitors and positioning patterns; Creative patterns worth testing; Blog quality checklist; Social quality checklist; Research caveats. The brief must help a human make better work, not tell them to publish automatically.\n\nKnown product truth: ${productTruth}\nVoice: ${voice}\nAudience: ${audience}\nWebsite: ${website}`,
    input: `Research ${brandName}'s current public marketing landscape. Prioritize the company website and product context above generic category advice.`,
  });
  const report = responseOutputText(response).slice(0, 30000);
  if (!report) throw new Error("OpenAI did not return a research brief.");
  const { data, error } = await supabase.from("marketing_research_reports").insert({
    report_type: "brand_landscape",
    title: `${brandName} brand and market research — ${new Date().toISOString().slice(0, 10)}`,
    report_markdown: report,
    source_urls: sourceUrlsFromResponse(response),
    created_by: user.id,
  }).select("*").single();
  if (error) throw error;
  const { error: profileError } = await supabase
    .from("marketing_brand_profiles")
    .update({ research_refreshed_at: new Date().toISOString(), updated_by: user.id })
    .eq("workspace", "default");
  if (profileError) throw profileError;
  return { report: data };
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomVerifier() { return base64Url(crypto.getRandomValues(new Uint8Array(48))); }

async function pkceChallenge(verifier: string) {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
}

async function startChannelOAuth(user: { id: string }, provider: MarketingChannelProvider) {
  const config = marketingChannelOAuthConfig(provider);
  const state = base64Url(crypto.getRandomValues(new Uint8Array(32)));
  const codeVerifier = provider === "x" ? randomVerifier() : null;
  const { error } = await supabase.from("marketing_oauth_sessions").insert({
    state,
    provider,
    owner_id: user.id,
    code_verifier: codeVerifier,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (error) throw error;
  const authorization = provider === "tiktok"
    ? new URL("https://www.tiktok.com/v2/auth/authorize/")
    : provider === "x"
    ? new URL("https://x.com/i/oauth2/authorize")
    : new URL("https://www.reddit.com/api/v1/authorize");
  if (provider === "tiktok") {
    authorization.searchParams.set("client_key", config.clientId);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("scope", "user.info.basic,video.list,video.publish");
  } else if (provider === "x") {
    authorization.searchParams.set("client_id", config.clientId);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("scope", "tweet.read tweet.write users.read media.write offline.access");
    authorization.searchParams.set("code_challenge", await pkceChallenge(codeVerifier || ""));
    authorization.searchParams.set("code_challenge_method", "S256");
  } else {
    authorization.searchParams.set("client_id", config.clientId);
    authorization.searchParams.set("response_type", "code");
    authorization.searchParams.set("duration", "permanent");
    authorization.searchParams.set("scope", "identity read mysubreddits history");
  }
  authorization.searchParams.set("redirect_uri", config.redirectUri);
  authorization.searchParams.set("state", state);
  return { authorization_url: authorization.toString() };
}

async function generateOpenAICreative(user: { id: string }, body: Record<string, unknown>) {
  const key = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!key) return { reason: "ai_not_configured" as const };

  const format = text(body?.format, 40);
  const title = text(body?.title, 180);
  const message = text(body?.message, 1600);
  const primaryKeyword = nullableText(body?.primary_keyword, 160);
  const destination = externalUrl(body?.target_url);
  const sourceAssetId = nullableUuid(body?.featured_asset_id);
  if (!AI_CREATIVE_FORMATS.has(format) || !title || !message) return { reason: "invalid_request" as const };
  const source = await findApprovedSourceAsset(sourceAssetId);
  if (sourceAssetId && !source) return { reason: "approved_source_required" as const };
  const profile = await getBrandProfile();
  const brandName = profile?.name || "Grovio";
  const productTruth = profile?.description || "A calm homeschool planner, portfolio, and records app for overwhelmed homeschool parents. It helps families capture learning, attendance, and proof.";
  const voice = profile?.voice || "Warm, useful, plainspoken, reassuring, never guilt-driven.";
  const audience = profile?.audience || "Overwhelmed homeschool parents.";
  const colors = colorList(profile?.colors);
  const qualityGuidelines = profile?.quality_guidelines || "Every piece must be accurate, useful, specific to a real parent question, and reviewed before publishing.";
  const research = await latestBrandResearch();

  const sourceDescription = source
    ? `${source.label}${source.alt_text ? ` — ${source.alt_text}` : ""}`
    : "No product screenshot is selected. Do not invent or describe product UI.";
  const creativeResponse = await openAIJson(key, "/responses", {
    model: "gpt-5",
    store: false,
    max_output_tokens: 900,
    safety_identifier: await hashedSafetyIdentifier(user.id),
    instructions: `You are ${brandName}'s senior content strategist. Product truth: ${productTruth}\nVoice: ${voice}\nAudience: ${audience}\nQuality bar: ${qualityGuidelines}\n${research ? `Latest web and market research (treat uncertainty as uncertainty; do not turn it into claims):\n${research}` : "No research report is saved yet. Stay tightly grounded in the supplied product truth."}\nDo not claim features or outcomes that have not been given.\n\nReturn ONLY a valid JSON object with these keys: title, hook, headline, caption, voiceover, visual_direction, slides, scenes. ${creativeFormatInstructions(format)}\n\nThe selected source asset is: ${sourceDescription}. The real source asset will be composited separately. Never ask the image generator to reproduce the app interface, logo, UI text, screenshots, or any readable words.`,
    input: `Format: ${format}\nTopic: ${title}\nWhat the parent needs: ${message}\nPrimary keyword: ${primaryKeyword || "none"}\nDestination: ${destination || "none"}`,
  });
  const creative = normalizeCreative(parseGeneratedJson(creativeResponse), format, title, message);
  const imagePrompt = `Create a warm, editorial supporting visual for ${brandName}. ${creative.visual_direction}\n\nPalette: ${(colors.length ? colors : ["#F7F4EE", "#4A6E4E", "#2C2218"]).join(", ")}. The image must feel candid, human, calming, and modern. It is a supporting background only: no app interface, no phone/computer screens, no ${brandName} logo, no text, no lettering, no watermark, no badges. Leave generous quiet space for a real product screenshot to be composited separately.`;
  const imageResponse = await openAIJson(key, "/images/generations", {
    model: "gpt-image-1",
    prompt: imagePrompt,
    size: "1024x1024",
    quality: "low",
  });
  const imageBase64 = typeof imageResponse?.data?.[0]?.b64_json === "string" ? imageResponse.data[0].b64_json : "";
  if (!imageBase64) throw new Error("OpenAI did not return an image draft.");
  const generatedAsset = await storeGeneratedImage(user.id, creative.title, creative.visual_direction, imageBase64);
  return { creative, generated_asset: generatedAsset };
}

async function dashboard() {
  const [campaigns, drafts, review, approved, published, opportunities, connections] = await Promise.all([
    supabase.from("marketing_campaigns").select("id", { count: "exact", head: true }).neq("status", "archived"),
    supabase.from("marketing_content").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("marketing_content").select("id", { count: "exact", head: true }).eq("status", "in_review"),
    supabase.from("marketing_content").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("marketing_content").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("marketing_reddit_opportunities").select("id", { count: "exact", head: true }).eq("status", "new"),
    supabase.from("marketing_channel_connections").select("id", { count: "exact", head: true }).eq("status", "connected"),
  ]);
  const error = [campaigns, drafts, review, approved, published, opportunities, connections].find((result) => result.error)?.error;
  if (error) throw error;
  const { data: recentContent, error: recentError } = await supabase
    .from("marketing_content")
    .select("id, title, content_type, status, primary_keyword, updated_at")
    .order("updated_at", { ascending: false })
    .limit(8);
  if (recentError) throw recentError;
  return {
    totals: {
      campaigns: campaigns.count || 0,
      drafts: drafts.count || 0,
      in_review: review.count || 0,
      approved: approved.count || 0,
      published: published.count || 0,
      reddit_opportunities: opportunities.count || 0,
      connected_channels: connections.count || 0,
    },
    recent_content: recentContent || [],
  };
}

async function activeConnection(platform: string) {
  const { data, error } = await supabase
    .from("marketing_channel_connections")
    .select("id, platform, external_account_id, account_name, scopes, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, metadata")
    .eq("platform", platform)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateConnectionError(connectionId: string, message: string | null) {
  const update = message
    ? { last_error: message }
    : { last_error: null, last_synced_at: new Date().toISOString() };
  const { error } = await supabase.from("marketing_channel_connections").update(update).eq("id", connectionId);
  if (error) throw error;
}

async function refreshXTokenIfNeeded(connection: { id: string; access_token_ciphertext: string; refresh_token_ciphertext: string | null; token_expires_at: string | null }) {
  const expiresSoon = !connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 2 * 60 * 1000;
  if (!expiresSoon) return decryptMarketingCredential(connection.access_token_ciphertext);
  if (!connection.refresh_token_ciphertext) throw new Error("X needs to be reconnected before it can sync.");
  const config = marketingChannelOAuthConfig("x");
  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: await decryptMarketingCredential(connection.refresh_token_ciphertext) }),
  });
  if (!response.ok) throw new Error("X token refresh failed. Reconnect X in Marketing HQ.");
  const data = await response.json();
  if (typeof data?.access_token !== "string") throw new Error("X did not return a refreshed access token.");
  const { error } = await supabase.from("marketing_channel_connections").update({
    access_token_ciphertext: await encryptMarketingCredential(data.access_token),
    refresh_token_ciphertext: typeof data?.refresh_token === "string" ? await encryptMarketingCredential(data.refresh_token) : connection.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + (Number(data?.expires_in) || 7200) * 1000).toISOString(),
    last_error: null,
  }).eq("id", connection.id);
  if (error) throw error;
  return data.access_token as string;
}

async function refreshRedditTokenIfNeeded(connection: { id: string; access_token_ciphertext: string; refresh_token_ciphertext: string | null; token_expires_at: string | null }) {
  const expiresSoon = !connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 2 * 60 * 1000;
  if (!expiresSoon) return decryptMarketingCredential(connection.access_token_ciphertext);
  if (!connection.refresh_token_ciphertext) throw new Error("Reddit needs to be reconnected before it can scan.");
  const config = marketingChannelOAuthConfig("reddit");
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`, "User-Agent": "GrovioMarketingStudio/1.0 by grovioapp" },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: await decryptMarketingCredential(connection.refresh_token_ciphertext) }),
  });
  if (!response.ok) throw new Error("Reddit token refresh failed. Reconnect Reddit in Marketing HQ.");
  const data = await response.json();
  if (typeof data?.access_token !== "string") throw new Error("Reddit did not return a refreshed access token.");
  const { error } = await supabase.from("marketing_channel_connections").update({
    access_token_ciphertext: await encryptMarketingCredential(data.access_token),
    refresh_token_ciphertext: typeof data?.refresh_token === "string" ? await encryptMarketingCredential(data.refresh_token) : connection.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + (Number(data?.expires_in) || 3600) * 1000).toISOString(),
    last_error: null,
  }).eq("id", connection.id);
  if (error) throw error;
  return data.access_token as string;
}

function redditRelevance(title: string, excerpt: string) {
  const haystack = `${title} ${excerpt}`.toLowerCase();
  const terms = ["homeschool", "home school", "attendance", "record", "portfolio", "evaluator", "transcript", "curriculum", "learning", "planner"];
  const hits = terms.filter((term) => haystack.includes(term));
  return hits.length ? Math.min(96, 30 + hits.length * 16 + (haystack.includes("help") || haystack.includes("how do") ? 10 : 0)) : 0;
}

async function scanRedditCommunities() {
  const connection = await activeConnection("reddit");
  if (!connection) return { reason: "channel_not_connected" as const };
  const token = await refreshRedditTokenIfNeeded(connection);
  const { data: communities, error } = await supabase
    .from("marketing_reddit_communities")
    .select("id, name, status")
    .in("status", ["watching", "participating"])
    .limit(50);
  if (error) throw error;
  let scanned = 0;
  let added = 0;
  for (const community of communities || []) {
    const slug = community.name.replace(/^r\//i, "");
    const response = await fetch(`https://oauth.reddit.com/r/${encodeURIComponent(slug)}/new?limit=30&raw_json=1`, { headers: { Authorization: `Bearer ${token}`, "User-Agent": "GrovioMarketingStudio/1.0 by grovioapp" } });
    if (!response.ok) continue;
    const payload = await response.json();
    const posts = Array.isArray(payload?.data?.children) ? payload.data.children : [];
    scanned += posts.length;
    for (const child of posts) {
      const post = child?.data || {};
      const title = text(post?.title, 500);
      const excerpt = text(post?.selftext, 3000);
      const score = redditRelevance(title, excerpt);
      const permalink = text(post?.permalink, 1000);
      const sourceUrl = permalink ? externalUrl(`https://www.reddit.com${permalink}`) : null;
      if (!title || !sourceUrl || score < 45) continue;
      const { error: insertError } = await supabase.from("marketing_reddit_opportunities").insert({
        community_id: community.id,
        source_url: sourceUrl,
        source_title: title,
        source_excerpt: excerpt || null,
        relevance_score: score,
        recommended_stage: "helpful",
        status: "new",
      });
      if (!insertError) added += 1;
      else if (insertError.code !== "23505") throw insertError;
    }
  }
  await updateConnectionError(connection.id, null);
  return { scanned, added };
}

async function storeAccountMetrics(platform: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("marketing_account_metrics_daily").upsert({
    platform,
    metric_date: new Date().toISOString().slice(0, 10),
    source: "platform_api",
    posts: Number(values.posts) || 0,
    impressions: Number(values.impressions) || 0,
    reach: Number(values.reach) || 0,
    engagements: Number(values.engagements) || 0,
    outbound_clicks: Number(values.outbound_clicks) || 0,
    saves: Number(values.saves) || 0,
    video_views: Number(values.video_views) || 0,
    followers: Number.isFinite(Number(values.followers)) ? Number(values.followers) : null,
    raw_metrics: jsonObject(values.raw_metrics) || {},
    synced_at: new Date().toISOString(),
  }, { onConflict: "platform,metric_date,source" });
  if (error) throw error;
}

async function syncXAnalytics() {
  const connection = await activeConnection("x");
  if (!connection) return { reason: "channel_not_connected" as const };
  try {
    const token = await refreshXTokenIfNeeded(connection);
    const url = new URL(`https://api.x.com/2/users/${encodeURIComponent(connection.external_account_id)}/tweets`);
    url.searchParams.set("max_results", "100");
    url.searchParams.set("tweet.fields", "created_at,public_metrics");
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("X analytics request failed. Check the app's read scopes and API access.");
    const payload = await response.json();
    const posts = Array.isArray(payload?.data) ? payload.data : [];
    const totals = posts.reduce((result: Record<string, number>, post: Record<string, unknown>) => {
      const metrics = (post.public_metrics || {}) as Record<string, unknown>;
      result.engagements += Number(metrics.like_count || 0) + Number(metrics.reply_count || 0) + Number(metrics.retweet_count || 0) + Number(metrics.quote_count || 0);
      result.impressions += Number(metrics.impression_count || 0);
      return result;
    }, { engagements: 0, impressions: 0 });
    await storeAccountMetrics("x", { posts: posts.length, ...totals, raw_metrics: { sample_size: posts.length } });
    await updateConnectionError(connection.id, null);
    return { posts: posts.length, ...totals };
  } catch (error) {
    await updateConnectionError(connection.id, error instanceof Error ? error.message.slice(0, 500) : "X analytics sync failed.");
    throw error;
  }
}

async function syncTikTokAnalytics() {
  const connection = await activeConnection("tiktok");
  if (!connection) return { reason: "channel_not_connected" as const };
  const token = await decryptMarketingCredential(connection.access_token_ciphertext);
  try {
    const response = await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,view_count,like_count,comment_count,share_count", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20 }),
    });
    if (!response.ok) throw new Error("TikTok analytics request failed. Check the app's video.list scope and approval.");
    const payload = await response.json();
    const videos = Array.isArray(payload?.data?.videos) ? payload.data.videos : [];
    const totals = videos.reduce((result: Record<string, number>, video: Record<string, unknown>) => {
      result.video_views += Number(video.view_count || 0);
      result.engagements += Number(video.like_count || 0) + Number(video.comment_count || 0) + Number(video.share_count || 0);
      return result;
    }, { video_views: 0, engagements: 0 });
    await storeAccountMetrics("tiktok", { posts: videos.length, ...totals, raw_metrics: { sample_size: videos.length } });
    await updateConnectionError(connection.id, null);
    return { posts: videos.length, ...totals };
  } catch (error) {
    await updateConnectionError(connection.id, error instanceof Error ? error.message.slice(0, 500) : "TikTok analytics sync failed.");
    throw error;
  }
}

async function analyticsSummary() {
  const since = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const [connections, accountMetrics, postMetrics, research] = await Promise.all([
    supabase.from("marketing_channel_connections").select("platform, account_name, status, last_synced_at, last_error, token_expires_at").order("platform"),
    supabase.from("marketing_account_metrics_daily").select("platform, metric_date, posts, impressions, reach, engagements, outbound_clicks, saves, video_views, followers, synced_at").gte("metric_date", since).order("metric_date", { ascending: false }),
    supabase.from("marketing_metrics_daily").select("impressions, reach, engagements, outbound_clicks, saves, video_views, metric_date").gte("metric_date", since),
    supabase.from("marketing_research_reports").select("id, title, report_type, created_at").order("created_at", { ascending: false }).limit(3),
  ]);
  const error = [connections, accountMetrics, postMetrics, research].find((result) => result.error)?.error;
  if (error) throw error;
  const totals = [...(accountMetrics.data || []), ...(postMetrics.data || [])].reduce((result: Record<string, number>, row: Record<string, unknown>) => {
    for (const key of ["posts", "impressions", "reach", "engagements", "outbound_clicks", "saves", "video_views"]) result[key] = (result[key] || 0) + (Number(row[key]) || 0);
    return result;
  }, { posts: 0, impressions: 0, reach: 0, engagements: 0, outbound_clicks: 0, saves: 0, video_views: 0 });
  return { since, totals, connections: connections.data || [], account_metrics: accountMetrics.data || [], research: research.data || [] };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return reply({ reason: "method_not_allowed" }, 405);
  const user = await requireOwner(req);
  if (!user) return reply({ reason: "forbidden" }, 403);

  try {
    const body = await req.json();
    const action = text(body?.action, 60);

    if (action === "dashboard") return reply(await dashboard());

    if (action === "get_brand_profile") return reply({ brand_profile: await getBrandProfile() });

    if (action === "upsert_brand_profile") {
      const name = text(body?.name, 120);
      const description = text(body?.description, 3000);
      const voice = text(body?.voice, 3000);
      const audience = text(body?.audience, 2000);
      const qualityGuidelines = text(body?.quality_guidelines, 4000) || "Every piece must be accurate, useful, specific to a real parent question, and reviewed before publishing.";
      const suppliedWebsite = nullableText(body?.website, 1000);
      const website = suppliedWebsite ? externalUrl(suppliedWebsite) : null;
      if (!name || !description || !voice || !audience || (suppliedWebsite && !website)) {
        return reply({ reason: "invalid_request" }, 400);
      }
      const { data, error } = await supabase
        .from("marketing_brand_profiles")
        .upsert({
          workspace: "default",
          name,
          website,
          colors: colorList(body?.colors),
          font: nullableText(body?.font, 160),
          description,
          voice,
          audience,
          quality_guidelines: qualityGuidelines,
          created_by: user.id,
          updated_by: user.id,
        }, { onConflict: "workspace" })
        .select("workspace, name, website, colors, font, description, voice, audience, quality_guidelines, research_refreshed_at, updated_at")
        .single();
      if (error) throw error;
      return reply({ brand_profile: data });
    }

    if (action === "generate_openai_creative") {
      try {
        const result = await generateOpenAICreative(user, body);
        if ("reason" in result) return reply({ reason: result.reason }, result.reason === "ai_not_configured" ? 422 : 400);
        return reply(result, 201);
      } catch (error) {
        console.error("marketing-admin OpenAI generation", error);
        return reply({ reason: "ai_generation_failed" }, 502);
      }
    }

    if (action === "list_connections") {
      const { data, error } = await supabase
        .from("marketing_channel_connections")
        .select("id, platform, external_account_id, account_name, scopes, token_expires_at, status, last_synced_at, last_error, created_at, updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return reply({ connections: data || [] });
    }

    if (action === "start_channel_oauth") {
      const provider = text(body?.provider, 20) as MarketingChannelProvider;
      if (!(["tiktok", "x", "reddit"] as string[]).includes(provider)) return reply({ reason: "invalid_request" }, 400);
      try {
        return reply(await startChannelOAuth(user, provider));
      } catch {
        return reply({ reason: "integration_not_configured" }, 422);
      }
    }

    if (action === "sync_channel_analytics") {
      const platform = text(body?.platform, 20);
      if (platform !== "x" && platform !== "tiktok") return reply({ reason: "invalid_request" }, 400);
      const result = platform === "x" ? await syncXAnalytics() : await syncTikTokAnalytics();
      if ("reason" in result) return reply({ reason: result.reason }, 422);
      return reply({ sync: result });
    }

    if (action === "analytics_summary") return reply(await analyticsSummary());

    if (action === "list_research_reports") {
      const { data, error } = await supabase
        .from("marketing_research_reports")
        .select("id, report_type, title, report_markdown, source_urls, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return reply({ reports: data || [] });
    }

    if (action === "build_brand_research") {
      try {
        const result = await createBrandResearch(user);
        if ("reason" in result) return reply({ reason: result.reason }, 422);
        return reply(result, 201);
      } catch (error) {
        console.error("marketing-admin research", error);
        return reply({ reason: "research_failed" }, 502);
      }
    }

    if (action === "start_meta_instagram_oauth") {
      try {
        const config = marketingMetaConfig();
        const state = await signMarketingOAuthState({
          version: 1,
          provider: "instagram",
          ownerId: user.id,
          issuedAt: Date.now(),
          nonce: crypto.randomUUID(),
        });
        const authorization = new URL("https://www.instagram.com/oauth/authorize");
        authorization.searchParams.set("client_id", config.appId);
        authorization.searchParams.set("redirect_uri", config.redirectUri);
        authorization.searchParams.set("response_type", "code");
        authorization.searchParams.set("scope", marketingMetaScopes().join(","));
        authorization.searchParams.set("state", state);
        return reply({ authorization_url: authorization.toString() });
      } catch {
        return reply({ reason: "integration_not_configured" }, 422);
      }
    }

    if (action === "list_campaigns") {
      const { data, error } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return reply({ campaigns: data || [] });
    }

    if (action === "create_campaign") {
      const name = text(body?.name, 160);
      const slug = slugify(body?.slug || name);
      if (!name || !slug) return reply({ reason: "invalid_request" }, 400);
      const row = {
        name,
        slug,
        objective: enumValue(body?.objective, CAMPAIGN_OBJECTIVES, "awareness"),
        status: enumValue(body?.status, CAMPAIGN_STATUSES, "idea"),
        pillar: nullableText(body?.pillar, 120),
        audience: nullableText(body?.audience, 300),
        summary: nullableText(body?.summary, 2000),
        primary_cta: nullableText(body?.primary_cta, 300),
        utm_campaign: slugify(body?.utm_campaign || slug),
        created_by: user.id,
      };
      const { data, error } = await supabase.from("marketing_campaigns").insert(row).select("*").single();
      if (error?.code === "23505") return reply({ reason: "campaign_exists" }, 409);
      if (error) throw error;
      return reply({ campaign: data }, 201);
    }

    if (action === "list_content") {
      const campaignId = nullableText(body?.campaign_id, 80);
      const type = nullableText(body?.content_type, 40);
      let query = supabase
        .from("marketing_content")
        .select("*, campaign:marketing_campaigns(id, name, slug), channel_posts:marketing_channel_posts(id, channel, status, scheduled_for, published_at, platform_post_url)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (campaignId) query = query.eq("campaign_id", campaignId);
      if (type && CONTENT_TYPES.has(type)) query = query.eq("content_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return reply({ content: data || [] });
    }

    if (action === "schedule_content") {
      const contentId = nullableUuid(body?.content_id);
      const channel = text(body?.channel, 20);
      const scheduledFor = nullableTimestamp(body?.scheduled_for);
      if (!contentId || !CHANNEL_PLATFORMS.has(channel) || !scheduledFor) return reply({ reason: "invalid_request" }, 400);
      const { data: content, error: contentError } = await supabase
        .from("marketing_content")
        .select("id, caption, target_url")
        .eq("id", contentId)
        .maybeSingle();
      if (contentError) throw contentError;
      if (!content) return reply({ reason: "not_found" }, 404);
      const { data: channelPost, error: channelError } = await supabase
        .from("marketing_channel_posts")
        .upsert({
          content_id: contentId,
          channel,
          status: "scheduled",
          copy: content.caption,
          destination_url: content.target_url,
          scheduled_for: scheduledFor,
          published_at: null,
          platform_post_id: null,
          platform_post_url: null,
        }, { onConflict: "content_id,channel" })
        .select("*")
        .single();
      if (channelError) throw channelError;
      const { data: updated, error: updateError } = await supabase
        .from("marketing_content")
        .update({ status: "scheduled", scheduled_for: scheduledFor })
        .eq("id", contentId)
        .select("*")
        .single();
      if (updateError) throw updateError;
      return reply({ content: updated, channel_post: channelPost });
    }

    if (action === "create_content") {
      const contentType = enumValue(body?.content_type, CONTENT_TYPES, "guide_article");
      const title = text(body?.title, 240);
      const slug = contentType === "guide_article" ? slugify(body?.slug || title) : nullableText(body?.slug, 180);
      const status = enumValue(body?.status, EDITABLE_CONTENT_STATUSES, "draft");
      const scheduledFor = nullableTimestamp(body?.scheduled_for);
      if (!title || (contentType === "guide_article" && !slug) || scheduledFor === undefined || (status === "scheduled" && !scheduledFor)) return reply({ reason: "invalid_request" }, 400);
      const row = {
        campaign_id: nullableText(body?.campaign_id, 80),
        featured_asset_id: nullableUuid(body?.featured_asset_id),
        content_type: contentType,
        status,
        title,
        slug,
        excerpt: nullableText(body?.excerpt, 600),
        body_markdown: nullableText(body?.body_markdown, 50000),
        primary_keyword: nullableText(body?.primary_keyword, 160),
        supporting_keywords: keywordList(body?.supporting_keywords),
        search_intent: nullableText(body?.search_intent, 180),
        seo_title: nullableText(body?.seo_title, 240),
        meta_description: nullableText(body?.meta_description, 400),
        canonical_url: nullableText(body?.canonical_url, 1000),
        target_url: nullableText(body?.target_url, 1000),
        structured_data: jsonObject(body?.structured_data),
        caption: nullableText(body?.caption, 5000),
        scheduled_for: scheduledFor,
        created_by: user.id,
      };
      const { data, error } = await supabase.from("marketing_content").insert(row).select("*").single();
      if (error?.code === "23505") return reply({ reason: "content_exists" }, 409);
      if (error) throw error;
      return reply({ content: data }, 201);
    }

    if (action === "update_content") {
      const id = nullableUuid(body?.id);
      if (!id) return reply({ reason: "invalid_request" }, 400);
      const { data: existing, error: existingError } = await supabase
        .from("marketing_content")
        .select("id, content_type, status")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return reply({ reason: "not_found" }, 404);
      const contentType = enumValue(body?.content_type, CONTENT_TYPES, existing.content_type);
      const title = text(body?.title, 240);
      const slug = contentType === "guide_article" ? slugify(body?.slug || title) : nullableText(body?.slug, 180);
      const status = enumValue(body?.status, EDITABLE_CONTENT_STATUSES, existing.status === "published" ? "archived" : existing.status);
      const scheduledFor = nullableTimestamp(body?.scheduled_for);
      if (!title || (contentType === "guide_article" && !slug) || scheduledFor === undefined || (status === "scheduled" && !scheduledFor)) return reply({ reason: "invalid_request" }, 400);
      const row = {
        featured_asset_id: nullableUuid(body?.featured_asset_id),
        content_type: contentType,
        status,
        title,
        slug,
        excerpt: nullableText(body?.excerpt, 600),
        body_markdown: nullableText(body?.body_markdown, 50000),
        primary_keyword: nullableText(body?.primary_keyword, 160),
        supporting_keywords: keywordList(body?.supporting_keywords),
        search_intent: nullableText(body?.search_intent, 180),
        seo_title: nullableText(body?.seo_title, 240),
        meta_description: nullableText(body?.meta_description, 400),
        canonical_url: nullableText(body?.canonical_url, 1000),
        target_url: nullableText(body?.target_url, 1000),
        structured_data: jsonObject(body?.structured_data),
        caption: nullableText(body?.caption, 5000),
        scheduled_for: scheduledFor,
      };
      const { data, error } = await supabase
        .from("marketing_content")
        .update(row)
        .eq("id", id)
        .select("*")
        .single();
      if (error?.code === "23505") return reply({ reason: "content_exists" }, 409);
      if (error) throw error;
      return reply({ content: data });
    }

    if (action === "delete_content") {
      const id = nullableUuid(body?.id);
      if (!id) return reply({ reason: "invalid_request" }, 400);
      const { data, error } = await supabase
        .from("marketing_content")
        .delete()
        .eq("id", id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return reply({ reason: "not_found" }, 404);
      return reply({ deleted_id: id });
    }

    if (action === "list_assets") {
      const { data, error } = await supabase
        .from("marketing_assets")
        .select("*, campaign:marketing_campaigns(id, name)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const assets = data || [];
      const storagePaths = assets
        .map((asset) => asset.storage_path)
        .filter((path): path is string => typeof path === "string" && path.startsWith(`owners/${user.id}/`));
      let signedByPath = new Map<string, string>();
      if (storagePaths.length) {
        const { data: signed, error: signedError } = await supabase.storage
          .from("marketing-assets")
          .createSignedUrls(storagePaths, 60 * 60);
        if (signedError) throw signedError;
        const signedUrls: Array<[string, string]> = [];
        for (const item of signed || []) {
          if (item.path && item.signedUrl) signedUrls.push([item.path, item.signedUrl]);
        }
        signedByPath = new Map(signedUrls);
      }
      return reply({
        assets: assets.map((asset) => ({
          ...asset,
          preview_url: asset.storage_path ? signedByPath.get(asset.storage_path) || null : asset.source_url,
        })),
      });
    }

    if (action === "create_asset_upload") {
      const fileName = safeFileName(body?.file_name);
      const contentType = text(body?.content_type, 120).toLowerCase();
      const byteSize = Number(body?.byte_size);
      if (!ASSET_MIME_TYPES.has(contentType) || !Number.isFinite(byteSize) || byteSize <= 0 || byteSize > MAX_ASSET_BYTES) {
        return reply({ reason: "invalid_asset_file" }, 400);
      }
      const path = `owners/${user.id}/${crypto.randomUUID()}-${fileName}`;
      const { data, error } = await supabase.storage
        .from("marketing-assets")
        .createSignedUploadUrl(path);
      if (error || !data) throw error || new Error("Could not create an upload URL.");
      return reply({ upload: { path, token: data.token } }, 201);
    }

    if (action === "create_asset") {
      const label = text(body?.label, 160);
      const suppliedSourceUrl = nullableText(body?.source_url, 2000);
      const sourceUrl = externalUrl(suppliedSourceUrl);
      const storagePath = ownedStoragePath(body?.storage_path, user.id);
      if (!label || (suppliedSourceUrl && !sourceUrl) || (!sourceUrl && !storagePath)) return reply({ reason: "invalid_request" }, 400);
      const { data, error } = await supabase.from("marketing_assets").insert({
        campaign_id: nullableText(body?.campaign_id, 80),
        kind: enumValue(body?.kind, ASSET_KINDS, "image"),
        label,
        source_url: sourceUrl,
        storage_path: storagePath,
        alt_text: nullableText(body?.alt_text, 500),
        notes: nullableText(body?.notes, 2000),
        approved: Boolean(body?.approved),
        created_by: user.id,
      }).select("*").single();
      if (error) throw error;
      return reply({ asset: data }, 201);
    }

    if (action === "update_asset") {
      const id = nullableUuid(body?.id);
      if (!id) return reply({ reason: "invalid_request" }, 400);
      const { data: existing, error: existingError } = await supabase
        .from("marketing_assets")
        .select("id, source_url, storage_path")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return reply({ reason: "not_found" }, 404);
      const label = text(body?.label, 160);
      const sourceWasSupplied = typeof body?.source_url === "string";
      const suppliedSourceUrl = sourceWasSupplied ? nullableText(body?.source_url, 2000) : existing.source_url;
      const sourceUrl = suppliedSourceUrl ? externalUrl(suppliedSourceUrl) : null;
      const storageWasSupplied = typeof body?.storage_path === "string";
      const storagePath = storageWasSupplied ? ownedStoragePath(body?.storage_path, user.id) : existing.storage_path;
      if (!label || (suppliedSourceUrl && !sourceUrl) || (storageWasSupplied && !storagePath) || (!sourceUrl && !storagePath)) {
        return reply({ reason: "invalid_request" }, 400);
      }
      const { data, error } = await supabase
        .from("marketing_assets")
        .update({
          kind: enumValue(body?.kind, ASSET_KINDS, "image"),
          label,
          source_url: sourceUrl,
          storage_path: storagePath,
          alt_text: nullableText(body?.alt_text, 500),
          notes: nullableText(body?.notes, 2000),
          approved: Boolean(body?.approved),
        })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      if (existing.storage_path && existing.storage_path !== storagePath && existing.storage_path.startsWith(`owners/${user.id}/`)) {
        const { error: removeError } = await supabase.storage.from("marketing-assets").remove([existing.storage_path]);
        if (removeError) console.error("Could not remove replaced marketing asset", removeError);
      }
      return reply({ asset: data });
    }

    if (action === "delete_asset") {
      const id = nullableUuid(body?.id);
      if (!id) return reply({ reason: "invalid_request" }, 400);
      const { data: existing, error: existingError } = await supabase
        .from("marketing_assets")
        .select("id, storage_path")
        .eq("id", id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing) return reply({ reason: "not_found" }, 404);
      const { error } = await supabase.from("marketing_assets").delete().eq("id", id);
      if (error) throw error;
      if (existing.storage_path?.startsWith(`owners/${user.id}/`)) {
        const { error: removeError } = await supabase.storage.from("marketing-assets").remove([existing.storage_path]);
        if (removeError) console.error("Could not remove deleted marketing asset file", removeError);
      }
      return reply({ deleted_id: id });
    }

    if (action === "list_reddit_communities") {
      const { data, error } = await supabase
        .from("marketing_reddit_communities")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return reply({ communities: data || [] });
    }

    if (action === "create_reddit_community") {
      const name = text(body?.name, 24);
      const url = externalUrl(body?.url);
      if (!/^r\/[A-Za-z0-9_]{3,21}$/.test(name) || !url) return reply({ reason: "invalid_request" }, 400);
      const { data, error } = await supabase
        .from("marketing_reddit_communities")
        .insert({
          name,
          url,
          status: enumValue(body?.status, REDDIT_COMMUNITY_STATUSES, "watching"),
          rules_url: externalUrl(body?.rules_url),
          topic_notes: nullableText(body?.topic_notes, 2000),
          participation_notes: nullableText(body?.participation_notes, 2000),
          created_by: user.id,
        })
        .select("*")
        .single();
      if (error?.code === "23505") return reply({ reason: "community_exists" }, 409);
      if (error) throw error;
      return reply({ community: data }, 201);
    }

    if (action === "list_reddit_opportunities") {
      const { data, error } = await supabase
        .from("marketing_reddit_opportunities")
        .select("*, community:marketing_reddit_communities(id, name, url, status, participation_notes)")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return reply({ opportunities: data || [] });
    }

    if (action === "scan_reddit_communities") {
      const result = await scanRedditCommunities();
      if ("reason" in result) return reply({ reason: result.reason }, 422);
      return reply({ scan: result });
    }

    if (action === "create_reddit_opportunity") {
      const communityId = nullableText(body?.community_id, 80);
      const sourceUrl = externalUrl(body?.source_url);
      const sourceTitle = text(body?.source_title, 500);
      const score = Number(body?.relevance_score);
      if (!communityId || !sourceUrl || !sourceTitle || !Number.isInteger(score) || score < 0 || score > 100) {
        return reply({ reason: "invalid_request" }, 400);
      }
      const { data, error } = await supabase
        .from("marketing_reddit_opportunities")
        .insert({
          community_id: communityId,
          source_url: sourceUrl,
          source_title: sourceTitle,
          source_excerpt: nullableText(body?.source_excerpt, 3000),
          relevance_score: score,
          recommended_stage: enumValue(body?.recommended_stage, REDDIT_REPLY_STAGES, "helpful"),
          draft_reply: nullableText(body?.draft_reply, 10000),
          status: enumValue(body?.status, REDDIT_OPPORTUNITY_STATUSES, "new"),
        })
        .select("*, community:marketing_reddit_communities(id, name, url, status, participation_notes)")
        .single();
      if (error?.code === "23505") return reply({ reason: "opportunity_exists" }, 409);
      if (error) throw error;
      return reply({ opportunity: data }, 201);
    }

    if (action === "update_reddit_opportunity") {
      const id = nullableText(body?.id, 80);
      if (!id) return reply({ reason: "invalid_request" }, 400);
      const nextStatus = enumValue(body?.status, REDDIT_OPPORTUNITY_STATUSES, "new");
      const row = {
        status: nextStatus,
        draft_reply: nullableText(body?.draft_reply, 10000),
        reviewed_at: ["approved", "replied", "dismissed"].includes(nextStatus) ? new Date().toISOString() : null,
        reviewed_by: ["approved", "replied", "dismissed"].includes(nextStatus) ? user.id : null,
      };
      const { data, error } = await supabase
        .from("marketing_reddit_opportunities")
        .update(row)
        .eq("id", id)
        .select("*, community:marketing_reddit_communities(id, name, url, status, participation_notes)")
        .single();
      if (error) throw error;
      return reply({ opportunity: data });
    }

    return reply({ reason: "invalid_action" }, 400);
  } catch (error) {
    console.error("marketing-admin", error);
    return reply({ reason: "server_error" }, 500);
  }
});
