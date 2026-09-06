export type MarketingOAuthState = {
  version: 1;
  provider: "instagram";
  ownerId: string;
  issuedAt: number;
  nonce: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function requireSecret(name: string, minimumLength = 32) {
  const value = Deno.env.get(name)?.trim() || "";
  if (value.length < minimumLength) throw new Error(`Missing or weak ${name}.`);
  return value;
}

async function hmacKey() {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(requireSecret("MARKETING_OAUTH_STATE_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signMarketingOAuthState(state: MarketingOAuthState) {
  const payload = base64Url(encoder.encode(JSON.stringify(state)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(payload)));
  return `${payload}.${base64Url(signature)}`;
}

export async function verifyMarketingOAuthState(value: string | null): Promise<MarketingOAuthState | null> {
  if (!value) return null;
  const [payload, signature, ...extra] = value.split(".");
  if (!payload || !signature || extra.length) return null;

  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(),
      fromBase64Url(signature),
      encoder.encode(payload),
    );
    if (!valid) return null;
    const state = JSON.parse(decoder.decode(fromBase64Url(payload)));
    if (
      state?.version !== 1 ||
      state?.provider !== "instagram" ||
      typeof state?.ownerId !== "string" ||
      typeof state?.issuedAt !== "number" ||
      typeof state?.nonce !== "string" ||
      Date.now() - state.issuedAt > 10 * 60 * 1000 ||
      state.issuedAt > Date.now() + 60 * 1000
    ) return null;
    return state as MarketingOAuthState;
  } catch {
    return null;
  }
}

function encryptionKey() {
  const raw = fromBase64Url(requireSecret("MARKETING_CONNECTION_ENCRYPTION_KEY", 43));
  if (raw.byteLength !== 32) throw new Error("MARKETING_CONNECTION_ENCRYPTION_KEY must be a base64url-encoded 256-bit key.");
  return raw;
}

export async function encryptMarketingCredential(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey("raw", encryptionKey(), { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value)));
  return `v1.${base64Url(iv)}.${base64Url(ciphertext)}`;
}

export function marketingMetaConfig() {
  const appId = requireSecret("META_INSTAGRAM_APP_ID", 8);
  const appSecret = requireSecret("META_INSTAGRAM_APP_SECRET");
  const redirectUri = requireSecret("META_INSTAGRAM_REDIRECT_URI", 20);
  const returnUrl = Deno.env.get("MARKETING_OAUTH_RETURN_URL")?.trim() || "";
  const redirect = new URL(redirectUri);
  if (redirect.protocol !== "https:") throw new Error("META_INSTAGRAM_REDIRECT_URI must use HTTPS.");
  if (returnUrl) {
    const returnTarget = new URL(returnUrl);
    if (returnTarget.protocol !== "https:") throw new Error("MARKETING_OAUTH_RETURN_URL must use HTTPS.");
  }
  return { appId, appSecret, redirectUri, returnUrl };
}

export function marketingMetaScopes() {
  return [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_insights",
  ];
}
