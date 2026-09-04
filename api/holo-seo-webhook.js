const { createHmac, timingSafeEqual } = require("node:crypto");

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function readRawBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("Payload too large."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function isSafeSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || "");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function githubHeaders(token) {
  return { Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "grovio-holo-guide-webhook" };
}

async function githubRequest(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  if (!response.ok) throw new Error(`GitHub returned ${response.status}: ${body.slice(0, 240)}`);
  return body ? JSON.parse(body) : null;
}

async function upsertSourceFile({ token, repository, branch, sourcePath, record }) {
  const encodedPath = sourcePath.split("/").map(encodeURIComponent).join("/");
  const endpoint = `https://api.github.com/repos/${repository}/contents/${encodedPath}`;
  const headers = githubHeaders(token);
  let existing = null;
  const getResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers });
  if (getResponse.status === 200) {
    existing = await getResponse.json();
  } else if (getResponse.status !== 404) {
    const errorText = await getResponse.text();
    throw new Error(`GitHub could not read the Holo source file (${getResponse.status}): ${errorText.slice(0, 240)}`);
  }
  if (existing?.content) {
    const currentRecord = JSON.parse(Buffer.from(existing.content, "base64").toString("utf8"));
    if (stableStringify(currentRecord.article) === stableStringify(record.article)) return false;
  }
  const body = { message: `Publish Holo Guide article: ${record.article.slug}`, content: Buffer.from(`${JSON.stringify(record, null, 2)}\n`).toString("base64"), branch };
  if (existing?.sha) body.sha = existing.sha;
  await githubRequest(endpoint, { method: "PUT", headers, body: JSON.stringify(body) });
  return true;
}

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ message: "Method Not Allowed" });
    return;
  }
  const webhookSecret = process.env.HOLO_WEBHOOK_SECRET;
  const githubToken = process.env.GITHUB_CONTENTS_TOKEN;
  if (!webhookSecret || !githubToken) {
    response.status(503).json({ message: "The publishing endpoint is not configured." });
    return;
  }
  try {
    const rawBody = await readRawBody(request);
    const provided = Buffer.from(String(request.headers["x-holo-signature"] || ""), "utf8");
    const expected = Buffer.from(`sha256=${createHmac("sha256", webhookSecret).update(rawBody).digest("hex")}`, "utf8");
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      response.status(401).json({ message: "Invalid webhook signature." });
      return;
    }
    const payload = JSON.parse(rawBody.toString("utf8"));
    if (payload.test) {
      response.status(200).json({ message: "Holo test webhook received." });
      return;
    }
    if (!["article.published", "article.updated"].includes(payload.event) || !payload.article || !isSafeSlug(payload.article.slug)) {
      response.status(400).json({ message: "Unsupported Holo article payload." });
      return;
    }
    if (process.env.HOLO_BRAND_ID && payload.brand?.id !== process.env.HOLO_BRAND_ID) {
      response.status(403).json({ message: "This webhook does not belong to the configured Holo brand." });
      return;
    }
    const record = { source: "holo", receivedAt: payload.sentAt || new Date().toISOString(), article: payload.article };
    const repository = process.env.GITHUB_REPOSITORY || "Skipperinvestmentsllc/grovio-website";
    const branch = process.env.GITHUB_BRANCH || "main";
    const changed = await upsertSourceFile({ token: githubToken, repository, branch, sourcePath: `.github/holo-guide/${payload.article.slug}.json`, record });
    const origin = (process.env.SITE_ORIGIN || "https://grovioapp.com").replace(/\/$/, "");
    response.status(changed ? 202 : 200).json({ message: changed ? "Article queued for Guide publishing." : "Article is already queued.", url: `${origin}/guide/${payload.article.slug}` });
  } catch (error) {
    const statusCode = error && error.statusCode ? error.statusCode : 500;
    response.status(statusCode).json({ message: statusCode === 413 ? "Payload too large." : "Unable to receive the Holo article." });
  }
};

module.exports.config = { api: { bodyParser: false } };
