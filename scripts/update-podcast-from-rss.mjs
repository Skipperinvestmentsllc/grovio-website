#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { podcastEpisodeData, guideCatalog } from "./podcast-episode-data.mjs";

const ROOT = process.cwd();
const SITE = "https://grovioapp.com";
const RSS_URL = "https://anchor.fm/s/1156e7a4c/podcast/rss";
const TRANSCRIPT_DIR = "/Users/skipperkilian/Desktop/Podcast/Transcripts";
const ARTWORK = "/assets/optimized/grow-simply-with-claire-podcast-1200.jpg";
const SHOW_TITLE = "Dear Homeschool Mom: Grow Simply with Claire";
const SHOW_DESCRIPTION = "Honest weekly letters for the homeschool mom who needs reassurance, perspective, and a calmer way to trust what she is building.";
const AUTHOR_NAME = "Claire from grovio";
const AUTHOR_URL = `${SITE}/about/claire`;
const HEYCATCH = '  <script type="module" src="/heycatch.js"></script>';
const PLATFORM_LINKS = [
  ["Spotify", "Listen on Spotify", "https://podcasters.spotify.com/pod/show/claire-from-grovio7"],
  ["Apple Podcasts", "Listen on Apple Podcasts", "https://podcasts.apple.com/us/podcast/dear-homeschool-mom-grow-simply-with-claire/id6797835426"],
  ["Amazon Music", "Listen on Amazon Music", "https://music.amazon.com/podcasts/1889d1ab-951c-4b15-b904-6177fec3040c/dear-homeschool-mom-grow-simply-with-claire"],
  ["iHeartRadio", "Listen on iHeartRadio", "https://www.iheart.com/podcast/269-dear-homeschool-mom-grow-s-340252146"],
  ["Pocket Casts", "Listen on Pocket Casts", "https://pca.st/nkyigywq"],
  ["RSS feed", "Subscribe via RSS", RSS_URL],
];

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const rssFileArg = process.argv.slice(2).find((arg) => arg.startsWith("--rss-file="));
const rssFilePath = rssFileArg ? path.resolve(ROOT, rssFileArg.split("=")[1]) : "";

const fetchText = (url, redirects = 0) => new Promise((resolve, reject) => {
  if (redirects > 5) {
    reject(new Error(`Too many redirects while fetching ${url}`));
    return;
  }
  const request = https.get(url, { timeout: 20000, headers: { "user-agent": "grovio-podcast-updater/2.0" } }, (res) => {
    if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      request.destroy();
      fetchText(new URL(res.headers.location, url).toString(), redirects + 1).then(resolve, reject);
      return;
    }
    if (res.statusCode !== 200) {
      reject(new Error(`Request failed for ${url}: ${res.statusCode}`));
      return;
    }
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => resolve(body));
  });
  request.on("timeout", () => request.destroy(new Error(`Request timed out for ${url}`)));
  request.on("error", reject);
});

const decode = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, "\"")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const stripHtml = (value = "") => decode(value)
  .replace(/<br\s*\/?>/gi, " ")
  .replace(/<\/p>/gi, " ")
  .replace(/<[^>]+>/g, "")
  .replace(/\s+/g, " ")
  .trim();

const escapeHtml = (value = "") => value
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const slugify = (value = "") => value
  .toLowerCase()
  .replace(/[’']/g, "")
  .replace(/&/g, " and ")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decode(match[1]).trim() : "";
};

const attrTag = (xml, name, attr) => {
  const match = xml.match(new RegExp(`<${name}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return match ? decode(match[1]).trim() : "";
};

const formatDate = (date) => new Intl.DateTimeFormat("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
}).format(date);

const isoDate = (date) => date.toISOString().slice(0, 10);

const parseDuration = (duration = "") => {
  const parts = duration.split(":").map((part) => Number(part));
  if (!parts.length || parts.some(Number.isNaN)) return "";
  let seconds = 0;
  for (const part of parts) seconds = (seconds * 60) + part;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}` || "";
};

const displayDuration = (duration = "") => {
  const parts = duration.split(":");
  return parts.length === 3 && parts[0] === "00" ? `${Number(parts[1])}:${parts[2]}` : duration;
};

const getTranscript = async (episode) => {
  const filename = `${episode.date}--${episode.slug}.txt`;
  const filePath = path.join(TRANSCRIPT_DIR, filename);
  try {
    const text = (await fs.readFile(filePath, "utf8")).trim();
    return { filename, filePath, text };
  } catch {
    return { filename, filePath, text: "" };
  }
};

const parseEpisodes = (rss) => {
  const items = [...rss.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]);
  return items.map((item, index) => {
    const pubDate = new Date(tag(item, "pubDate"));
    const title = stripHtml(tag(item, "title"));
    const description = stripHtml(tag(item, "description") || tag(item, "itunes:summary"));
    const slug = slugify(title);
    return {
      title,
      slug,
      date: isoDate(pubDate),
      displayDate: formatDate(pubDate),
      pubDate: pubDate.toISOString(),
      episodeNumber: Number(tag(item, "itunes:episode")) || index + 1,
      duration: tag(item, "itunes:duration"),
      audioUrl: attrTag(item, "enclosure", "url"),
      episodeUrl: tag(item, "link") || tag(item, "guid"),
      description,
    };
  }).filter((episode) => episode.title && episode.slug && episode.date);
};

const nav = `<header class="nav">
    <div class="nav-inner">
      <a href="/" class="wordmark" data-analytics="nav-wordmark">grovio</a>
      <div class="nav-links">
        <a href="/features" data-analytics="nav-features">Features</a>
        <a href="/pricing" data-analytics="nav-pricing">Pricing</a>
        <a href="/podcast" data-analytics="nav-podcast">Podcast</a>
        <a href="/guide/" data-analytics="nav-guide">Guide</a>
        <a href="/get" class="nav-cta" data-analytics="nav-download">Download free &rarr;</a>
      </div>
    </div>
  </header>`;

const footer = `<footer class="footer">
    <a href="/" class="footer-wordmark" data-analytics="footer-wordmark">grovio</a>
    <p>Grow Simply. Homeschool Confidently.</p>
    <p>&copy; 2026 Skipper Investments LLC &middot; <a href="/features">Features</a> &middot; <a href="/pricing">Pricing</a> &middot; <a href="/podcast">Podcast</a> &middot; <a href="/guide/">Guide</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
  </footer>`;

const sharedHead = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">`;

const sharedStyles = `<style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;line-height:1.7}
    .nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}
    .nav-inner,.container{max-width:980px;margin:0 auto;padding:0 2rem}
    .nav-inner{max-width:1100px;height:60px;display:flex;align-items:center;justify-content:space-between}
    .wordmark,.footer-wordmark{font-family:Nunito,sans-serif;font-weight:800;text-transform:lowercase;text-decoration:none;letter-spacing:-.02em}
    .wordmark{font-size:26px;color:#4A6E4E}
    .nav-links{display:flex;align-items:center;gap:1rem}
    .nav-links a{font-size:14px;color:#5C4A3A;text-decoration:none}
    .nav-cta,.btn{display:inline-block;background:#4A6E4E;color:#F7F4EE!important;border-radius:999px;text-decoration:none;font-weight:700}
    .nav-cta{padding:.5rem 1.15rem;font-size:13px}
    .btn{padding:.8rem 1.4rem;font-size:15px}
    .hero{padding:5rem 0 2.25rem;text-align:center}
    .label{display:block;margin-bottom:.875rem;color:#4A6E4E;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;font-weight:400;letter-spacing:-.01em}
    h1{font-size:clamp(34px,5vw,56px);line-height:1.1;max-width:760px;margin:0 auto 1rem}
    h2{font-size:clamp(28px,4vw,40px);line-height:1.16;margin:0 0 1rem}
    h3{font-size:25px;line-height:1.2;margin:0 0 .75rem}
    em{font-style:italic;color:#4A6E4E}
    .lede{max-width:700px;margin:0 auto;color:#7A6A5A;font-size:17px}
    .eyebrow{display:block;margin-bottom:.55rem;color:#C2954E;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
    .panel,.card{background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:12px;box-shadow:0 4px 28px rgba(44,34,24,.07)}
    .section-stack{display:grid;gap:1rem;margin:0 0 5rem}
    .text-link{color:#4A6E4E;font-weight:800;text-decoration:none;font-size:14px}
    .footer{background:#2C2218;text-align:center;padding:3rem 2rem}
    .footer-wordmark{color:#B8D4BB;font-size:28px}
    .footer p{margin:.5rem 0;color:rgba(247,244,238,.55);font-size:13px}
    .footer a{color:rgba(184,212,187,.75);text-decoration:none}
    @media(max-width:760px){.nav-inner,.container{padding:0 1.25rem}.nav-inner{height:auto;min-height:54px;gap:.75rem;align-items:flex-start;padding-top:.7rem;padding-bottom:.7rem}.wordmark{font-size:22px;padding-top:.2rem}.nav-links{flex-wrap:wrap;justify-content:flex-end;gap:.45rem .7rem}.nav-links a{font-size:12.5px}.nav-cta{padding:.4rem .8rem}.hero{padding:4.5rem 0 2rem}}
  </style>`;

const podcastCss = `<style>
    .panel{overflow:hidden;margin-bottom:2rem}
    .panel img{width:100%;display:block;aspect-ratio:1678/937;height:auto;object-fit:cover}
    .copy{padding:3rem}
    .copy p,.episode p{color:#6F6255;margin:0 0 1.25rem}
    .listen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin:1.5rem 0 0}
    .listen-card{display:block;border:1px solid rgba(184,212,187,.75);border-radius:10px;padding:1rem;background:#F7F4EE;color:#5C4A3A;text-decoration:none}
    .listen-card strong{display:block;color:#2C2218;font-size:15px}
    .listen-card span{color:#A89A8A;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
    .episode{padding:2rem 0 5rem}
    .episode-list{display:grid;gap:1rem}
    .episode-card{display:grid;grid-template-columns:1fr 1.4fr;gap:2rem;align-items:center;padding:2rem}
    .episode-meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:.75rem}
    .episode-links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}
    audio{width:100%;margin-top:1rem}
    @media(max-width:760px){.copy,.episode-card{padding:1.5rem}.listen-grid,.episode-card{grid-template-columns:1fr}}
  </style>`;

const transcriptCss = `<style>
    .answer-card,.audio-card,.transcript,.faq-list,.related-grid,.section-card,.author-card,.cta-card{padding:1.5rem}
    .answer-card{margin-bottom:1rem;border-left:4px solid #4A6E4E}
    .answer-copy{font-size:19px;color:#3A332A}
    .audio-card{margin-bottom:1rem}
    .audio-meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:1rem}
    .audio-links,.related-links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}
    .section-card p,.author-card p,.cta-card p,.faq-list p{color:#6F6255;margin:0}
    .section-card{display:grid;gap:.5rem}
    .related-grid{display:grid;gap:1rem}
    .related-group h2{margin-bottom:.75rem}
    .related-list{display:grid;gap:.75rem}
    .related-item{display:block;padding:1rem;border:1px solid rgba(184,212,187,.75);border-radius:10px;background:#F7F4EE;text-decoration:none;color:#2C2218}
    .related-item small{display:block;color:#A89A8A;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.35rem}
    .related-item span{display:block;color:#4A6E4E;font-weight:700}
    .faq-list{display:grid;gap:1rem}
    .faq-item h3{font-size:22px;margin-bottom:.45rem}
    .transcript{margin-bottom:5rem}
    .transcript p{font-family:"Source Serif 4",Georgia,serif;font-size:20px;line-height:1.75;color:#3A332A;margin:0 0 1.25rem}
    .transcript .mark{text-align:center;color:#C2954E;font-size:24px;margin:2rem 0}
    .cta-card{background:#EBF3EC}
    .byline{display:flex;align-items:center;gap:.6rem;font-size:14px;color:#6F6255}
    .crumbs{display:flex;justify-content:center;gap:.5rem;flex-wrap:wrap;margin-bottom:1.25rem;font-size:13px;color:#7A6A5A}
    .crumbs a{color:#4A6E4E;text-decoration:none;font-weight:700}
    @media(max-width:760px){.transcript,.answer-card,.audio-card,.faq-list,.related-grid,.section-card,.author-card,.cta-card{padding:1.25rem}.transcript p{font-size:18px}}
  </style>`;

const renderTranscriptParagraphs = (transcript) => transcript
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.trim())
  .filter(Boolean)
  .map((paragraph) => {
    const escaped = escapeHtml(paragraph).replace(/\n/g, "<br>");
    if (/^A question I(?:'|’)ve been sitting with:/i.test(paragraph)) {
      return `<p class="mark">✦</p>\n        <p><em>${escaped}</em></p>`;
    }
    if (/^Love,?$/i.test(paragraph)) return `<p><em>${escaped}</em></p>`;
    if (/^Claire$/i.test(paragraph)) return `<p><strong><em>${escaped}</em></strong></p>`;
    return `<p>${escaped}</p>`;
  })
  .join("\n        ");

const analyticsAttr = (value) => ` data-analytics="${escapeHtml(value)}"`;

const cleanHtml = (html) => `${html}`
  .replace(/[ \t]+\n/g, "\n")
  .replace(/^[ \t]+$/gm, "");

const breadcrumbListJson = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

const faqJson = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

const resolveRelatedGuides = (slugs) => slugs.map((slug) => {
  const guide = guideCatalog[slug];
  if (!guide) throw new Error(`Unknown related guide slug: ${slug}`);
  return guide;
});

const resolveRelatedEpisodes = (slugs, episodesBySlug) => slugs.map((slug) => {
  const episode = episodesBySlug.get(slug);
  if (!episode) throw new Error(`Unknown related episode slug: ${slug}`);
  return episode;
});

const renderPodcastHome = (episodes) => {
  const latest = episodes[0];
  const episodeCards = episodes.map((episode) => {
    const pageUrl = `${SITE}/podcast/${episode.slug}`;
    const summary = episode.editorial?.directAnswer || episode.description;
    const transcriptLink = episode.hasTranscript
      ? `<a class="btn"${analyticsAttr(`episode-transcript-${episode.slug}`)} href="/podcast/${episode.slug}">Read the transcript</a>`
      : "";
    const externalLink = episode.episodeUrl
      ? `<a class="text-link"${analyticsAttr(`episode-platform-${episode.slug}`)} href="${escapeHtml(episode.episodeUrl)}" target="_blank" rel="noopener">Listen on Spotify &rarr;</a>`
      : "";
    return `
      <article class="episode-card card">
        <div>
          <span class="label">${episode === latest ? "Latest letter" : `Episode ${episode.episodeNumber}`}</span>
          <h3>${escapeHtml(episode.title)}</h3>
          <div class="episode-meta">Episode ${episode.episodeNumber} &middot; ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>
          ${episode.audioUrl ? `<audio controls preload="none"${analyticsAttr(`audio-${episode.slug}`)} src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}
        </div>
        <div>
          <p>${escapeHtml(summary)}</p>
          <div class="episode-links">
            ${transcriptLink}
            ${externalLink}
            <a class="text-link"${analyticsAttr(`episode-share-${episode.slug}`)} href="${pageUrl}">Copy transcript URL &rarr;</a>
          </div>
        </div>
      </article>`;
  }).join("\n");

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "PodcastSeries",
      name: SHOW_TITLE,
      description: SHOW_DESCRIPTION,
      url: `${SITE}/podcast`,
      image: `${SITE}${ARTWORK}`,
      author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
      publisher: { "@type": "Organization", name: "grovio", url: SITE },
      webFeed: RSS_URL,
      hasPart: episodes.filter((episode) => episode.hasTranscript).map((episode) => ({
        "@type": "PodcastEpisode",
        name: episode.title,
        url: `${SITE}/podcast/${episode.slug}`,
      })),
    },
    breadcrumbListJson([
      { name: "grovio", url: SITE },
      { name: "Podcast", url: `${SITE}/podcast` },
    ]),
  ];

  return cleanHtml(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Dear Homeschool Mom: Grow Simply with Claire is a weekly homeschool podcast from grovio with honest letters for overwhelmed homeschool moms building confidence. Listen and read episode transcripts.">
  <title>Dear Homeschool Mom: Grow Simply with Claire - Podcast</title>
  ${sharedHead}
  <link rel="canonical" href="${SITE}/podcast">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="grovio">
  <meta property="og:title" content="${SHOW_TITLE}">
  <meta property="og:description" content="${SHOW_DESCRIPTION}">
  <meta property="og:url" content="${SITE}/podcast">
  <meta property="og:image" content="${SITE}${ARTWORK}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${SHOW_TITLE}">
  <meta name="twitter:description" content="${SHOW_DESCRIPTION}">
  <meta name="twitter:image" content="${SITE}${ARTWORK}">
  <script type="application/ld+json">
  ${JSON.stringify(ld[0], null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(ld[1], null, 2)}
  </script>
  ${sharedStyles}
  ${podcastCss}
  ${HEYCATCH}
</head>
<body>
  ${nav}
  <main>
    <section class="hero">
      <div class="container">
        <div class="crumbs"><a href="/">Home</a><span>/</span><span>Podcast</span></div>
        <span class="label">Podcast</span>
        <h1>Dear Homeschool Mom: <em>Grow Simply with Claire</em></h1>
        <p class="lede">Honest weekly letters for the homeschool mom who needs reassurance, perspective, and a calmer way to trust what she is building.</p>
      </div>
    </section>
    <section class="container">
      <div class="panel">
        <img src="${ARTWORK}" alt="Dear Homeschool Mom: Grow Simply with Claire podcast artwork. Honest notes for the days you need a little reassurance." width="1678" height="937" loading="lazy">
        <div class="copy">
          <span class="label">Listen now</span>
          <h2>A quiet place for confidence to grow.</h2>
          <p>Each letter talks through the questions homeschool moms carry at the end of real days: Am I doing enough? Is my child behind? What is the actual goal? The episodes are short, grounded, and written to feel like one homeschool mom speaking to another.</p>
          <div class="listen-grid" aria-label="Podcast listening options">
            ${PLATFORM_LINKS.map(([name, action, url]) => `<a class="listen-card"${analyticsAttr(`hub-platform-${slugify(name)}`)} href="${escapeHtml(url)}" target="_blank" rel="noopener"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(action)}</span></a>`).join("")}
          </div>
        </div>
      </div>
    </section>
    <section class="container episode">
      <div class="episode-list">${episodeCards}</div>
    </section>
  </main>
  ${footer}
</body>
</html>
`);
};

const renderTranscriptPage = (episode, episodesBySlug) => {
  const editorial = episode.editorial;
  const paragraphs = renderTranscriptParagraphs(episode.transcript);
  const relatedGuides = resolveRelatedGuides(editorial.relatedGuideSlugs);
  const relatedEpisodes = resolveRelatedEpisodes(editorial.relatedEpisodeSlugs, episodesBySlug);
  const description = editorial.metaDescription;
  const breadcrumb = breadcrumbListJson([
    { name: "grovio", url: SITE },
    { name: "Podcast", url: `${SITE}/podcast` },
    { name: episode.title, url: `${SITE}/podcast/${episode.slug}` },
  ]);
  const ldEpisode = {
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    headline: editorial.searchTitle,
    description,
    episodeNumber: episode.episodeNumber,
    datePublished: episode.pubDate,
    duration: parseDuration(episode.duration),
    url: `${SITE}/podcast/${episode.slug}`,
    mainEntityOfPage: `${SITE}/podcast/${episode.slug}`,
    associatedMedia: episode.audioUrl ? { "@type": "MediaObject", contentUrl: episode.audioUrl, encodingFormat: "audio/mpeg" } : undefined,
    partOfSeries: { "@type": "PodcastSeries", name: SHOW_TITLE, url: `${SITE}/podcast` },
    author: { "@type": "Person", name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: { "@type": "Organization", name: "grovio", url: SITE },
  };

  return cleanHtml(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${escapeHtml(description)}">
  <title>${escapeHtml(editorial.searchTitle)}</title>
  ${sharedHead}
  <link rel="canonical" href="${SITE}/podcast/${episode.slug}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="grovio">
  <meta property="og:title" content="${escapeHtml(editorial.searchTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE}/podcast/${episode.slug}">
  <meta property="og:image" content="${SITE}${ARTWORK}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(editorial.searchTitle)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE}${ARTWORK}">
  <script type="application/ld+json">
  ${JSON.stringify(ldEpisode, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(breadcrumb, null, 2)}
  </script>
  <script type="application/ld+json">
  ${JSON.stringify(faqJson(editorial.faqs), null, 2)}
  </script>
  ${sharedStyles}
  ${transcriptCss}
  ${HEYCATCH}
</head>
<body>
  ${nav}
  <main>
    <section class="hero">
      <div class="container">
        <div class="crumbs"><a href="/">Home</a><span>/</span><a href="/podcast">Podcast</a><span>/</span><span>${escapeHtml(episode.title)}</span></div>
        <span class="label">Episode ${episode.episodeNumber} transcript</span>
        <span class="eyebrow">${escapeHtml(episode.title)}</span>
        <h1>${escapeHtml(editorial.questionH1)}</h1>
        <p class="lede">${escapeHtml(description)}</p>
      </div>
    </section>
    <section class="container section-stack">
      <section class="answer-card card" aria-labelledby="answer-title">
        <span class="label">Direct answer</span>
        <h2 id="answer-title">A short answer grounded in the transcript</h2>
        <p class="answer-copy">${escapeHtml(editorial.directAnswer)}</p>
      </section>
      <section class="audio-card card" aria-labelledby="listen-title">
        <div class="audio-meta">${SHOW_TITLE} &middot; ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>
        <h2 id="listen-title">Listen to the original episode</h2>
        ${episode.audioUrl ? `<audio controls preload="none"${analyticsAttr(`audio-${episode.slug}`)} src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}
        <div class="audio-links">
          <a class="btn"${analyticsAttr(`platform-spotify-${episode.slug}`)} href="${escapeHtml(episode.episodeUrl || PLATFORM_LINKS[0][2])}" target="_blank" rel="noopener">Listen on Spotify</a>
          <a class="text-link"${analyticsAttr(`platform-apple-${episode.slug}`)} href="${PLATFORM_LINKS[1][2]}" target="_blank" rel="noopener">Apple Podcasts &rarr;</a>
          <a class="text-link"${analyticsAttr(`platform-amazon-${episode.slug}`)} href="${PLATFORM_LINKS[2][2]}" target="_blank" rel="noopener">Amazon Music &rarr;</a>
          <a class="text-link"${analyticsAttr(`platform-iheart-${episode.slug}`)} href="${PLATFORM_LINKS[3][2]}" target="_blank" rel="noopener">iHeartRadio &rarr;</a>
        </div>
      </section>
      ${editorial.sections.map((section, index) => `
      <section class="section-card card" aria-labelledby="section-${index + 1}">
        <span class="label">Section ${index + 1}</span>
        <h2 id="section-${index + 1}">${escapeHtml(section.heading)}</h2>
        <p>${escapeHtml(section.body)}</p>
      </section>`).join("")}
      <section class="related-grid" aria-label="Related resources">
        <div class="related-group card">
          <div class="related-links">
            <span class="label">Related grovio guides</span>
          </div>
          <div class="related-list">
            ${relatedGuides.map((guide) => `
              <a class="related-item"${analyticsAttr(`related-guide-${episode.slug}-${slugify(guide.title)}`)} href="${guide.href}">
                <small>Guide</small>
                <strong>${escapeHtml(guide.title)}</strong>
                <span>Read the guide &rarr;</span>
              </a>`).join("")}
          </div>
        </div>
        <div class="related-group card">
          <div class="related-links">
            <span class="label">Related episodes</span>
          </div>
          <div class="related-list">
            ${relatedEpisodes.map((relatedEpisode) => `
              <a class="related-item"${analyticsAttr(`related-episode-${episode.slug}-${relatedEpisode.slug}`)} href="/podcast/${relatedEpisode.slug}">
                <small>Episode ${relatedEpisode.episodeNumber}</small>
                <strong>${escapeHtml(relatedEpisode.title)}</strong>
                <span>Read the transcript &rarr;</span>
              </a>`).join("")}
          </div>
        </div>
      </section>
      <section class="faq-list card" aria-labelledby="faq-title">
        <span class="label">FAQ</span>
        <h2 id="faq-title">Questions this episode helps answer</h2>
        ${editorial.faqs.map((faq) => `<div class="faq-item"><h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p></div>`).join("")}
      </section>
      <section class="author-card card" aria-labelledby="author-title">
        <span class="label">From Claire</span>
        <h2 id="author-title">About the author of this letter</h2>
        <div class="byline">
          <span>Written by</span>
          <a class="text-link"${analyticsAttr(`author-${episode.slug}`)} href="/about/claire">${AUTHOR_NAME}</a>
        </div>
        <p>Claire writes Dear Homeschool Mom for families who need reassurance, perspective, and a calmer way to trust the work they are already doing.</p>
      </section>
      <section class="cta-card card" aria-labelledby="cta-title">
        <span class="label">Try grovio</span>
        <h2 id="cta-title">${escapeHtml(editorial.cta.title)}</h2>
        <p>${escapeHtml(editorial.cta.body)}</p>
        <div class="audio-links">
          <a class="btn"${analyticsAttr(`cta-${episode.slug}`)} href="${editorial.cta.href}">${escapeHtml(editorial.cta.label)}</a>
        </div>
      </section>
      <article class="transcript card" aria-labelledby="transcript-title">
        <span class="label">Full transcript</span>
        <h2 id="transcript-title">${escapeHtml(episode.title)}</h2>
        ${paragraphs}
      </article>
    </section>
  </main>
  ${footer}
</body>
</html>
`);
};

const validateTranscript = (episode) => {
  const problems = [];
  if (!episode.transcript) problems.push(`missing transcript: ${episode.transcriptFile}`);
  if (episode.transcript && episode.transcript.length < 600) problems.push(`incomplete transcript: ${episode.transcriptFile} is shorter than expected`);
  if (episode.transcript && episode.transcript.split(/\n{2,}/).filter(Boolean).length < 5) problems.push(`incomplete transcript: ${episode.transcriptFile} has too few paragraphs`);
  return problems;
};

const validateEditorial = (episode, episodesBySlug) => {
  const editorial = podcastEpisodeData[episode.slug];
  const missing = [];
  if (!editorial) return [`missing editorial data for slug ${episode.slug} in scripts/podcast-episode-data.mjs`];
  const requiredStrings = ["searchTitle", "metaDescription", "questionH1", "directAnswer"];
  for (const field of requiredStrings) {
    if (typeof editorial[field] !== "string" || !editorial[field].trim()) missing.push(field);
  }
  if (!Array.isArray(editorial.sections) || !editorial.sections.length) missing.push("sections");
  if (!Array.isArray(editorial.faqs) || !editorial.faqs.length) missing.push("faqs");
  if (!Array.isArray(editorial.relatedGuideSlugs) || !editorial.relatedGuideSlugs.length) missing.push("relatedGuideSlugs");
  if (!Array.isArray(editorial.relatedEpisodeSlugs) || !editorial.relatedEpisodeSlugs.length) missing.push("relatedEpisodeSlugs");
  if (!editorial.cta || typeof editorial.cta !== "object") missing.push("cta");
  if (missing.length) return [`editorial data incomplete for ${episode.slug}: ${missing.join(", ")}`];

  const detailProblems = [];
  editorial.sections.forEach((section, index) => {
    if (!section?.heading?.trim() || !section?.body?.trim()) detailProblems.push(`sections[${index}]`);
  });
  editorial.faqs.forEach((faq, index) => {
    if (!faq?.question?.trim() || !faq?.answer?.trim()) detailProblems.push(`faqs[${index}]`);
  });
  if (!editorial.cta?.title?.trim() || !editorial.cta?.body?.trim() || !editorial.cta?.href?.trim() || !editorial.cta?.label?.trim()) {
    detailProblems.push("cta.title/body/href/label");
  }
  editorial.relatedGuideSlugs.forEach((slug) => {
    if (!guideCatalog[slug]) detailProblems.push(`unknown guide slug ${slug}`);
  });
  editorial.relatedEpisodeSlugs.forEach((slug) => {
    if (!episodesBySlug.has(slug)) detailProblems.push(`unknown episode slug ${slug}`);
  });
  return detailProblems.map((problem) => `editorial data incomplete for ${episode.slug}: ${problem}`);
};

const updateSitemap = async (episodes) => {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  let sitemap = await fs.readFile(sitemapPath, "utf8");
  sitemap = sitemap.replace(/<url><loc>https:\/\/grovioapp\.com\/podcast<\/loc><lastmod>.*?<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.7<\/priority><\/url>/, `<url><loc>${SITE}/podcast</loc><lastmod>${episodes[0].date}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  sitemap = sitemap.replace(/\n  <url><loc>https:\/\/grovioapp\.com\/podcast\/[^<]+<\/loc><lastmod>[^<]+<\/lastmod><changefreq>monthly<\/changefreq><priority>0\.7<\/priority><\/url>/g, "");
  const entries = episodes
    .filter((episode) => episode.hasTranscript)
    .map((episode) => `  <url><loc>${SITE}/podcast/${episode.slug}</loc><lastmod>${episode.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`)
    .join("\n");
  sitemap = sitemap.replace(`  <url><loc>${SITE}/get</loc>`, `${entries}\n  <url><loc>${SITE}/get</loc>`);
  await fs.writeFile(sitemapPath, sitemap);
};

const updateLlms = async (episodes) => {
  const llmsPath = path.join(ROOT, "llms.txt");
  let llms = await fs.readFile(llmsPath, "utf8");
  llms = llms.replace(/\n## Podcast transcripts[\s\S]*$/m, "");
  const podcastSection = [
    "",
    "## Podcast transcripts",
    "",
    `- [Podcast hub](${SITE}/podcast): Weekly Dear Homeschool Mom episode archive with newest episode first.`,
    ...episodes
      .filter((episode) => episode.hasTranscript)
      .map((episode) => `- [${episode.title}](${SITE}/podcast/${episode.slug}): Transcript and answer page for episode ${episode.episodeNumber}.`),
  ].join("\n");
  llms = `${llms.trimEnd()}\n${podcastSection}\n`;
  await fs.writeFile(llmsPath, llms);
};

const updateLinksPage = async (latestEpisode) => {
  const linksPath = path.join(ROOT, "links", "index.html");
  let html = await fs.readFile(linksPath, "utf8");
  html = html.replace(
    /<a class="story-card podcast" href="https:\/\/grovioapp\.com\/podcast\/[^"]+"><div class="story-content"><span class="story-label">Podcast<\/span><h2 class="story-title">Grow Simply with Claire<\/h2><p class="story-text">[\s\S]*?<\/p><span class="story-arrow" aria-hidden="true">→<\/span><\/div><img class="podcast-cover" src="\/assets\/optimized\/grow-simply-with-claire-podcast-1200\.jpg" alt="Grow Simply with Claire podcast artwork"><\/a>/,
    `<a class="story-card podcast" href="https://grovioapp.com/podcast/${latestEpisode.slug}"><div class="story-content"><span class="story-label">Podcast</span><h2 class="story-title">Grow Simply with Claire</h2><p class="story-text">Listen to the latest letter, ${escapeHtml(latestEpisode.title)}.</p><span class="story-arrow" aria-hidden="true">→</span></div><img class="podcast-cover" src="/assets/optimized/grow-simply-with-claire-podcast-1200.jpg" alt="Grow Simply with Claire podcast artwork"></a>`,
  );
  await fs.writeFile(linksPath, html);
};

const latestPublishedSlug = async () => {
  const podcastDir = path.join(ROOT, "podcast");
  try {
    const files = await fs.readdir(podcastDir);
    return new Set(files.filter((name) => name.endsWith(".html")).map((name) => name.replace(/\.html$/, "")));
  } catch {
    return new Set();
  }
};

const getRssText = async () => {
  if (rssFilePath) return fs.readFile(rssFilePath, "utf8");
  return fetchText(RSS_URL);
};

const main = async () => {
  const rss = await getRssText();
  const episodes = [];
  for (const episode of parseEpisodes(rss)) {
    const transcript = await getTranscript(episode);
    episodes.push({
      ...episode,
      transcript: transcript.text,
      transcriptFile: transcript.filename,
      transcriptPath: transcript.filePath,
      hasTranscript: Boolean(transcript.text),
    });
  }
  if (!episodes.length) throw new Error("No episodes found in RSS feed.");

  const episodesBySlug = new Map(episodes.map((episode) => [episode.slug, episode]));
  const newest = episodes[0];
  const latestPublished = await latestPublishedSlug();
  const newestProblems = [
    ...validateTranscript(newest),
    ...validateEditorial(newest, episodesBySlug),
  ];
  if (newestProblems.length) {
    throw new Error(`Newest episode ${newest.title} is not publishable:\n- ${newestProblems.join("\n- ")}`);
  }

  for (const episode of episodes.filter((item) => item.hasTranscript)) {
    const editorialProblems = validateEditorial(episode, episodesBySlug);
    if (editorialProblems.length) {
      throw new Error(`Existing transcript episode ${episode.title} is missing editorial requirements:\n- ${editorialProblems.join("\n- ")}`);
    }
    episode.editorial = podcastEpisodeData[episode.slug];
  }

  const writes = [
    { path: path.join(ROOT, "podcast.html"), content: renderPodcastHome(episodes) },
    ...episodes
      .filter((episode) => episode.hasTranscript)
      .map((episode) => ({
        path: path.join(ROOT, "podcast", `${episode.slug}.html`),
        content: renderTranscriptPage(episode, episodesBySlug),
      })),
  ];

  if (!dryRun) {
    await fs.mkdir(path.join(ROOT, "podcast"), { recursive: true });
    for (const file of writes) await fs.writeFile(file.path, file.content);
    await updateSitemap(episodes);
    await updateLlms(episodes);
    await updateLinksPage(newest);
  }

  console.log(`${dryRun ? "Validated" : "Updated"} podcast content for ${episodes.length} RSS episode(s).`);
  console.log(`Newest RSS item: ${newest.title}`);
  console.log(`Publication date: ${newest.date}`);
  console.log(`Duration: ${newest.duration}`);
  console.log(`Audio URL: ${newest.audioUrl}`);
  console.log(`Spotify URL: ${newest.episodeUrl}`);
  console.log(`Transcript file: ${newest.transcriptPath}`);
  console.log(`Was already published in repo: ${latestPublished.has(newest.slug) ? "yes" : "no"}`);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
