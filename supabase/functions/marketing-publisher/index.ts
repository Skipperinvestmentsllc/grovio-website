import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  decryptMarketingCredential,
  encryptMarketingCredential,
  marketingChannelOAuthConfig,
} from "../_shared/marketing-meta-oauth.ts";
import { syncInstagramRecentMedia } from "../_shared/marketing-instagram-sync.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const TIKTOK_CHUNK_BYTES = 10 * 1024 * 1024;

function response(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

function text(value: unknown, maximum = 5000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function safeError(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 500) : "Publishing could not finish.";
}

async function activeConnection(platform: string) {
  const { data, error } = await supabase
    .from("marketing_channel_connections")
    .select("id, external_account_id, account_name, scopes, access_token_ciphertext, refresh_token_ciphertext, token_expires_at")
    .eq("platform", platform)
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function updateConnection(connectionId: string, values: Record<string, unknown>) {
  const { error } = await supabase.from("marketing_channel_connections").update(values).eq("id", connectionId);
  if (error) throw error;
}

async function refreshXTokenIfNeeded(connection: any) {
  const expiresSoon = !connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 2 * 60 * 1000;
  if (!expiresSoon) return decryptMarketingCredential(connection.access_token_ciphertext);
  if (!connection.refresh_token_ciphertext) throw new Error("Reconnect X before its scheduled posts can publish.");
  const config = marketingChannelOAuthConfig("x");
  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: await decryptMarketingCredential(connection.refresh_token_ciphertext) }),
  });
  if (!tokenResponse.ok) throw new Error("X token refresh failed. Reconnect X, then schedule the post again.");
  const token = await tokenResponse.json();
  if (!text(token?.access_token, 4000)) throw new Error("X did not return a refreshed access token.");
  await updateConnection(connection.id, {
    access_token_ciphertext: await encryptMarketingCredential(token.access_token),
    refresh_token_ciphertext: text(token?.refresh_token, 4000) ? await encryptMarketingCredential(token.refresh_token) : connection.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + (Number(token?.expires_in) || 7200) * 1000).toISOString(),
    last_error: null,
  });
  return token.access_token as string;
}

async function refreshTikTokTokenIfNeeded(connection: any) {
  const expiresSoon = !connection.token_expires_at || new Date(connection.token_expires_at).getTime() < Date.now() + 10 * 60 * 1000;
  if (!expiresSoon) return decryptMarketingCredential(connection.access_token_ciphertext);
  if (!connection.refresh_token_ciphertext) throw new Error("Reconnect TikTok before its queue can run.");
  const config = marketingChannelOAuthConfig("tiktok");
  const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: await decryptMarketingCredential(connection.refresh_token_ciphertext),
    }),
  });
  if (!tokenResponse.ok) throw new Error("TikTok token refresh failed. Reconnect TikTok before retrying.");
  const token = await tokenResponse.json();
  if (!text(token?.access_token, 4000)) throw new Error("TikTok did not return a refreshed access token.");
  await updateConnection(connection.id, {
    access_token_ciphertext: await encryptMarketingCredential(token.access_token),
    refresh_token_ciphertext: text(token?.refresh_token, 4000) ? await encryptMarketingCredential(token.refresh_token) : connection.refresh_token_ciphertext,
    token_expires_at: new Date(Date.now() + (Number(token?.expires_in) || 86400) * 1000).toISOString(),
    last_error: null,
  });
  return token.access_token as string;
}

async function sourceVideo(content: any) {
  if (content.featured_asset_id) {
    const { data: asset, error } = await supabase
      .from("marketing_assets")
      .select("kind, storage_path")
      .eq("id", content.featured_asset_id)
      .maybeSingle();
    if (error) throw error;
    if (asset?.kind !== "video" || !asset.storage_path) throw new Error("Choose a finished video from Library before queuing this Reel to TikTok.");
    const { data, error: downloadError } = await supabase.storage.from("marketing-assets").download(asset.storage_path);
    if (downloadError) throw downloadError;
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_VIDEO_BYTES) throw new Error("TikTok queue videos must be a finished file no larger than 100 MB.");
    return { bytes, contentType: data.type || "video/mp4" };
  }
  const sourceUrl = text(content.structured_data?.source_media_url, 4000);
  if (!sourceUrl) throw new Error("This Reel has no finished source video. Upload it to Library or sync it again from Instagram.");
  const sourceResponse = await fetch(sourceUrl);
  if (!sourceResponse.ok) throw new Error("Instagram's temporary video link expired. Sync Instagram again or upload the original Reel to Library.");
  const bytes = new Uint8Array(await sourceResponse.arrayBuffer());
  if (!bytes.byteLength || bytes.byteLength > MAX_VIDEO_BYTES) throw new Error("TikTok queue videos must be a finished file no larger than 100 MB.");
  return { bytes, contentType: sourceResponse.headers.get("content-type")?.split(";")[0] || "video/mp4" };
}

async function publishX(post: any, content: any) {
  const connection = await activeConnection("x");
  if (!connection) throw new Error("Connect X before its scheduled posts can publish.");
  if (!Array.isArray(connection.scopes) || !connection.scopes.includes("tweet.write")) throw new Error("Reconnect X with posting permission before publishing scheduled posts.");
  const copy = text(post.copy || content.caption, 280);
  if (!copy) throw new Error("Add post copy before scheduling an X post.");
  if (text(post.copy || content.caption, 2000).length > 280) throw new Error("An X post must be 280 characters or fewer. Edit the channel copy and reschedule it.");
  const token = await refreshXTokenIfNeeded(connection);
  const publishResponse = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: copy }),
  });
  const payload = await publishResponse.json().catch(() => ({}));
  if (!publishResponse.ok || !text(payload?.data?.id, 100)) throw new Error(text(payload?.detail || payload?.title, 400) || "X declined this post. Check available X API credits and posting access.");
  const postId = payload.data.id as string;
  return { platform_post_id: postId, platform_post_url: `https://x.com/${encodeURIComponent(connection.account_name || "i")}/status/${encodeURIComponent(postId)}`, provider_payload: { x_post_id: postId } };
}

async function queueTikTok(post: any, content: any) {
  const connection = await activeConnection("tiktok");
  if (!connection) throw new Error("Connect TikTok before its queue can run.");
  if (!Array.isArray(connection.scopes) || !connection.scopes.includes("video.upload")) throw new Error("Reconnect TikTok with Upload permission before its queue can run.");
  const token = await refreshTikTokTokenIfNeeded(connection);
  const video = await sourceVideo(content);
  const total = video.bytes.byteLength;
  const chunkSize = total <= 64 * 1024 * 1024 ? total : TIKTOK_CHUNK_BYTES;
  const totalChunks = Math.ceil(total / chunkSize);
  const initResponse = await fetch("https://open.tiktokapis.com/v2/post/publish/inbox/video/init/", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
    body: JSON.stringify({ source_info: { source: "FILE_UPLOAD", video_size: total, chunk_size: chunkSize, total_chunk_count: totalChunks } }),
  });
  const init = await initResponse.json().catch(() => ({}));
  const publishId = text(init?.data?.publish_id, 100);
  const uploadUrl = text(init?.data?.upload_url, 1000);
  if (!initResponse.ok || init?.error?.code !== "ok" || !publishId || !uploadUrl) throw new Error(text(init?.error?.message, 400) || "TikTok could not start this upload.");

  for (let start = 0; start < total; start += chunkSize) {
    const endExclusive = Math.min(start + chunkSize, total);
    const chunk = video.bytes.slice(start, endExclusive);
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": video.contentType,
        "Content-Length": String(chunk.byteLength),
        "Content-Range": `bytes ${start}-${endExclusive - 1}/${total}`,
      },
      body: chunk,
    });
    if (!upload.ok) throw new Error("TikTok could not receive this video. It remains unsent; you can retry from the calendar.");
  }
  return { platform_post_id: publishId, provider_payload: { tiktok_publish_id: publishId, queued_at: new Date().toISOString(), requires_creator_review: true } };
}

async function updatePost(id: string, update: Record<string, unknown>) {
  const { error } = await supabase.from("marketing_channel_posts").update(update).eq("id", id);
  if (error) throw error;
}

async function deliver(post: any) {
  const content = post.content;
  if (!content) throw new Error("The scheduled content no longer exists.");
  await updatePost(post.id, { delivery_attempts: Number(post.delivery_attempts || 0) + 1, last_delivery_attempt_at: new Date().toISOString(), delivery_error: null });
  if (post.channel === "x") {
    const result = await publishX(post, content);
    await updatePost(post.id, { status: "published", published_at: new Date().toISOString(), delivery_error: null, ...result });
    return { channel: "x", status: "published", id: post.id };
  }
  if (post.channel === "tiktok") {
    const result = await queueTikTok(post, content);
    await updatePost(post.id, { status: "queued", delivery_error: null, ...result });
    return { channel: "tiktok", status: "queued", id: post.id };
  }
  return { channel: post.channel, status: "manual", id: post.id };
}

async function runDue() {
  const { data: automation, error: automationError } = await supabase
    .from("marketing_channel_automations")
    .select("id")
    .eq("source_platform", "instagram")
    .eq("destination_platform", "tiktok")
    .eq("enabled", true)
    .maybeSingle();
  if (automationError) throw automationError;
  const instagram = automation
    ? await syncInstagramRecentMedia(supabase).catch((error) => ({ error: safeError(error) }))
    : { skipped: "instagram_tiktok_queue_paused" };
  const { data: duePosts, error } = await supabase
    .from("marketing_channel_posts")
    .select("id, channel, status, copy, scheduled_for, delivery_attempts, content:marketing_content(id, caption, featured_asset_id, structured_data)")
    .eq("status", "scheduled")
    .in("channel", ["x", "tiktok"])
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(20);
  if (error) throw error;
  const delivered: unknown[] = [];
  const failed: unknown[] = [];
  for (const post of duePosts || []) {
    try {
      delivered.push(await deliver(post));
    } catch (error) {
      const message = safeError(error);
      await updatePost(post.id, { status: "failed", delivery_error: message, last_delivery_attempt_at: new Date().toISOString() });
      failed.push({ id: post.id, channel: post.channel, error: message });
    }
  }
  return { instagram, delivered, failed };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ reason: "method_not_allowed" }, 405);
  const expected = Deno.env.get("MARKETING_PUBLISHER_CRON_SECRET")?.trim();
  const supplied = request.headers.get("x-marketing-publisher-secret") || "";
  if (!expected || !supplied || supplied !== expected) return response({ reason: "forbidden" }, 403);
  try {
    return response(await runDue());
  } catch (error) {
    console.error("marketing-publisher", safeError(error));
    return response({ reason: "publisher_failed" }, 500);
  }
});
