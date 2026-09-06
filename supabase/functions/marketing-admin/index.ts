import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  marketingMetaConfig,
  marketingMetaScopes,
  signMarketingOAuthState,
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
const AI_CREATIVE_FORMATS = new Set(["carousel", "reel", "image_post"]);
const REDDIT_COMMUNITY_STATUSES = new Set(["watching", "participating", "paused", "not_a_fit"]);
const REDDIT_OPPORTUNITY_STATUSES = new Set(["new", "watching", "drafted", "approved", "replied", "dismissed"]);
const REDDIT_REPLY_STAGES = new Set(["helpful", "contextual", "transparent_mention"]);
const ASSET_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/quicktime", "video/webm", "application/pdf",
]);
const MAX_ASSET_BYTES = 20 * 1024 * 1024;

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

async function openAIVideoJson(key: string, path: string, init: RequestInit) {
  const response = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: { "Authorization": `Bearer ${key}`, ...(init.headers || {}) },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI video request failed", response.status, detail.slice(0, 500));
    throw new Error("OpenAI could not complete this video request.");
  }
  return await response.json();
}

async function openAIVideoContent(key: string, videoId: string) {
  const response = await fetch(`https://api.openai.com/v1/videos/${encodeURIComponent(videoId)}/content`, {
    headers: { "Authorization": `Bearer ${key}` },
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI video download failed", response.status, detail.slice(0, 500));
    throw new Error("OpenAI could not download this video.");
  }
  return response;
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
    .select("workspace, name, website, colors, font, description, voice, audience")
    .eq("workspace", "default")
    .maybeSingle();
  if (error) throw error;
  return data;
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

  const sourceDescription = source
    ? `${source.label}${source.alt_text ? ` — ${source.alt_text}` : ""}`
    : "No product screenshot is selected. Do not invent or describe product UI.";
  const creativeResponse = await openAIJson(key, "/responses", {
    model: "gpt-5",
    store: false,
    max_output_tokens: 900,
    safety_identifier: await hashedSafetyIdentifier(user.id),
    instructions: `You are ${brandName}'s senior content strategist. Product truth: ${productTruth}\nVoice: ${voice}\nAudience: ${audience}\nDo not claim features or outcomes that have not been given.\n\nReturn ONLY a valid JSON object with these keys: title, hook, headline, caption, voiceover, visual_direction, slides, scenes. ${creativeFormatInstructions(format)}\n\nThe selected source asset is: ${sourceDescription}. The real source asset will be composited separately. Never ask the image generator to reproduce the app interface, logo, UI text, screenshots, or any readable words.`,
    input: `Format: ${format}\nTopic: ${title}\nWhat the parent needs: ${message}\nPrimary keyword: ${primaryKeyword || "none"}\nDestination: ${destination || "none"}`,
  });
  const creative = normalizeCreative(parseGeneratedJson(creativeResponse), format, title, message);
  const imagePrompt = `Create a warm, editorial supporting visual for ${brandName}. ${creative.visual_direction}\n\nPalette: ${(colors.length ? colors : ["#F7F4EE", "#4A6E4E", "#2C2218"]).join(", ")}. The image must feel candid, human, calming, and modern. It is a supporting background only: no app interface, no phone/computer screens, no ${brandName} logo, no text, no lettering, no watermark, no badges. Leave generous quiet space for a real product screenshot to be composited separately.`;
  if (format === "reel") {
    const videoForm = new FormData();
    videoForm.set("model", "sora-2");
    videoForm.set("seconds", "4");
    videoForm.set("size", "720x1280");
    videoForm.set("prompt", `Create a 4-second vertical editorial video for ${brandName}. ${creative.visual_direction}\n\nThe video should be a quiet, candid real-life homeschool moment that supports this message: ${creative.hook}. Tone: ${voice}. No app interface, no phones or computer screens, no ${brandName} logo, no readable text, no captions, no watermark, no badges. The real Grovio product screen will be added separately in the approved edit.`);
    const video = await openAIVideoJson(key, "/videos", { method: "POST", body: videoForm });
    const videoId = text(video?.id, 200);
    if (!videoId) throw new Error("OpenAI did not return a video job.");
    return { creative, video_job: { id: videoId, status: text(video?.status, 40) || "queued", model: text(video?.model, 80) || "sora-2" } };
  }
  const imageResponse = await openAIJson(key, "/images/generations", {
    model: "gpt-image-1",
    prompt: imagePrompt,
    size: format === "reel" ? "1024x1536" : "1024x1024",
    quality: "low",
  });
  const imageBase64 = typeof imageResponse?.data?.[0]?.b64_json === "string" ? imageResponse.data[0].b64_json : "";
  if (!imageBase64) throw new Error("OpenAI did not return an image draft.");
  const generatedAsset = await storeGeneratedImage(user.id, creative.title, creative.visual_direction, imageBase64);
  return { creative, generated_asset: generatedAsset };
}

async function resolveOpenAIVideo(user: { id: string }, contentId: string) {
  const key = Deno.env.get("OPENAI_API_KEY")?.trim();
  if (!key) return { reason: "ai_not_configured" as const };
  const { data: content, error } = await supabase
    .from("marketing_content")
    .select("id, title, content_type, structured_data")
    .eq("id", contentId)
    .maybeSingle();
  if (error) throw error;
  if (!content || content.content_type !== "reel") return { reason: "not_found" as const };
  const structured = jsonObject(content.structured_data) || {};
  const job = jsonObject(structured.openai_video);
  const videoId = text(job?.id, 200);
  if (!videoId) return { reason: "video_not_requested" as const };
  const video = await openAIVideoJson(key, `/videos/${encodeURIComponent(videoId)}`, { method: "GET" });
  const status = text(video?.status, 40) || "queued";
  const nextJob = { id: videoId, status, model: text(video?.model, 80) || text(job?.model, 80) || "sora-2" };
  if (status !== "completed") {
    const { data: updated, error: updateError } = await supabase
      .from("marketing_content")
      .update({ structured_data: { ...structured, openai_video: nextJob } })
      .eq("id", contentId)
      .select("*")
      .single();
    if (updateError) throw updateError;
    return { content: updated, video_job: nextJob };
  }
  if (nullableUuid(structured.generated_video_asset_id)) return { content, video_job: nextJob, generated_asset_id: structured.generated_video_asset_id };
  const videoContent = await openAIVideoContent(key, videoId);
  const storagePath = `owners/${user.id}/ai/${crypto.randomUUID()}.mp4`;
  const { error: uploadError } = await supabase.storage
    .from("marketing-assets")
    .upload(storagePath, new Uint8Array(await videoContent.arrayBuffer()), { contentType: "video/mp4", upsert: false });
  if (uploadError) throw uploadError;
  const { data: generatedAsset, error: assetError } = await supabase
    .from("marketing_assets")
    .insert({
      kind: "video",
      label: `OpenAI Reel concept — ${content.title}`.slice(0, 160),
      storage_path: storagePath,
      alt_text: "OpenAI-generated supporting Reel video. It must be reviewed before use in published Grovio content.",
      notes: "Generated as a supporting Reel video. The actual Grovio product screen must remain an approved source asset.",
      approved: false,
      created_by: user.id,
    })
    .select("*")
    .single();
  if (assetError) {
    await supabase.storage.from("marketing-assets").remove([storagePath]);
    throw assetError;
  }
  const { data: updated, error: updateError } = await supabase
    .from("marketing_content")
    .update({ structured_data: { ...structured, openai_video: nextJob, generated_video_asset_id: generatedAsset.id } })
    .eq("id", contentId)
    .select("*")
    .single();
  if (updateError) throw updateError;
  return { content: updated, video_job: nextJob, generated_asset: generatedAsset };
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
          created_by: user.id,
          updated_by: user.id,
        }, { onConflict: "workspace" })
        .select("workspace, name, website, colors, font, description, voice, audience, updated_at")
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

    if (action === "resolve_openai_video") {
      const contentId = nullableUuid(body?.content_id);
      if (!contentId) return reply({ reason: "invalid_request" }, 400);
      try {
        const result = await resolveOpenAIVideo(user, contentId);
        if ("reason" in result) return reply({ reason: result.reason }, result.reason === "ai_not_configured" ? 422 : 404);
        return reply(result);
      } catch (error) {
        console.error("marketing-admin OpenAI video", error);
        return reply({ reason: "ai_video_failed" }, 502);
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
        .select("*, campaign:marketing_campaigns(id, name, slug)")
        .order("updated_at", { ascending: false })
        .limit(100);
      if (campaignId) query = query.eq("campaign_id", campaignId);
      if (type && CONTENT_TYPES.has(type)) query = query.eq("content_type", type);
      const { data, error } = await query;
      if (error) throw error;
      return reply({ content: data || [] });
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
