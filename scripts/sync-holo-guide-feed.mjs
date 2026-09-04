#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const sourceDirectory = path.join(root, ".github", "holo-guide");
const defaultFeedUrl = "https://prod-api-holo-ai.fly.dev/public/seo/embed/7aea2cb8-5cda-4d77-94a9-8e6c6c0c1476.js";
const feedUrl = process.env.HOLO_GUIDE_FEED_URL || defaultFeedUrl;

function isSafeSlug(value) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value || "");
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function articleArrayFromEmbed(script) {
  const declaration = "var HOLO_ARTICLES =";
  const declarationIndex = script.indexOf(declaration);
  if (declarationIndex === -1) throw new Error("Holo's published feed did not include an article list.");

  const arrayStart = script.indexOf("[", declarationIndex + declaration.length);
  if (arrayStart === -1) throw new Error("Holo's published feed has an invalid article list.");

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = arrayStart; index < script.length; index += 1) {
    const character = script[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "[") depth += 1;
    if (character === "]") {
      depth -= 1;
      if (depth === 0) return JSON.parse(script.slice(arrayStart, index + 1));
    }
  }
  throw new Error("Holo's published feed has an unfinished article list.");
}

function sourceRecordFrom(article) {
  const slug = String(article?.slug || "");
  const publishedAt = validDate(article?.updatedAt || article?.isoDate || article?.publishedAt);
  const contentHtml = String(article?.contentHtml || article?.content || "");
  if (!isSafeSlug(slug)) throw new Error(`Holo returned an invalid article slug: ${slug || "(missing)"}.`);
  if (!String(article?.title || "").trim()) throw new Error(`Holo article ${slug} is missing a title.`);
  if (!contentHtml.trim()) throw new Error(`Holo article ${slug} is missing HTML content.`);
  if (!publishedAt) throw new Error(`Holo article ${slug} is missing a valid published date.`);

  const featuredImage = article?.featuredImage || article?.image || article?.imageUrl;
  return {
    source: "holo-embed",
    receivedAt: publishedAt,
    article: {
      id: String(article?.id || slug),
      slug,
      title: String(article.title),
      excerpt: String(article?.excerpt || article?.metaDescription || ""),
      metaTitle: String(article?.metaTitle || article.title),
      metaDescription: String(article?.metaDescription || article?.excerpt || ""),
      contentHtml,
      featuredImage: isHttpsUrl(featuredImage) ? featuredImage : null,
      publishedAt,
    },
  };
}

function writeIfChanged(filePath, contents) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previous === contents) return false;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
  return true;
}

async function main() {
  const response = await fetch(feedUrl, { headers: { "User-Agent": "grovio-guide-sync/1.0" } });
  if (!response.ok) throw new Error(`Holo's published feed returned ${response.status}.`);
  const articles = articleArrayFromEmbed(await response.text());
  if (!Array.isArray(articles)) throw new Error("Holo's published feed did not return an article array.");

  let changes = 0;
  for (const article of articles) {
    const record = sourceRecordFrom(article);
    const filePath = path.join(sourceDirectory, `${record.article.slug}.json`);
    if (writeIfChanged(filePath, `${JSON.stringify(record, null, 2)}\n`)) changes += 1;
  }
  console.log(`Synced ${articles.length} approved Holo article${articles.length === 1 ? "" : "s"}; ${changes} source file${changes === 1 ? "" : "s"} changed.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
