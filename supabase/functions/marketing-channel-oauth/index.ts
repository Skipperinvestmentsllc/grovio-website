import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  encryptMarketingCredential,
  marketingChannelOAuthConfig,
  type MarketingChannelProvider,
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

function success(provider: MarketingChannelProvider, returnUrl: string) {
  if (!returnUrl) return page(`${provider === "x" ? "X" : provider === "tiktok" ? "TikTok" : "Reddit"} connected`, "Grovio can now securely sync only the data that this connection authorizes.");
  const target = new URL(returnUrl);
  target.searchParams.set("marketing_connection", `${provider}_connected`);
  return Response.redirect(target, 302);
}

function basic(value: string) { return `Basic ${btoa(value)}`; }

async function exchangeTikTok(code: string, config: ReturnType<typeof marketingChannelOAuthConfig>) {
  const form = new URLSearchParams({
    client_key: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });
  const response = await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  if (!response.ok) throw new Error("TikTok token exchange failed.");
  const data = await response.json();
  if (typeof data?.access_token !== "string" || typeof data?.open_id !== "string") throw new Error("TikTok did not return account credentials.");
  return { accountId: data.open_id as string, accountName: "TikTok account", accessToken: data.access_token as string, refreshToken: typeof data?.refresh_token === "string" ? data.refresh_token : null, scopes: typeof data?.scope === "string" ? data.scope.split(",").map((item: string) => item.trim()).filter(Boolean) : [], expiresIn: Number(data?.expires_in) || 0 };
}

async function exchangeX(code: string, codeVerifier: string, config: ReturnType<typeof marketingChannelOAuthConfig>) {
  const form = new URLSearchParams({ code, grant_type: "authorization_code", redirect_uri: config.redirectUri, code_verifier: codeVerifier });
  const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basic(`${config.clientId}:${config.clientSecret}`) }, body: form });
  if (!tokenResponse.ok) throw new Error("X token exchange failed.");
  const token = await tokenResponse.json();
  if (typeof token?.access_token !== "string") throw new Error("X did not return an access token.");
  const meResponse = await fetch("https://api.x.com/2/users/me?user.fields=name,username", { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!meResponse.ok) throw new Error("X account lookup failed.");
  const me = await meResponse.json();
  if (typeof me?.data?.id !== "string") throw new Error("X did not return an account ID.");
  return { accountId: me.data.id as string, accountName: typeof me?.data?.username === "string" ? me.data.username : typeof me?.data?.name === "string" ? me.data.name : "X account", accessToken: token.access_token as string, refreshToken: typeof token?.refresh_token === "string" ? token.refresh_token : null, scopes: typeof token?.scope === "string" ? token.scope.split(" ").filter(Boolean) : [], expiresIn: Number(token?.expires_in) || 0 };
}

async function exchangeReddit(code: string, config: ReturnType<typeof marketingChannelOAuthConfig>) {
  const form = new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri });
  const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: basic(`${config.clientId}:${config.clientSecret}`), "User-Agent": "GrovioMarketingStudio/1.0 by grovioapp" }, body: form });
  if (!tokenResponse.ok) throw new Error("Reddit token exchange failed.");
  const token = await tokenResponse.json();
  if (typeof token?.access_token !== "string") throw new Error("Reddit did not return an access token.");
  const meResponse = await fetch("https://oauth.reddit.com/api/v1/me", { headers: { Authorization: `Bearer ${token.access_token}`, "User-Agent": "GrovioMarketingStudio/1.0 by grovioapp" } });
  if (!meResponse.ok) throw new Error("Reddit account lookup failed.");
  const me = await meResponse.json();
  if (typeof me?.id !== "string") throw new Error("Reddit did not return an account ID.");
  return { accountId: me.id as string, accountName: typeof me?.name === "string" ? me.name : "Reddit account", accessToken: token.access_token as string, refreshToken: typeof token?.refresh_token === "string" ? token.refresh_token : null, scopes: typeof token?.scope === "string" ? token.scope.split(" ").filter(Boolean) : [], expiresIn: Number(token?.expires_in) || 3600 };
}

Deno.serve(async (req) => {
  if (req.method !== "GET") return page("Method not allowed", "This OAuth endpoint only accepts a browser callback.", 405);
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state") || "";
    const { data: session, error: sessionError } = await supabase.from("marketing_oauth_sessions").select("state, provider, owner_id, code_verifier, expires_at").eq("state", state).maybeSingle();
    if (sessionError) throw sessionError;
    if (!session || new Date(session.expires_at).getTime() < Date.now()) return page("Connection expired", "Return to Marketing HQ and start this channel connection again.", 400);
    const provider = session.provider as MarketingChannelProvider;
    const config = marketingChannelOAuthConfig(provider);
    if (url.searchParams.get("error")) {
      await supabase.from("marketing_oauth_sessions").delete().eq("state", state);
      return page("Connection cancelled", "No channel credentials were saved. You can try again from Marketing HQ.", 400);
    }
    const code = url.searchParams.get("code");
    if (!code) return page("Connection failed", "The platform did not provide an authorization code. Please try again.", 400);
    const result = provider === "tiktok"
      ? await exchangeTikTok(code, config)
      : provider === "x"
      ? await exchangeX(code, session.code_verifier || "", config)
      : await exchangeReddit(code, config);
    const expiresAt = result.expiresIn > 0 ? new Date(Date.now() + result.expiresIn * 1000).toISOString() : null;
    const { error: connectionError } = await supabase.from("marketing_channel_connections").upsert({
      platform: provider,
      external_account_id: result.accountId,
      account_name: result.accountName,
      scopes: result.scopes,
      access_token_ciphertext: await encryptMarketingCredential(result.accessToken),
      refresh_token_ciphertext: result.refreshToken ? await encryptMarketingCredential(result.refreshToken) : null,
      token_expires_at: expiresAt,
      status: "connected",
      metadata: { credential_version: 1, oauth_provider: provider },
      last_error: null,
      connected_by: session.owner_id,
    }, { onConflict: "platform,external_account_id" });
    if (connectionError) throw connectionError;
    await supabase.from("marketing_oauth_sessions").delete().eq("state", state);
    return success(provider, config.returnUrl);
  } catch (error) {
    console.error("marketing-channel-oauth", error instanceof Error ? error.message : "unknown_error");
    return page("Connection failed", "Grovio could not finish this connection. No credentials were saved. Return to Marketing HQ and try again.", 500);
  }
});
