#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDirectory, "..");
const incomingDirectory = path.join(".github", "holo-guide");
const latestStart = "<!-- HOLO_LATEST_START -->";
const latestEnd = "<!-- HOLO_LATEST_END -->";
const libraryStart = "<!-- HOLO_LIBRARY_START -->";
const libraryEnd = "<!-- HOLO_LIBRARY_END -->";

const relatedArticles = [
  { slug: "how-do-i-start-homeschooling", title: "How do I start homeschooling my child?", description: "Start with the first decision in front of you." },
  { slug: "do-i-need-to-track-attendance", title: "Do I need to track attendance for homeschooling?", description: "A calmer way to understand what your family may need to keep." },
  { slug: "what-records-should-i-keep", title: "What records should I keep for homeschooling?", description: "Keep the proof without building a filing system you dread." },
  { slug: "how-do-i-create-a-daily-rhythm", title: "How do I create a simple daily rhythm that works?", description: "Find a rhythm that belongs to your family." },
  { slug: "how-do-homeschool-portfolios-work", title: "How do homeschool portfolios work?", description: "A portfolio can tell the real story of learning." },
];

function parseArguments(argv) {
  const options = { root: defaultRoot };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--root") {
      options.root = path.resolve(argv[index + 1] || defaultRoot);
      index += 1;
    } else if (argument === "--help") {
      console.log("Usage: node scripts/publish-holo-guide-article.mjs [--root /path/to/site]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeFileIfChanged(filePath, contents) {
  const previousContents = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
  if (previousContents !== contents) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, contents);
    return true;
  }
  return false;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsonForScript(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeArticleHtml(value) {
  let html = String(value || "").trim();
  html = html
    .replace(/<(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(script|style|iframe|object|embed|form|link|meta|base)\b[^>]*\/?\s*>/gi, "")
    .replace(/<h1\b[^>]*>[\s\S]*?<\/h1\s*>/i, "")
    .replace(/\s(?:on[a-z]+|style)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(?:"\s*(?:javascript:|data:text\/html)[^"]*"|'\s*(?:javascript:|data:text\/html)[^']*'|(?:javascript:|data:text\/html)[^\s>]*)/gi, "")
    .replace(/<a\b([^>]*)>/gi, (match, attributes) => {
      if (/\btarget\s*=\s*(['"])_blank\1/i.test(attributes) && !/\brel\s*=/i.test(attributes)) {
        return `<a${attributes} rel="noopener noreferrer">`;
      }
      return match;
    });
  return html;
}

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

function dateFrom(value, fallback) {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) throw new Error("The Holo article needs a valid published date.");
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function validateSource(source, filePath) {
  const article = source?.article || source;
  if (!article || typeof article !== "object") throw new Error(`${filePath} does not contain an article.`);
  if (!isSafeSlug(article.slug)) throw new Error(`${filePath} has an invalid slug.`);
  if (!article.title || typeof article.title !== "string") throw new Error(`${filePath} is missing an article title.`);
  if (!article.contentHtml || typeof article.contentHtml !== "string") throw new Error(`${filePath} is missing article HTML.`);

  const contentHtml = sanitizeArticleHtml(article.contentHtml);
  if (!stripHtml(contentHtml)) throw new Error(`${filePath} has no publishable article content after sanitizing.`);

  const publishedDate = dateFrom(article.publishedAt, source.receivedAt);
  const modifiedDate = dateFrom(source.receivedAt || article.publishedAt, article.publishedAt);
  const excerpt = stripHtml(article.excerpt || article.metaDescription || contentHtml).slice(0, 220);
  return {
    id: String(article.id || article.slug),
    slug: article.slug,
    title: stripHtml(article.title).slice(0, 180),
    excerpt,
    metaTitle: stripHtml(article.metaTitle || article.title).slice(0, 180),
    metaDescription: stripHtml(article.metaDescription || excerpt).slice(0, 260),
    contentHtml,
    featuredImage: isHttpsUrl(article.featuredImage) ? article.featuredImage : null,
    publishedDate,
    modifiedDate,
    readMinutes: Math.max(1, Math.ceil(stripHtml(contentHtml).split(/\s+/).length / 225)),
  };
}

function sharedNavigation() {
  return `
  <header class="grovio-nav"><div class="grovio-nav-inner"><a href="/" class="grovio-wordmark">grovio</a><div class="grovio-nav-right"><a href="/get" class="grovio-nav-cta">Download free &rarr;</a><button class="grovio-nav-burger" id="grovioNavBurger" aria-label="Open menu" aria-expanded="false" aria-controls="grovioNavPanel"><span></span><span></span><span></span></button></div></div></header>
  <div class="grovio-nav-overlay" id="grovioNavOverlay"></div>
  <nav class="grovio-nav-panel" id="grovioNavPanel" aria-hidden="true"><a href="/" class="grovio-nav-panel-link">Home</a><a href="/features" class="grovio-nav-panel-link">Features</a><a href="/pricing" class="grovio-nav-panel-link">Pricing</a><a href="/podcast" class="grovio-nav-panel-link">Podcast</a><a href="/guide/" class="grovio-nav-panel-link">The Guide</a><a href="/compare" class="grovio-nav-panel-link">Compare Apps</a><a href="/about" class="grovio-nav-panel-link grovio-nav-panel-link--parent">About</a><a href="/about/claire" class="grovio-nav-panel-sublink">Claire</a><a href="/faq" class="grovio-nav-panel-link">FAQ</a><a href="/support" class="grovio-nav-panel-link">Support</a><p class="grovio-nav-panel-tagline">Grow simply. Homeschool confidently.</p></nav>`;
}

function sharedFooter() {
  return `
  <footer class="grovio-footer"><a href="/" class="grovio-footer-wordmark">grovio</a><p class="grovio-footer-tagline">Grow Simply. Homeschool Confidently.</p><p class="grovio-footer-links">&copy; 2026 Skipper Investments LLC &middot; <a href="/about">About</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a> &middot; <a href="/support">Support</a> &middot; <a href="/faq">FAQ</a></p></footer>`;
}

function sharedStyles() {
  return `
    :root{color-scheme:light}*{box-sizing:border-box}body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}body.grovio-nav-locked{overflow:hidden}.grovio-nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}.grovio-nav-inner{max-width:1100px;height:60px;margin:0 auto;padding:0 2rem;display:flex;align-items:center;justify-content:space-between}.grovio-wordmark,.grovio-footer-wordmark{color:#4A6E4E;font-family:Nunito,sans-serif;font-size:26px;font-weight:800;line-height:1;text-decoration:none}.grovio-nav-right{display:flex;align-items:center;gap:.75rem}.grovio-nav-cta{border-radius:999px;background:#4A6E4E;color:#F7F4EE;font-size:.8rem;font-weight:600;padding:.56rem 1.15rem;text-decoration:none}.grovio-nav-burger{width:38px;height:38px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:0;border:1px solid rgba(74,110,78,.22);border-radius:8px;background:transparent;cursor:pointer}.grovio-nav-burger span{width:18px;height:2px;background:#4A6E4E;border-radius:2px;transition:transform .2s,opacity .2s}.grovio-nav-burger[aria-expanded="true"] span:nth-child(1){transform:translateY(6px) rotate(45deg)}.grovio-nav-burger[aria-expanded="true"] span:nth-child(2){opacity:0}.grovio-nav-burger[aria-expanded="true"] span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}.grovio-nav-overlay{position:fixed;inset:0;z-index:199;background:rgba(44,34,24,.34);opacity:0;pointer-events:none;transition:opacity .2s}.grovio-nav-overlay.is-open{opacity:1;pointer-events:auto}.grovio-nav-panel{position:fixed;top:0;right:0;z-index:200;display:flex;flex-direction:column;width:min(320px,86vw);height:100dvh;padding:84px 2rem 2.5rem;overflow-y:auto;background:#FDFBF5;box-shadow:-8px 0 32px rgba(44,34,24,.18);transform:translateX(100%);transition:transform .25s ease}.grovio-nav-panel.is-open{transform:translateX(0)}.grovio-nav-panel-link{padding:.85rem 0;color:#2C2218;border-bottom:1px solid rgba(44,34,24,.08);font-family:"Source Serif 4",Georgia,serif;font-size:22px;font-weight:600;text-decoration:none}.grovio-nav-panel-link--parent{border-bottom:0}.grovio-nav-panel-sublink{padding:.1rem 0 .85rem 1rem;color:#6B6458;border-bottom:1px solid rgba(44,34,24,.08);font-size:14px;text-decoration:none}.grovio-nav-panel-tagline{margin:1.5rem 0 0;color:#8C7A6A;font-family:"Source Serif 4",Georgia,serif;font-size:15px;font-style:italic;line-height:1.5}.guide-article{max-width:760px;margin:0 auto;padding:38px 28px 72px}.guide-breadcrumb{margin:0 0 34px;color:#8C7A6A;font-size:13px}.guide-breadcrumb a{color:#4A6E4E;text-decoration:none}.guide-article-kicker{margin:0 0 12px;color:#5E8753;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.guide-article h1{max-width:680px;margin:0;font-family:"Source Serif 4",Georgia,serif;font-size:clamp(38px,6vw,62px);font-weight:600;letter-spacing:0;line-height:1.04}.guide-deck{max-width:625px;margin:22px 0 0;color:#5C4A3A;font-family:"Source Serif 4",Georgia,serif;font-size:22px;line-height:1.45}.guide-byline{display:flex;align-items:center;gap:11px;margin:30px 0 34px;color:#5C4A3A;font-size:13px;line-height:1.45}.guide-byline img{width:42px;height:42px;border-radius:50%;object-fit:cover}.guide-byline a{color:#2C2218;font-weight:700;text-decoration:none}.guide-byline time{display:block;color:#8C7A6A}.guide-feature-image{margin:0 0 38px}.guide-feature-image img{display:block;width:100%;max-height:470px;object-fit:cover;border-radius:6px}.guide-body{color:#342B23;font-family:"Source Serif 4",Georgia,serif;font-size:19px;line-height:1.75}.guide-body>*:first-child{margin-top:0}.guide-body h2{margin:2.35em 0 .65em;color:#2C2218;font-size:31px;font-weight:600;letter-spacing:0;line-height:1.15}.guide-body h3{margin:2em 0 .5em;color:#2C2218;font-size:24px;font-weight:600;line-height:1.2}.guide-body p,.guide-body ul,.guide-body ol{margin:0 0 1.25em}.guide-body li{margin:.38em 0}.guide-body a{color:#3E6F4A;text-decoration-color:rgba(62,111,74,.45);text-underline-offset:3px}.guide-body blockquote{margin:1.8em 0;padding:1rem 1.25rem;border-left:3px solid #8CB48D;background:#F0F5EC;color:#4B4238}.guide-body img{max-width:100%;height:auto;border-radius:6px}.guide-review-note{margin:42px 0 0;padding:18px 0;border-top:1px solid #D7D1C6;border-bottom:1px solid #D7D1C6;color:#5C4A3A;font-size:14px;line-height:1.65}.guide-review-note a{color:#3E6F4A;font-weight:700;text-decoration:none}.guide-related{margin:48px 0 0;padding-top:36px;border-top:1px solid #D7D1C6}.guide-related h2{margin:0 0 18px;font-family:"Source Serif 4",Georgia,serif;font-size:29px;font-weight:600}.guide-related-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.guide-related a{min-height:130px;display:flex;flex-direction:column;justify-content:space-between;padding:17px;border:1px solid #D7D1C6;border-radius:6px;background:#FCFAF5;color:#2C2218;text-decoration:none}.guide-related a:hover{border-color:#8CB48D}.guide-related-title{font-family:"Source Serif 4",Georgia,serif;font-size:18px;font-weight:600;line-height:1.2}.guide-related-copy{margin-top:10px;color:#6B6458;font-size:12px;line-height:1.5}.guide-cta{margin-top:48px;padding:30px;border-radius:6px;background:#466A4D;color:#FDFBF5}.guide-cta p{max-width:510px;margin:0;font-family:"Source Serif 4",Georgia,serif;font-size:25px;font-weight:600;line-height:1.25}.guide-cta a{display:inline-block;margin-top:18px;border-radius:999px;background:#FDFBF5;color:#35563B;padding:10px 15px;font-size:13px;font-weight:800;text-decoration:none}.grovio-footer{padding:46px 24px;background:#2C2218;color:#F7F4EE;text-align:center}.grovio-footer-wordmark{color:#B8D4BB;font-size:25px}.grovio-footer-tagline{margin:12px 0 20px;color:#D6CFC3;font-family:"Source Serif 4",Georgia,serif;font-size:16px;font-style:italic}.grovio-footer-links{max-width:680px;margin:0 auto;color:#BCAFA0;font-size:12px;line-height:1.8}.grovio-footer-links a{color:#E9E2D8;text-decoration:none}@media(max-width:640px){.grovio-nav-inner{height:52px;padding:0 1.25rem}.grovio-wordmark{font-size:22px}.grovio-nav-cta{padding:.5rem .9rem}.guide-article{padding:31px 21px 58px}.guide-deck{font-size:20px}.guide-body{font-size:18px}.guide-body h2{font-size:28px}.guide-related-grid{grid-template-columns:1fr}.guide-related a{min-height:0}}
  `;
}

function menuScript() {
  return `
  <script>(function(){var burger=document.getElementById("grovioNavBurger"),panel=document.getElementById("grovioNavPanel"),overlay=document.getElementById("grovioNavOverlay");if(!burger||!panel||!overlay)return;function closeMenu(){burger.setAttribute("aria-expanded","false");burger.setAttribute("aria-label","Open menu");panel.setAttribute("aria-hidden","true");panel.classList.remove("is-open");overlay.classList.remove("is-open");document.body.classList.remove("grovio-nav-locked")}function openMenu(){burger.setAttribute("aria-expanded","true");burger.setAttribute("aria-label","Close menu");panel.setAttribute("aria-hidden","false");panel.classList.add("is-open");overlay.classList.add("is-open");document.body.classList.add("grovio-nav-locked")}burger.addEventListener("click",function(){burger.getAttribute("aria-expanded")==="true"?closeMenu():openMenu()});overlay.addEventListener("click",closeMenu);panel.querySelectorAll("a").forEach(function(link){link.addEventListener("click",closeMenu)});document.addEventListener("keydown",function(event){if(event.key==="Escape")closeMenu()})}());</script>`;
}

function renderArticlePage(article) {
  const canonicalUrl = `https://grovioapp.com/guide/${article.slug}`;
  const ogImage = article.featuredImage || "https://grovioapp.com/grovio_guide_og_image.jpg";
  const imageMarkup = article.featuredImage ? `<figure class="guide-feature-image"><img src="${escapeHtml(article.featuredImage)}" alt="${escapeHtml(article.title)}" width="1200" height="675" loading="eager"></figure>` : "";
  const articleSchema = { "@context": "https://schema.org", "@type": "Article", mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl }, headline: article.title, description: article.metaDescription, datePublished: article.publishedDate, dateModified: article.modifiedDate, author: { "@type": "Person", "@id": "https://grovioapp.com/about/claire#claire", name: "Claire", url: "https://grovioapp.com/about/claire" }, publisher: { "@type": "Organization", "@id": "https://grovioapp.com/#organization", name: "grovio", url: "https://grovioapp.com", logo: { "@type": "ImageObject", url: "https://grovioapp.com/assets/grovio-logo.png" } }, image: ogImage, url: canonicalUrl, isPartOf: { "@type": "CollectionPage", name: "The grovio Guide", url: "https://grovioapp.com/guide/" } };
  const breadcrumbSchema = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "grovio", item: "https://grovioapp.com/" }, { "@type": "ListItem", position: 2, name: "The grovio Guide", item: "https://grovioapp.com/guide/" }, { "@type": "ListItem", position: 3, name: article.title, item: canonicalUrl }] };
  const relatedMarkup = relatedArticles.filter((item) => item.slug !== article.slug).slice(0, 3).map((item) => `<a href="/guide/${item.slug}"><span class="guide-related-title">${escapeHtml(item.title)}</span><span class="guide-related-copy">${escapeHtml(item.description)}</span></a>`).join("");
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="${escapeHtml(article.metaDescription)}"><title>${escapeHtml(article.metaTitle)} | The grovio Guide</title><link rel="canonical" href="${canonicalUrl}"><link rel="icon" type="image/x-icon" href="/favicon.ico"><link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Nunito:wght@700;800&family=Source+Serif+4:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet"><meta property="og:type" content="article"><meta property="og:site_name" content="grovio"><meta property="og:title" content="${escapeHtml(article.metaTitle)}"><meta property="og:description" content="${escapeHtml(article.metaDescription)}"><meta property="og:url" content="${canonicalUrl}"><meta property="og:image" content="${escapeHtml(ogImage)}"><meta property="og:image:alt" content="${escapeHtml(article.title)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(article.metaTitle)}"><meta name="twitter:description" content="${escapeHtml(article.metaDescription)}"><meta name="twitter:image" content="${escapeHtml(ogImage)}"><script type="application/ld+json">${jsonForScript(articleSchema)}</script><script type="application/ld+json">${jsonForScript(breadcrumbSchema)}</script><style>${sharedStyles()}</style></head>
<body>${sharedNavigation()}<main class="guide-article"><p class="guide-breadcrumb"><a href="/guide/">The Guide</a> <span aria-hidden="true">/</span> ${escapeHtml(article.title)}</p><p class="guide-article-kicker">From the grovio Guide</p><h1>${escapeHtml(article.title)}</h1><p class="guide-deck">${escapeHtml(article.excerpt)}</p><div class="guide-byline"><img src="/assets/optimized/claire-192.jpg" alt="Claire" width="192" height="192"><div><a href="/about/claire">Written by Claire</a><time datetime="${article.modifiedDate}">Reviewed and updated ${formatDate(article.modifiedDate)} &middot; ${article.readMinutes} min read</time></div></div>${imageMarkup}<article class="guide-body" data-holo-source="true">${article.contentHtml}</article><p class="guide-review-note">This Guide article was personally reviewed and approved by <a href="/about/claire">Claire</a>. For state-specific requirements, always verify the current rules that apply to your family.</p><section class="guide-related" aria-labelledby="related-reading"><h2 id="related-reading">Keep reading</h2><div class="guide-related-grid">${relatedMarkup}</div></section><section class="guide-cta" aria-label="Download grovio"><p>You do not need to homeschool like everyone else. You need a calmer way to see your own.</p><a href="/get">Download grovio free &rarr;</a></section></main>${sharedFooter()}${menuScript()}</body></html>\n`;
}

function renderLatestSection(articles) {
  const latest = articles.slice(0, 3);
  if (latest.length === 0) return `${latestStart}\n${latestEnd}`;
  const cards = latest.map((article) => `<a class="guide-latest-card" href="/guide/${article.slug}"><span class="guide-latest-meta">Written by Claire &middot; ${formatDate(article.publishedDate)}</span><span class="guide-latest-title">${escapeHtml(article.title)}</span><span class="guide-latest-copy">${escapeHtml(article.excerpt)}</span><span class="guide-latest-link">Read the article &rarr;</span></a>`).join("");
  return `${latestStart}
    <section class="guide-latest" aria-labelledby="guide-latest-title"><div class="guide-latest-heading"><div><p class="guide-latest-kicker">From Claire</p><h2 id="guide-latest-title">Latest from the Guide</h2></div><button class="guide-library-button" type="button" data-open-guide-library>Browse every Guide question &rarr;</button></div><div class="guide-latest-grid">${cards}</div></section>
${latestEnd}`;
}

function renderLibraryArticles(articles) {
  if (articles.length === 0) return `${libraryStart}\n${libraryEnd}`;
  const cards = articles.map((article) => `<a href="/guide/${article.slug}" style="display:block;background:#FDFCF8;border-radius:12px;padding:18px 20px;margin-bottom:10px;text-decoration:none;border:1px solid rgba(92,74,58,0.08);"><div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:600;color:#3E3A32;margin-bottom:4px;">${escapeHtml(article.title)}</div><div style="font-size:13px;color:#6B6458;line-height:1.5;margin-bottom:8px;">${escapeHtml(article.excerpt)}</div><div style="font-size:11px;color:#9B9484;">Written by Claire &middot; ${formatDate(article.publishedDate)}</div></a>`).join("");
  return `${libraryStart}
    <div style="margin-bottom:48px;"><div style="display:flex;gap:8px;align-items:center;border-bottom:2px solid #F4F7F2;padding-bottom:12px;margin-bottom:16px;"><h2 style="margin:0;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#6B6458;">From Claire</h2></div>${cards}</div>
${libraryEnd}`;
}

function updateGuideIndex(root, articles) {
  const guideIndexPath = path.join(root, "guide", "index.html");
  const guideIndex = fs.readFileSync(guideIndexPath, "utf8");
  const startIndex = guideIndex.indexOf(latestStart);
  const endIndex = guideIndex.indexOf(latestEnd);
  const libraryStartIndex = guideIndex.indexOf(libraryStart);
  const libraryEndIndex = guideIndex.indexOf(libraryEnd);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex || libraryStartIndex === -1 || libraryEndIndex === -1 || libraryEndIndex < libraryStartIndex) {
    throw new Error("guide/index.html is missing the Holo article markers.");
  }
  const replacements = [
    { start: startIndex, end: endIndex + latestEnd.length, contents: renderLatestSection(articles) },
    { start: libraryStartIndex, end: libraryEndIndex + libraryEnd.length, contents: renderLibraryArticles(articles) },
  ].sort((first, second) => second.start - first.start);
  let updatedGuideIndex = guideIndex;
  for (const replacement of replacements) {
    updatedGuideIndex = `${updatedGuideIndex.slice(0, replacement.start)}${replacement.contents}${updatedGuideIndex.slice(replacement.end)}`;
  }
  return writeFileIfChanged(guideIndexPath, updatedGuideIndex);
}

function escapeForRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sitemapEntry(article) {
  return `  <url><loc>https://grovioapp.com/guide/${article.slug}</loc><lastmod>${article.modifiedDate}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>`;
}

function updateSitemap(root, articles) {
  const sitemapPath = path.join(root, "sitemap.xml");
  let sitemap = fs.readFileSync(sitemapPath, "utf8");
  for (const article of articles) {
    const articleUrl = `https://grovioapp.com/guide/${article.slug}`;
    const entryPattern = new RegExp(`\\s*<url><loc>${escapeForRegExp(articleUrl)}</loc>[\\s\\S]*?<\\/url>`);
    sitemap = entryPattern.test(sitemap) ? sitemap.replace(entryPattern, `\n${sitemapEntry(article)}`) : sitemap.replace("</urlset>", `${sitemapEntry(article)}\n</urlset>`);
  }
  if (articles.length > 0) {
    const guidePattern = /<url><loc>https:\/\/grovioapp\.com\/guide\/<\/loc><lastmod>[^<]+<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.9<\/priority><\/url>/;
    sitemap = sitemap.replace(guidePattern, `<url><loc>https://grovioapp.com/guide/</loc><lastmod>${articles[0].modifiedDate}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
  }
  return writeFileIfChanged(sitemapPath, sitemap);
}

function publishArticles(root) {
  const incomingPath = path.join(root, incomingDirectory);
  if (!fs.existsSync(incomingPath)) {
    console.log("No Holo articles are waiting to publish.");
    return;
  }
  const sourceFiles = fs.readdirSync(incomingPath).filter((fileName) => fileName.endsWith(".json")).sort();
  const articles = sourceFiles.map((fileName) => validateSource(readJson(path.join(incomingPath, fileName)), fileName));
  const seenSlugs = new Set();
  for (const article of articles) {
    if (seenSlugs.has(article.slug)) throw new Error(`More than one Holo article uses the slug ${article.slug}.`);
    seenSlugs.add(article.slug);
  }
  articles.sort((first, second) => `${second.modifiedDate}${second.slug}`.localeCompare(`${first.modifiedDate}${first.slug}`));
  let changedFiles = 0;
  for (const article of articles) {
    const outputPath = path.join(root, "guide", `${article.slug}.html`);
    if (fs.existsSync(outputPath) && !fs.readFileSync(outputPath, "utf8").includes('data-holo-source="true"')) throw new Error(`Refusing to replace the existing non-Holo Guide article ${article.slug}.`);
    if (writeFileIfChanged(outputPath, renderArticlePage(article))) changedFiles += 1;
  }
  if (updateGuideIndex(root, articles)) changedFiles += 1;
  if (updateSitemap(root, articles)) changedFiles += 1;
  console.log(`Published ${articles.length} Holo Guide article${articles.length === 1 ? "" : "s"}; ${changedFiles} file${changedFiles === 1 ? "" : "s"} changed.`);
}

try {
  publishArticles(parseArguments(process.argv.slice(2)).root);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
