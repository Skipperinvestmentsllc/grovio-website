import { decryptMarketingCredential } from "./marketing-meta-oauth.ts";

type ServiceClient = any;

type InstagramMedia = {
  id?: unknown;
  caption?: unknown;
  media_type?: unknown;
  media_product_type?: unknown;
  media_url?: unknown;
  permalink?: unknown;
  timestamp?: unknown;
  thumbnail_url?: unknown;
};

function text(value: unknown, maximum = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function mediaContentType(media: InstagramMedia) {
  const type = text(media.media_type, 40).toUpperCase();
  const product = text(media.media_product_type, 40).toUpperCase();
  if (product === "REELS" || type === "VIDEO") return "reel";
  if (type === "CAROUSEL_ALBUM") return "carousel";
  return "image_post";
}

function publishedAt(value: unknown) {
  const candidate = text(value, 80);
  const parsed = new Date(candidate);
  return candidate && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : new Date().toISOString();
}

function mediaTitle(caption: string, contentType: string, timestamp: string) {
  const firstLine = caption.split(/\r?\n/).find(Boolean) || "";
  const label = contentType === "reel" ? "Instagram Reel" : contentType === "carousel" ? "Instagram carousel" : "Instagram post";
  return firstLine.slice(0, 210) || `${label} — ${timestamp.slice(0, 10)}`;
}

export async function syncInstagramRecentMedia(supabase: ServiceClient, limit = 25) {
  const { data: connection, error: connectionError } = await supabase
    .from("marketing_channel_connections")
    .select("id, external_account_id, access_token_ciphertext, connected_by")
    .eq("platform", "instagram")
    .eq("status", "connected")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection) return { reason: "channel_not_connected" as const };

  const accessToken = await decryptMarketingCredential(connection.access_token_ciphertext);
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,caption,media_type,media_product_type,media_url,permalink,timestamp,thumbnail_url");
  url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 50))));
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Instagram media sync failed. Reconnect Instagram if its authorization has expired.");
  const payload = await response.json();
  const media = Array.isArray(payload?.data) ? payload.data as InstagramMedia[] : [];

  const { data: automation, error: automationError } = await supabase
    .from("marketing_channel_automations")
    .select("id, enabled")
    .eq("source_platform", "instagram")
    .eq("destination_platform", "tiktok")
    .maybeSingle();
  if (automationError) throw automationError;
  const tiktokQueueEnabled = automation?.enabled === true;
  let imported = 0;
  let queued = 0;

  for (const item of media) {
    const mediaId = text(item.id, 200);
    if (!mediaId) continue;
    const externalId = `instagram:${mediaId}`;
    const { data: existing, error: existingError } = await supabase
      .from("marketing_content")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();
    if (existingError) throw existingError;

    const caption = text(item.caption, 5000);
    const contentType = mediaContentType(item);
    const timestamp = publishedAt(item.timestamp);
    const permalink = text(item.permalink, 2000) || null;
    const sourceMediaUrl = text(item.media_url, 4000) || null;
    let contentId = existing?.id as string | undefined;

    if (!contentId) {
      const { data: created, error: createError } = await supabase
        .from("marketing_content")
        .insert({
          content_type: contentType,
          status: "published",
          title: mediaTitle(caption, contentType, timestamp),
          caption: caption || null,
          external_id: externalId,
          external_url: permalink,
          scheduled_for: timestamp,
          published_at: timestamp,
          structured_data: {
            imported_from: "instagram",
            instagram_media_id: mediaId,
            instagram_media_type: text(item.media_type, 40),
            instagram_product_type: text(item.media_product_type, 40),
            source_media_url: sourceMediaUrl,
            source_thumbnail_url: text(item.thumbnail_url, 4000) || null,
            imported_at: new Date().toISOString(),
          },
          created_by: connection.connected_by,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      contentId = created.id;
      imported += 1;
    }

    const { error: instagramPostError } = await supabase
      .from("marketing_channel_posts")
      .upsert({
        content_id: contentId,
        channel: "instagram",
        status: "published",
        copy: caption || null,
        scheduled_for: timestamp,
        published_at: timestamp,
        platform_post_id: mediaId,
        platform_post_url: permalink,
        delivery_error: null,
      }, { onConflict: "content_id,channel" });
    if (instagramPostError) throw instagramPostError;

    if (tiktokQueueEnabled && contentType === "reel" && sourceMediaUrl) {
      const { data: tiktokPost, error: tiktokPostError } = await supabase
        .from("marketing_channel_posts")
        .select("id, status")
        .eq("content_id", contentId)
        .eq("channel", "tiktok")
        .maybeSingle();
      if (tiktokPostError) throw tiktokPostError;
      if (!tiktokPost) {
        const { error: queueError } = await supabase
          .from("marketing_channel_posts")
          .insert({
            content_id: contentId,
            channel: "tiktok",
            status: "scheduled",
            copy: caption || null,
            scheduled_for: new Date().toISOString(),
            platform_config: { source: "instagram_import", requires_creator_review: true },
          });
        if (queueError) throw queueError;
        queued += 1;
      }
    }
  }

  const { error: connectionUpdateError } = await supabase
    .from("marketing_channel_connections")
    .update({ last_synced_at: new Date().toISOString(), last_error: null })
    .eq("id", connection.id);
  if (connectionUpdateError) throw connectionUpdateError;
  if (automation?.id) {
    const { error: automationUpdateError } = await supabase
      .from("marketing_channel_automations")
      .update({ last_run_at: new Date().toISOString(), last_error: null })
      .eq("id", automation.id);
    if (automationUpdateError) throw automationUpdateError;
  }
  return { imported, queued, scanned: media.length, automation_enabled: tiktokQueueEnabled };
}
