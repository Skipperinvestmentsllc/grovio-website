import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  encryptMarketingCredential,
  marketingMetaConfig,
  marketingMetaScopes,
  verifyMarketingOAuthState,
} from "../_shared/marketing-meta-oauth.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function page(title: string, message: string, status = 200) {
  return new Response(
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui,sans-serif;max-width:38rem;margin:5rem auto;padding:0 1.5rem;color:#1e2921"><h1>${title}</h1><p>${message}</p></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );
}

function redirectSuccess(returnUrl: string) {
  if (!returnUrl) return page("Instagram connected", "Grovio can now securely sync approved Instagram publishing and analytics data.");
  const target = new URL(returnUrl);
  target.searchParams.set("marketing_connection", "instagram_connected");
  return Response.redirect(target, 302);
}

async function exchangeCode(code: string, appId: string, appSecret: string, redirectUri: string) {
  const form = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  });
  const response = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!response.ok) throw new Error("Instagram code exchange failed.");
  const data = await response.json();
  if (typeof data?.access_token !== "string" || !data.access_token) throw new Error("Instagram did not return an access token.");
  return data.access_token as string;
}

async function exchangeLongLivedToken(shortLivedToken: string, appSecret: string) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("access_token", shortLivedToken);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Instagram long-lived token exchange failed.");
  const data = await response.json();
  if (typeof data?.access_token !== "string" || !data.access_token) throw new Error("Instagram did not return a long-lived token.");
  return { accessToken: data.access_token as string, expiresIn: Number(data.expires_in) || 0 };
}

async function profile(accessToken: string) {
  const url = new URL("https://graph.instagram.com/me");
  url.searchParams.set("fields", "user_id,username");
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url);
  if (!response.ok) throw new Error("Instagram profile lookup failed.");
  const data = await response.json();
  const userId = typeof data?.user_id === "string" ? data.user_id : "";
  if (!userId) throw new Error("Instagram did not return an account ID.");
  return { userId, username: typeof data?.username === "string" ? data.username.slice(0, 120) : null };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return page("Method not allowed", "This OAuth endpoint only accepts a browser callback.", 405);

  try {
    const url = new URL(req.url);
    const state = await verifyMarketingOAuthState(url.searchParams.get("state"));
    if (!state) return page("Connection expired", "Please return to Marketing HQ and start the Instagram connection again.", 400);
    if (url.searchParams.get("error")) return page("Instagram connection cancelled", "No Instagram credentials were saved. You can try again from Marketing HQ.", 400);

    const code = url.searchParams.get("code");
    if (!code) return page("Instagram connection failed", "Instagram did not provide an authorization code. Please try again from Marketing HQ.", 400);

    const config = marketingMetaConfig();
    const shortLivedToken = await exchangeCode(code, config.appId, config.appSecret, config.redirectUri);
    const { accessToken, expiresIn } = await exchangeLongLivedToken(shortLivedToken, config.appSecret);
    const account = await profile(accessToken);
    const expiresAt = expiresIn > 0 ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    const { error } = await supabase
      .from("marketing_channel_connections")
      .upsert({
        platform: "instagram",
        external_account_id: account.userId,
        account_name: account.username,
        scopes: marketingMetaScopes(),
        access_token_ciphertext: await encryptMarketingCredential(accessToken),
        refresh_token_ciphertext: null,
        token_expires_at: expiresAt,
        status: "connected",
        metadata: { credential_version: 1 },
        last_error: null,
        connected_by: state.ownerId,
      }, { onConflict: "platform,external_account_id" });
    if (error) throw error;

    return redirectSuccess(config.returnUrl);
  } catch (error) {
    console.error("marketing-meta-oauth", error instanceof Error ? error.message : "unknown_error");
    return page("Instagram connection failed", "Grovio could not finish the connection. No credentials were saved. Please return to Marketing HQ and try again.", 500);
  }
});
