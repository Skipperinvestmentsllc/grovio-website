#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";
import { episodeEditorial } from "./podcast-episode-data.mjs";

const ROOT = process.cwd();
const SITE = "https://grovioapp.com";
const RSS_URL = "https://anchor.fm/s/1156e7a4c/podcast/rss";
const TRANSCRIPT_DIR = "/Users/skipperkilian/Desktop/Podcast/Transcripts";
const ARTWORK = "/assets/optimized/grow-simply-with-claire-podcast-1200.jpg";
const SHOW_TITLE = "Dear Homeschool Mom: Grow Simply with Claire";
const SHOW_URL = `${SITE}/podcast`;
const AUTHOR = { "@id": `${SITE}/about/claire#claire`, "@type": "Person", name: "Claire", url: `${SITE}/about/claire` };
const PUBLISHER = { "@type": "Organization", name: "grovio", url: SITE };
const PLATFORM_LINKS = [
  ["Spotify", "Listen now", "https://podcasters.spotify.com/pod/show/claire-from-grovio7"],
  ["Apple Podcasts", "Listen now", "https://podcasts.apple.com/us/podcast/dear-homeschool-mom-grow-simply-with-claire/id6797835426"],
  ["Amazon Music", "Listen now", "https://music.amazon.com/podcasts/1889d1ab-951c-4b15-b904-6177fec3040c/dear-homeschool-mom-grow-simply-with-claire"],
  ["iHeartRadio", "Listen now", "https://www.iheart.com/podcast/269-dear-homeschool-mom-grow-s-340252146"],
  ["Pocket Casts", "Listen now", "https://pca.st/nkyigywq"],
  ["RSS feed", "Subscribe", RSS_URL],
];

const fetchText = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) return fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
    if (res.statusCode !== 200) return reject(new Error(`Request failed for ${url}: ${res.statusCode}`));
    let body = "";
    res.setEncoding("utf8");
    res.on("data", (chunk) => { body += chunk; });
    res.on("end", () => resolve(body));
  }).on("error", reject);
});

const decode = (value = "") => value
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
  .replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const stripHtml = (value = "") => decode(value).replace(/<br\s*\/?>/gi, " ").replace(/<\/p>/gi, " ").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const escapeHtml = (value = "") => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const slugify = (value = "") => value.toLowerCase().replace(/[’']/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const tag = (xml, name) => {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decode(match[1]).trim() : "";
};
const attrTag = (xml, name, attr) => {
  const match = xml.match(new RegExp(`<${name}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, "i"));
  return match ? decode(match[1]).trim() : "";
};
const formatDate = (date) => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
const isoDate = (date) => date.toISOString().slice(0, 10);
const parseDuration = (duration = "") => {
  const parts = duration.split(":").map(Number);
  if (parts.some(Number.isNaN)) return "";
  const seconds = parts.reduce((total, part) => (total * 60) + part, 0);
  const h = Math.floor(seconds / 3600), m = Math.floor((seconds % 3600) / 60), s = seconds % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
};
const displayDuration = (duration = "") => {
  const parts = duration.split(":");
  return parts.length === 3 && parts[0] === "00" ? `${Number(parts[1])}:${parts[2]}` : duration;
};

const getTranscript = async (episode) => {
  const filename = `${episode.date}--${episode.slug}.txt`;
  try { return { filename, text: (await fs.readFile(path.join(TRANSCRIPT_DIR, filename), "utf8")).trim() }; }
  catch { return { filename, text: "" }; }
};

const parseEpisodes = (rss) => [...rss.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]).map((item, index) => {
  const pubDate = new Date(tag(item, "pubDate"));
  const title = stripHtml(tag(item, "title"));
  return {
    title, slug: slugify(title), date: isoDate(pubDate), displayDate: formatDate(pubDate), pubDate: pubDate.toISOString(),
    episodeNumber: Number(tag(item, "itunes:episode")) || index + 1,
    duration: tag(item, "itunes:duration"), audioUrl: attrTag(item, "enclosure", "url"), episodeUrl: tag(item, "link") || tag(item, "guid"),
    description: stripHtml(tag(item, "description") || tag(item, "itunes:summary")),
  };
}).filter((episode) => episode.title && episode.slug && episode.date);

const fallbackEditorial = (episode) => ({
  seoTitle: `${episode.title} | Dear Homeschool Mom`,
  metaDescription: episode.description || "A Dear Homeschool Mom letter from Claire about finding a calmer, more confident homeschool rhythm.",
  searchHeading: episode.title, searchQuestion: episode.title, topic: "Homeschool Confidence",
  answerIntro: episode.description || "Read this Dear Homeschool Mom letter from Claire, then listen or continue to the original transcript below.",
  transcriptSections: [], faqs: [], related: [], relatedEpisodes: [],
  cta: { href: "/features", label: "Explore grovio", copy: "Explore a calmer way to keep your homeschool days in view with grovio." },
});
const attachEditorial = (episode) => {
  const editorial = episodeEditorial[episode.slug];
  if (!editorial) console.warn(`! Missing editorial profile for ${episode.slug}; add it to scripts/podcast-episode-data.mjs before publishing.`);
  return { ...episode, editorial: editorial || fallbackEditorial(episode), hasEditorialProfile: Boolean(editorial) };
};

const nav = `<header class="nav"><div class="nav-inner"><a href="/" class="wordmark">grovio</a><div class="nav-links"><a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/podcast">Podcast</a><a href="/guide/">Guide</a><a href="/get" class="nav-cta">Download free &rarr;</a></div></div></header>`;
const footer = `<footer class="footer"><a href="/" class="footer-wordmark">grovio</a><p>Grow Simply. Homeschool Confidently.</p><p>&copy; 2026 Skipper Investments LLC &middot; <a href="/features">Features</a> &middot; <a href="/pricing">Pricing</a> &middot; <a href="/podcast">Podcast</a> &middot; <a href="/guide/">Guide</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p></footer>`;
const analyticsHead = `<script async src="https://www.googletagmanager.com/gtag/js?id=G-ZM2WLE995S"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-ZM2WLE995S');</script>`;
const analyticsScript = `<script>(()=>{const track=(name,params)=>{if(typeof window.gtag==='function')window.gtag('event',name,params)};document.addEventListener('click',(event)=>{const target=event.target.closest('[data-analytics-event]');if(!target)return;track(target.dataset.analyticsEvent,{episode_slug:target.dataset.episodeSlug||undefined,label:target.dataset.analyticsLabel||target.textContent.trim(),destination:target.getAttribute('href')||undefined})});document.querySelectorAll('audio[data-episode-slug]').forEach((audio)=>{let tracked=false;audio.addEventListener('play',()=>{if(tracked)return;tracked=true;track('podcast_audio_play',{episode_slug:audio.dataset.episodeSlug})})})})();</script>`;
const sharedHead = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&family=Inter:wght@400;500;600;1,400&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"><script type="module" src="/heycatch.js"></script>`;

const podcastCss = `<style>
*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;line-height:1.7}.nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}.nav-inner,.container{max-width:980px;margin:0 auto;padding:0 2rem}.nav-inner{max-width:1100px;height:60px;display:flex;align-items:center;justify-content:space-between}.wordmark,.footer-wordmark{font-family:Nunito,sans-serif;font-weight:800;text-transform:lowercase;text-decoration:none;letter-spacing:0}.wordmark{font-size:26px;color:#4A6E4E}.nav-links{display:flex;align-items:center;gap:1rem}.nav-links a{font-size:14px;color:#5C4A3A;text-decoration:none}.nav-cta,.btn{display:inline-block;background:#4A6E4E;color:#F7F4EE!important;border-radius:999px;text-decoration:none;font-weight:700}.nav-cta{padding:.5rem 1.15rem;font-size:13px}.btn{padding:.8rem 1.4rem;font-size:15px}.hero{padding:5rem 0 2.5rem;text-align:center}.label{display:block;margin-bottom:.875rem;color:#4A6E4E;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;font-weight:400;letter-spacing:0}h1{font-size:clamp(36px,5.2vw,58px);line-height:1.1;max-width:760px;margin:0 auto 1.25rem}h2{font-size:clamp(28px,4vw,42px);line-height:1.16;margin:0 0 1rem}h3{font-size:28px;line-height:1.2;margin:0 0 .75rem}em{font-style:italic;color:#4A6E4E}.lede{max-width:660px;margin:0 auto;color:#7A6A5A;font-size:17px}.panel{background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:8px;box-shadow:0 4px 28px rgba(44,34,24,.07);overflow:hidden;margin-bottom:2rem}.panel img{width:100%;display:block;aspect-ratio:1678/937;height:auto;object-fit:cover}.copy{padding:3rem}.copy p,.episode p{color:#6F6255;margin:0 0 1.25rem}.listen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin:1.5rem 0 0}.listen-card{display:block;border:1px solid rgba(184,212,187,.75);border-radius:8px;padding:1rem;background:#F7F4EE;color:#5C4A3A;text-decoration:none}.listen-card strong{display:block;color:#2C2218;font-size:15px}.listen-card span{color:#A89A8A;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}.archive-intro{padding-bottom:1rem}.episode{padding:2rem 0 5rem}.episode-list{display:grid;gap:1rem}.episode-card{display:grid;grid-template-columns:1fr 1.4fr;gap:2rem;align-items:center;background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:8px;padding:2rem;box-shadow:0 4px 28px rgba(44,34,24,.07)}.topic{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:800;color:#4A6E4E;margin-bottom:.4rem}.search-question{font-family:"Source Serif 4",Georgia,serif;font-style:italic;color:#5C4A3A;margin-bottom:1rem!important}.episode-meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:.75rem}.episode-links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}.text-link{color:#4A6E4E;font-weight:800;text-decoration:none;font-size:14px}audio{width:100%;margin-top:1rem}.footer{background:#2C2218;text-align:center;padding:3rem 2rem}.footer-wordmark{color:#B8D4BB;font-size:28px}.footer p{margin:.5rem 0;color:rgba(247,244,238,.55);font-size:13px}.footer a{color:rgba(184,212,187,.75);text-decoration:none}@media(max-width:760px){.nav-inner,.container{padding:0 1.25rem}.nav-inner{height:auto;min-height:54px;gap:.75rem;align-items:flex-start;padding-top:.7rem;padding-bottom:.7rem}.wordmark{font-size:22px;padding-top:.2rem}.nav-links{flex-wrap:wrap;justify-content:flex-end;gap:.45rem .7rem}.nav-links a{font-size:12.5px}.nav-cta{padding:.4rem .8rem}.hero{padding:4.5rem 0 2.5rem}.copy,.episode-card{padding:1.5rem}.listen-grid,.episode-card{grid-template-columns:1fr}}
</style>`;

const transcriptCss = `<style>
*,*::before,*::after{box-sizing:border-box}body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;line-height:1.75}.nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}.nav-inner,.container{max-width:860px;margin:0 auto;padding:0 2rem}.nav-inner{max-width:1100px;height:60px;display:flex;align-items:center;justify-content:space-between}.wordmark,.footer-wordmark{font-family:Nunito,sans-serif;font-weight:800;text-transform:lowercase;text-decoration:none;letter-spacing:0}.wordmark{font-size:26px;color:#4A6E4E}.nav-links{display:flex;align-items:center;gap:1rem}.nav-links a{font-size:14px;color:#5C4A3A;text-decoration:none}.nav-cta,.btn{display:inline-block;background:#4A6E4E;color:#F7F4EE!important;border-radius:999px;text-decoration:none;font-weight:700}.nav-cta{padding:.5rem 1.15rem;font-size:13px}.btn{padding:.8rem 1.4rem;font-size:15px}.breadcrumbs{padding-top:1.5rem;font-size:13px;color:#7A6A5A}.breadcrumbs a{color:#4A6E4E;text-decoration:none}.breadcrumbs span{margin:0 .45rem;color:#A89A8A}.hero{padding:3.75rem 0 2rem;text-align:center}.label{display:block;margin-bottom:.875rem;color:#4A6E4E;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;font-weight:400;letter-spacing:0}h1{font-size:clamp(36px,5.2vw,58px);line-height:1.1;max-width:760px;margin:0 auto .75rem}h2{font-size:32px;line-height:1.2;margin:0 0 1rem}h3{font-size:25px;line-height:1.25;margin:2.5rem 0 1rem}em{font-style:italic;color:#4A6E4E}.original-title{font-family:"Source Serif 4",Georgia,serif;font-size:18px;color:#7A6A5A;margin:0}.meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:1rem}.audio-card{border-block:1px solid rgba(184,212,187,.75);padding:1.5rem 0;margin:0 0 2rem}audio{width:100%}.links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}.text-link{color:#4A6E4E;font-weight:800;text-decoration:none;font-size:14px}.answer{padding:1rem 0 2rem;border-bottom:1px solid rgba(184,212,187,.75)}.answer p,.questions dd,.related-item p,.cta p{color:#5C4A3A;margin:0;max-width:760px}.author-line{font-size:14px;margin-top:1rem!important;color:#7A6A5A!important}.author-line a{color:#4A6E4E;font-weight:800;text-decoration:none}.transcript{padding:2.5rem 0}.transcript p{font-family:"Source Serif 4",Georgia,serif;font-size:20px;line-height:1.75;color:#3A332A;margin:0 0 1.25rem}.transcript .mark{text-align:center;color:#C2954E;font-size:24px;margin:2rem 0}.transcript h3{color:#4A6E4E}.questions,.related,.more-letters{padding:2.75rem 0;border-top:1px solid rgba(184,212,187,.75)}.questions dl{margin:0}.questions dt{font-family:"Source Serif 4",Georgia,serif;font-size:22px;line-height:1.3;margin:1.5rem 0 .5rem;color:#2C2218}.questions dd{margin:0}.related-list{display:grid;gap:1rem}.related-item{display:block;padding:1.1rem 0;text-decoration:none;border-bottom:1px solid rgba(44,34,24,.09)}.related-item strong{display:block;color:#4A6E4E;font-size:16px}.related-item p{font-size:14px;margin-top:.2rem}.cta{margin:0 0 5rem;padding:1.75rem 0;border-top:3px solid #4A6E4E}.cta h2{font-size:27px}.cta p{margin-bottom:1.1rem}.footer{background:#2C2218;text-align:center;padding:3rem 2rem}.footer-wordmark{color:#B8D4BB;font-size:28px}.footer p{margin:.5rem 0;color:rgba(247,244,238,.55);font-size:13px}.footer a{color:rgba(184,212,187,.75);text-decoration:none}@media(max-width:760px){.nav-inner,.container{padding:0 1.25rem}.nav-inner{height:auto;min-height:54px;gap:.75rem;align-items:flex-start;padding-top:.7rem;padding-bottom:.7rem}.wordmark{font-size:22px;padding-top:.2rem}.nav-links{flex-wrap:wrap;justify-content:flex-end;gap:.45rem .7rem}.nav-links a{font-size:12.5px}.nav-cta{padding:.4rem .8rem}.hero{padding:3rem 0 1.5rem}.transcript{padding:2rem 0}.transcript p{font-size:18px}.questions,.related,.more-letters{padding:2rem 0}}
</style>`;

const renderBreadcrumbs = (episode) => `<nav class="breadcrumbs container" aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/podcast">Dear Homeschool Mom</a><span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(episode.title)}</span></nav>`;
const renderTranscriptParagraph = (paragraph) => {
  const escaped = escapeHtml(paragraph).replace(/\n/g, "<br>");
  if (/^A question I(?:'|’)ve been sitting with:/i.test(paragraph)) return `<p class="mark">*</p><p><em>${escaped}</em></p>`;
  if (/^Love,?$/i.test(paragraph)) return `<p><em>${escaped}</em></p>`;
  if (/^Claire$/i.test(paragraph)) return `<p><strong><em>${escaped}</em></strong></p>`;
  return `<p>${escaped}</p>`;
};
const renderTranscript = (episode) => {
  const headings = new Map((episode.editorial.transcriptSections || []).map(({ start, heading }) => [start, heading]));
  return episode.transcript.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean).map((paragraph, index) => `${headings.has(index) ? `<h3>${escapeHtml(headings.get(index))}</h3>` : ""}${renderTranscriptParagraph(paragraph)}`).join("\n        ");
};
const renderFaqs = (episode) => !episode.editorial.faqs?.length ? "" : `<section class="questions" aria-labelledby="questions-heading"><h2 id="questions-heading">Questions this letter helps hold</h2><dl>${episode.editorial.faqs.map((faq) => `<dt>${escapeHtml(faq.question)}</dt><dd>${escapeHtml(faq.answer)}</dd>`).join("")}</dl></section>`;
const renderRelatedContent = (episode) => !episode.editorial.related?.length ? "" : `<section class="related" aria-labelledby="related-heading"><h2 id="related-heading">Keep exploring</h2><div class="related-list">${episode.editorial.related.map((item) => `<a class="related-item" href="${escapeHtml(item.href)}" data-analytics-event="podcast_related_content_click" data-analytics-label="${escapeHtml(item.title)}" data-episode-slug="${episode.slug}"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p></a>`).join("")}</div></section>`;
const renderRelatedEpisodes = (episode, episodesBySlug) => {
  const related = (episode.editorial.relatedEpisodes || []).map((slug) => episodesBySlug.get(slug)).filter((item) => item?.hasTranscript);
  return !related.length ? "" : `<section class="more-letters" aria-labelledby="more-letters-heading"><h2 id="more-letters-heading">More Dear Homeschool Mom letters</h2><div class="related-list">${related.map((item) => `<a class="related-item" href="/podcast/${item.slug}" data-analytics-event="podcast_related_episode_click" data-analytics-label="${escapeHtml(item.title)}" data-episode-slug="${episode.slug}"><strong>${escapeHtml(item.editorial.searchHeading)}</strong><p>Dear Homeschool Mom, Episode ${item.episodeNumber}: ${escapeHtml(item.title)}</p></a>`).join("")}</div></section>`;
};

const renderPodcastHome = (episodes) => {
  const latest = episodes[0];
  const episodeCards = episodes.map((episode) => `<article class="episode-card"><div><div class="topic">${escapeHtml(episode.editorial.topic)}</div><span class="label">${episode === latest ? "Latest letter" : `Episode ${episode.episodeNumber}`}</span><h2>${escapeHtml(episode.title)}</h2><div class="episode-meta">Episode ${episode.episodeNumber} &middot; ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>${episode.audioUrl ? `<audio controls preload="none" data-episode-slug="${episode.slug}" src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}</div><div><p class="search-question">${escapeHtml(episode.editorial.searchQuestion)}</p><p>${escapeHtml(episode.description)}</p><div class="episode-links">${episode.hasTranscript ? `<a class="btn" href="/podcast/${episode.slug}" data-analytics-event="podcast_episode_click" data-analytics-label="Read transcript" data-episode-slug="${episode.slug}">Read the transcript</a>` : ""}${episode.episodeUrl ? `<a class="text-link" href="${escapeHtml(episode.episodeUrl)}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="Spotify" data-episode-slug="${episode.slug}">Open episode &rarr;</a>` : ""}</div></div></article>`).join("\n");
  const structuredData = [
    { "@context": "https://schema.org", "@type": "PodcastSeries", "@id": `${SHOW_URL}#series`, name: SHOW_TITLE, description: "Honest conversations for homeschool moms on the days they need reassurance, perspective, and a calmer way to keep going.", url: SHOW_URL, image: `${SITE}${ARTWORK}`, author: AUTHOR, publisher: PUBLISHER, webFeed: RSS_URL, hasPart: episodes.filter((episode) => episode.hasTranscript).map((episode) => ({ "@type": "PodcastEpisode", name: episode.title, url: `${SHOW_URL}/${episode.slug}`, datePublished: episode.pubDate, episodeNumber: episode.episodeNumber })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }, { "@type": "ListItem", position: 2, name: "Dear Homeschool Mom", item: SHOW_URL }] },
  ];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><link rel="icon" type="image/x-icon" href="/favicon.ico"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="Dear Homeschool Mom is a weekly homeschool podcast with grounded answers for overwhelmed parents. Listen to Claire's letters and read every transcript."><title>Dear Homeschool Mom: Homeschool Podcast | grovio</title>${analyticsHead}${sharedHead}<link rel="canonical" href="${SHOW_URL}"><meta property="og:type" content="website"><meta property="og:site_name" content="grovio"><meta property="og:title" content="Dear Homeschool Mom: Homeschool Podcast"><meta property="og:description" content="Honest weekly letters for the days homeschool moms need reassurance and perspective."><meta property="og:url" content="${SHOW_URL}"><meta property="og:image" content="${SITE}${ARTWORK}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="Dear Homeschool Mom: Homeschool Podcast"><meta name="twitter:description" content="Honest weekly letters for the days homeschool moms need reassurance and perspective."><meta name="twitter:image" content="${SITE}${ARTWORK}"><script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>${podcastCss}</head><body>${nav}<main><section class="hero"><div class="container archive-intro"><span class="label">Podcast archive</span><h1>Dear Homeschool Mom: <em>Grow Simply with Claire</em></h1><p class="lede">Short, honest letters for the questions homeschool parents carry: enough, comparison, pace, hard decisions, and the confidence to trust what they are building.</p></div></section><section class="container"><div class="panel"><img src="${ARTWORK}" alt="Dear Homeschool Mom: Grow Simply with Claire podcast artwork. Honest notes for the days you need a little reassurance." width="1678" height="937" loading="lazy"><div class="copy"><span class="label">Listen now</span><h2>A quiet place for confidence to grow.</h2><p>Each letter talks through a real homeschool question, then keeps the original transcript available to read and revisit. Start with the question closest to yours.</p><div class="listen-grid" aria-label="Podcast listening options">${PLATFORM_LINKS.map(([name, action, url]) => `<a class="listen-card" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(action)}</span></a>`).join("")}</div></div></div></section><section class="container episode"><div class="episode-list">${episodeCards}</div></section></main>${footer}${analyticsScript}</body></html>`;
};

const renderTranscriptPage = (episode, episodesBySlug) => {
  const canonicalUrl = `${SHOW_URL}/${episode.slug}`;
  const description = episode.editorial.metaDescription;
  const structuredData = [
    { "@context": "https://schema.org", "@type": "PodcastEpisode", "@id": `${canonicalUrl}#episode`, name: episode.title, alternateName: episode.editorial.searchHeading, description, url: canonicalUrl, mainEntityOfPage: canonicalUrl, datePublished: episode.pubDate, episodeNumber: episode.episodeNumber, duration: parseDuration(episode.duration) || undefined, image: `${SITE}${ARTWORK}`, inLanguage: "en-US", associatedMedia: episode.audioUrl ? { "@type": "AudioObject", contentUrl: episode.audioUrl, encodingFormat: "audio/mpeg", duration: parseDuration(episode.duration) || undefined, uploadDate: episode.pubDate } : undefined, partOfSeries: { "@id": `${SHOW_URL}#series`, "@type": "PodcastSeries", name: SHOW_TITLE, url: SHOW_URL }, author: AUTHOR, publisher: PUBLISHER },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE }, { "@type": "ListItem", position: 2, name: "Dear Homeschool Mom", item: SHOW_URL }, { "@type": "ListItem", position: 3, name: episode.title, item: canonicalUrl }] },
  ];
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><link rel="icon" type="image/x-icon" href="/favicon.ico"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description" content="${escapeHtml(description)}"><title>${escapeHtml(episode.editorial.seoTitle)}</title>${analyticsHead}${sharedHead}<link rel="canonical" href="${canonicalUrl}"><meta property="og:type" content="article"><meta property="og:site_name" content="grovio"><meta property="og:title" content="${escapeHtml(episode.editorial.searchHeading)} | Dear Homeschool Mom"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${canonicalUrl}"><meta property="og:image" content="${SITE}${ARTWORK}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(episode.editorial.searchHeading)} | Dear Homeschool Mom"><meta name="twitter:description" content="${escapeHtml(description)}"><meta name="twitter:image" content="${SITE}${ARTWORK}"><script type="application/ld+json">${JSON.stringify(structuredData, null, 2)}</script>${transcriptCss}</head><body>${nav}${renderBreadcrumbs(episode)}<main><section class="hero"><div class="container"><span class="label">Dear Homeschool Mom &middot; Episode ${episode.episodeNumber} &middot; ${escapeHtml(episode.editorial.topic)}</span><h1>${escapeHtml(episode.editorial.searchHeading)}</h1><p class="original-title">A letter titled <em>${escapeHtml(episode.title)}</em></p></div></section><section class="container"><div class="audio-card"><div class="meta">Published ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>${episode.audioUrl ? `<audio controls preload="none" data-episode-slug="${episode.slug}" src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}<div class="links"><a class="btn" href="${escapeHtml(episode.episodeUrl || PLATFORM_LINKS[0][2])}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="Spotify" data-episode-slug="${episode.slug}">Listen on Spotify</a><a class="text-link" href="${PLATFORM_LINKS[1][2]}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="Apple Podcasts" data-episode-slug="${episode.slug}">Apple Podcasts &rarr;</a><a class="text-link" href="${PLATFORM_LINKS[2][2]}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="Amazon Music" data-episode-slug="${episode.slug}">Amazon Music &rarr;</a><a class="text-link" href="${PLATFORM_LINKS[3][2]}" target="_blank" rel="noopener" data-analytics-event="podcast_platform_click" data-analytics-label="iHeartRadio" data-episode-slug="${episode.slug}">iHeartRadio &rarr;</a></div></div><section class="answer" aria-labelledby="answer-heading"><h2 id="answer-heading">A short answer</h2><p>${escapeHtml(episode.editorial.answerIntro)}</p><p class="author-line">Written and narrated by <a href="/about/claire" data-analytics-event="podcast_author_click" data-analytics-label="Claire" data-episode-slug="${episode.slug}">Claire</a>, the voice behind the grovio Guide.</p></section><article class="transcript" aria-labelledby="transcript-heading"><h2 id="transcript-heading">The original letter</h2>${renderTranscript(episode)}</article>${renderFaqs(episode)}${renderRelatedContent(episode)}${renderRelatedEpisodes(episode, episodesBySlug)}<aside class="cta"><h2>${escapeHtml(episode.editorial.cta.label)}</h2><p>${escapeHtml(episode.editorial.cta.copy)}</p><a class="btn" href="${escapeHtml(episode.editorial.cta.href)}" data-analytics-event="podcast_cta_click" data-analytics-label="${escapeHtml(episode.editorial.cta.label)}" data-episode-slug="${episode.slug}">${escapeHtml(episode.editorial.cta.label)}</a></aside></section></main>${footer}${analyticsScript}</body></html>`;
};

const updateSitemap = async (episodes) => {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  let sitemap = await fs.readFile(sitemapPath, "utf8");
  sitemap = sitemap.replace(/<url><loc>https:\/\/grovioapp\.com\/podcast<\/loc><lastmod>.*?<\/lastmod><changefreq>weekly<\/changefreq><priority>0\.7<\/priority><\/url>/, `<url><loc>${SHOW_URL}</loc><lastmod>${episodes[0].date}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  sitemap = sitemap.replace(/\n  <url><loc>https:\/\/grovioapp\.com\/podcast\/[^<]+<\/loc><lastmod>[^<]+<\/lastmod><changefreq>monthly<\/changefreq><priority>0\.7<\/priority><\/url>/g, "");
  const entries = episodes.filter((episode) => episode.hasTranscript).map((episode) => `  <url><loc>${SHOW_URL}/${episode.slug}</loc><lastmod>${episode.date}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`).join("\n");
  sitemap = sitemap.replace(`  <url><loc>${SITE}/get</loc>`, `${entries}\n  <url><loc>${SITE}/get</loc>`);
  await fs.writeFile(sitemapPath, sitemap);
};

const updateLlms = async (episodes) => {
  const llmsPath = path.join(ROOT, "llms.txt");
  let llms = await fs.readFile(llmsPath, "utf8");
  const block = `## Dear Homeschool Mom\n\n- [Podcast archive](${SHOW_URL}): Dear Homeschool Mom is a series of short, grounded letters from Claire about homeschool confidence, comparison, learning, and family decisions.\n${episodes.filter((episode) => episode.hasTranscript).map((episode) => `- [${episode.editorial.searchHeading}](${SHOW_URL}/${episode.slug}): Dear Homeschool Mom, Episode ${episode.episodeNumber}. Topic: ${episode.editorial.topic}. Original letter: ${episode.title}.`).join("\n")}`;
  if (/\n## Dear Homeschool Mom\n/.test(llms)) {
    llms = llms.replace(/\n## Dear Homeschool Mom\n[\s\S]*?(?=\n## |\s*$)/, `\n${block}\n`);
  } else {
    llms = `${llms.trimEnd()}\n\n${block}\n`;
  }
  await fs.writeFile(llmsPath, llms);
};

const main = async () => {
  const rss = await fetchText(RSS_URL);
  const episodes = [];
  for (const parsedEpisode of parseEpisodes(rss)) {
    const transcript = await getTranscript(parsedEpisode);
    episodes.push(attachEditorial({ ...parsedEpisode, transcript: transcript.text, transcriptFile: transcript.filename, hasTranscript: Boolean(transcript.text) }));
  }
  if (!episodes.length) throw new Error("No episodes found in RSS feed.");
  const missingEditorial = episodes.filter((episode) => episode.hasTranscript && !episode.hasEditorialProfile);
  if (missingEditorial.length) console.warn(`! ${missingEditorial.length} published episode(s) need an editorial profile before their next production refresh.`);
  await fs.mkdir(path.join(ROOT, "podcast"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "podcast.html"), renderPodcastHome(episodes));
  const episodesBySlug = new Map(episodes.map((episode) => [episode.slug, episode]));
  for (const episode of episodes.filter((item) => item.hasTranscript)) await fs.writeFile(path.join(ROOT, "podcast", `${episode.slug}.html`), renderTranscriptPage(episode, episodesBySlug));
  await updateSitemap(episodes);
  await updateLlms(episodes);
  console.log(`Updated podcast hub from ${episodes.length} RSS episode(s).`);
  for (const episode of episodes) {
    const state = episode.hasTranscript ? (episode.hasEditorialProfile ? "✓" : "!") : "!";
    const notes = [!episode.hasTranscript ? `missing transcript: ${episode.transcriptFile}` : "", episode.hasTranscript && !episode.hasEditorialProfile ? "missing editorial profile" : ""].filter(Boolean).join("; ");
    console.log(`${state} ${episode.date} ${episode.title}${notes ? ` - ${notes}` : ""}`);
  }
};

main().catch((error) => { console.error(error.message); process.exit(1); });
