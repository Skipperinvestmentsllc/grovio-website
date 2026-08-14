#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import https from "node:https";

const ROOT = process.cwd();
const SITE = "https://grovioapp.com";
const RSS_URL = "https://anchor.fm/s/1156e7a4c/podcast/rss";
const TRANSCRIPT_DIR = "/Users/skipperkilian/Desktop/Podcast/Transcripts";
const ARTWORK = "/assets/optimized/grow-simply-with-claire-podcast-1200.jpg";
const SHOW_TITLE = "Dear Homeschool Mom: Grow Simply with Claire";
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
    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      fetchText(new URL(res.headers.location, url).toString()).then(resolve, reject);
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
  }).on("error", reject);
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
  if (parts.some(Number.isNaN)) return "";
  let seconds = 0;
  for (const part of parts) seconds = (seconds * 60) + part;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s ? `${s}S` : ""}`;
};

const displayDuration = (duration = "") => {
  const parts = duration.split(":");
  return parts.length === 3 && parts[0] === "00" ? `${Number(parts[1])}:${parts[2]}` : duration;
};

const getTranscript = async (episode) => {
  const filename = `${episode.date}--${episode.slug}.txt`;
  const filePath = path.join(TRANSCRIPT_DIR, filename);
  try {
    const text = await fs.readFile(filePath, "utf8");
    return { filename, text: text.trim() };
  } catch {
    return { filename, text: "" };
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
      <a href="/" class="wordmark">grovio</a>
      <div class="nav-links">
        <a href="/features">Features</a>
        <a href="/pricing">Pricing</a>
        <a href="/podcast">Podcast</a>
        <a href="/guide/">Guide</a>
        <a href="/get" class="nav-cta">Download free &rarr;</a>
      </div>
    </div>
  </header>`;

const footer = `<footer class="footer">
    <a href="/" class="footer-wordmark">grovio</a>
    <p>Grow Simply. Homeschool Confidently.</p>
    <p>&copy; 2026 Skipper Investments LLC &middot; <a href="/features">Features</a> &middot; <a href="/pricing">Pricing</a> &middot; <a href="/podcast">Podcast</a> &middot; <a href="/guide/">Guide</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/terms">Terms</a></p>
  </footer>`;

const sharedHead = `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;800&family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">`;

const podcastCss = `<style>
    *,*::before,*::after{box-sizing:border-box}
    body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;line-height:1.7}
    .nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}
    .nav-inner,.container{max-width:980px;margin:0 auto;padding:0 2rem}
    .nav-inner{max-width:1100px;height:60px;display:flex;align-items:center;justify-content:space-between}
    .wordmark,.footer-wordmark{font-family:Nunito,sans-serif;font-weight:800;text-transform:lowercase;text-decoration:none;letter-spacing:-.02em}
    .wordmark{font-size:26px;color:#4A6E4E}.nav-links{display:flex;align-items:center;gap:1rem}
    .nav-links a{font-size:14px;color:#5C4A3A;text-decoration:none}.nav-cta,.btn{display:inline-block;background:#4A6E4E;color:#F7F4EE!important;border-radius:999px;text-decoration:none;font-weight:700}
    .nav-cta{padding:.5rem 1.15rem;font-size:13px}.btn{padding:.8rem 1.4rem;font-size:15px}
    .hero{padding:5rem 0 2.5rem;text-align:center}.label{display:block;margin-bottom:.875rem;color:#4A6E4E;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}
    h1,h2,h3{font-family:"Source Serif 4",Georgia,serif;font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(36px,5.2vw,58px);line-height:1.1;max-width:760px;margin:0 auto 1.25rem}
    h2{font-size:clamp(28px,4vw,42px);line-height:1.16;margin:0 0 1rem}h3{font-size:28px;line-height:1.2;margin:0 0 .75rem}em{font-style:italic;color:#4A6E4E}
    .lede{max-width:660px;margin:0 auto;color:#7A6A5A;font-size:17px}.panel{background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:12px;box-shadow:0 4px 28px rgba(44,34,24,.07);overflow:hidden;margin-bottom:2rem}
    .panel img{width:100%;display:block;aspect-ratio:1678/937;height:auto;object-fit:cover}.copy{padding:3rem}.copy p,.episode p{color:#6F6255;margin:0 0 1.25rem}
    .listen-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.875rem;margin:1.5rem 0 0}.listen-card{display:block;border:1px solid rgba(184,212,187,.75);border-radius:10px;padding:1rem;background:#F7F4EE;color:#5C4A3A;text-decoration:none}
    .listen-card strong{display:block;color:#2C2218;font-size:15px}.listen-card span{color:#A89A8A;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:800}
    .episode{padding:2rem 0 5rem}.episode-list{display:grid;gap:1rem}.episode-card{display:grid;grid-template-columns:1fr 1.4fr;gap:2rem;align-items:center;background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:12px;padding:2rem;box-shadow:0 4px 28px rgba(44,34,24,.07)}
    .episode-meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:.75rem}.episode-links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1.25rem}
    .text-link{color:#4A6E4E;font-weight:800;text-decoration:none;font-size:14px}audio{width:100%;margin-top:1rem}.footer{background:#2C2218;text-align:center;padding:3rem 2rem}
    .footer-wordmark{color:#B8D4BB;font-size:28px}.footer p{margin:.5rem 0;color:rgba(247,244,238,.55);font-size:13px}.footer a{color:rgba(184,212,187,.75);text-decoration:none}
    @media(max-width:760px){.nav-inner,.container{padding:0 1.25rem}.nav-inner{height:auto;min-height:54px;gap:.75rem;align-items:flex-start;padding-top:.7rem;padding-bottom:.7rem}.wordmark{font-size:22px;padding-top:.2rem}.nav-links{flex-wrap:wrap;justify-content:flex-end;gap:.45rem .7rem}.nav-links a{font-size:12.5px}.nav-cta{padding:.4rem .8rem}.hero{padding:4.5rem 0 2.5rem}.copy,.episode-card{padding:1.5rem}.listen-grid,.episode-card{grid-template-columns:1fr}}
  </style>`;

const transcriptCss = `<style>
    *,*::before,*::after{box-sizing:border-box}body{margin:0;background:#F7F4EE;color:#2C2218;font-family:Inter,system-ui,sans-serif;line-height:1.75}
    .nav{position:sticky;top:0;z-index:100;background:rgba(247,244,238,.94);backdrop-filter:blur(14px);border-bottom:1px solid rgba(184,212,187,.6)}.nav-inner,.container{max-width:860px;margin:0 auto;padding:0 2rem}
    .nav-inner{max-width:1100px;height:60px;display:flex;align-items:center;justify-content:space-between}.wordmark,.footer-wordmark{font-family:Nunito,sans-serif;font-weight:800;text-transform:lowercase;text-decoration:none;letter-spacing:-.02em}.wordmark{font-size:26px;color:#4A6E4E}
    .nav-links{display:flex;align-items:center;gap:1rem}.nav-links a{font-size:14px;color:#5C4A3A;text-decoration:none}.nav-cta,.btn{display:inline-block;background:#4A6E4E;color:#F7F4EE!important;border-radius:999px;text-decoration:none;font-weight:700}.nav-cta{padding:.5rem 1.15rem;font-size:13px}.btn{padding:.8rem 1.4rem;font-size:15px}
    .hero{padding:5rem 0 2rem;text-align:center}.label{display:block;margin-bottom:.875rem;color:#4A6E4E;font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1,h2{font-family:"Source Serif 4",Georgia,serif;font-weight:400;letter-spacing:-.01em}h1{font-size:clamp(36px,5.2vw,58px);line-height:1.1;max-width:760px;margin:0 auto 1.25rem}h2{font-size:32px;line-height:1.2;margin:3rem 0 1rem}em{font-style:italic;color:#4A6E4E}.lede{max-width:660px;margin:0 auto;color:#7A6A5A;font-size:17px}
    .meta{font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800;color:#C2954E;margin-bottom:1rem}.audio-card{background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:12px;padding:1.25rem;margin:0 0 2rem;box-shadow:0 4px 28px rgba(44,34,24,.07)}audio{width:100%}.links{display:flex;gap:.75rem;flex-wrap:wrap;margin-top:1rem}.text-link{color:#4A6E4E;font-weight:800;text-decoration:none;font-size:14px}
    .transcript{background:#FCFAF8;border:1px solid rgba(184,212,187,.75);border-radius:12px;padding:2.5rem;margin:0 0 5rem;box-shadow:0 4px 28px rgba(44,34,24,.07)}.transcript p{font-family:"Source Serif 4",Georgia,serif;font-size:20px;line-height:1.75;color:#3A332A;margin:0 0 1.25rem}.transcript .mark{text-align:center;color:#C2954E;font-size:24px;margin:2rem 0}.footer{background:#2C2218;text-align:center;padding:3rem 2rem}.footer-wordmark{color:#B8D4BB;font-size:28px}.footer p{margin:.5rem 0;color:rgba(247,244,238,.55);font-size:13px}.footer a{color:rgba(184,212,187,.75);text-decoration:none}
    @media(max-width:760px){.nav-inner,.container{padding:0 1.25rem}.nav-inner{height:auto;min-height:54px;gap:.75rem;align-items:flex-start;padding-top:.7rem;padding-bottom:.7rem}.wordmark{font-size:22px;padding-top:.2rem}.nav-links{flex-wrap:wrap;justify-content:flex-end;gap:.45rem .7rem}.nav-links a{font-size:12.5px}.nav-cta{padding:.4rem .8rem}.hero{padding:4.5rem 0 2rem}.transcript{padding:1.5rem}.transcript p{font-size:18px}}
  </style>`;

const episodeSummary = (episode) => episode.description || `A letter from Claire for homeschool moms learning to trust what they are building.`;

const renderPodcastHome = (episodes) => {
  const latest = episodes[0];
  const episodeCards = episodes.map((episode) => `
      <article class="episode-card">
        <div>
          <span class="label">${episode === latest ? "Latest letter" : `Episode ${episode.episodeNumber}`}</span>
          <h3>${escapeHtml(episode.title)}</h3>
          <div class="episode-meta">Episode ${episode.episodeNumber} &middot; ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>
          ${episode.audioUrl ? `<audio controls preload="none" src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}
        </div>
        <div>
          <p>${escapeHtml(episodeSummary(episode))}</p>
          <div class="episode-links">
            ${episode.hasTranscript ? `<a class="btn" href="/podcast/${episode.slug}">Read the transcript</a>` : ""}
            ${episode.episodeUrl ? `<a class="text-link" href="${escapeHtml(episode.episodeUrl)}" target="_blank" rel="noopener">Open episode &rarr;</a>` : ""}
          </div>
        </div>
      </article>`).join("\n");

  return `<!DOCTYPE html>
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
  <meta property="og:description" content="Honest weekly letters for the days homeschool moms need reassurance and perspective.">
  <meta property="og:url" content="${SITE}/podcast">
  <meta property="og:image" content="${SITE}${ARTWORK}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${SHOW_TITLE}">
  <meta name="twitter:description" content="Honest weekly letters for the days homeschool moms need reassurance and perspective.">
  <meta name="twitter:image" content="${SITE}${ARTWORK}">
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: SHOW_TITLE,
    description: "Honest conversations for homeschool moms on the days they need reassurance, perspective, and a calmer way to keep going.",
    url: `${SITE}/podcast`,
    image: `${SITE}${ARTWORK}`,
    author: { "@type": "Person", name: "Claire from grovio", url: `${SITE}/about/claire` },
    publisher: { "@type": "Organization", name: "grovio", url: SITE },
    webFeed: RSS_URL,
  }, null, 2)}
  </script>
  ${podcastCss}
</head>
<body>
  ${nav}
  <main>
    <section class="hero"><div class="container"><span class="label">Podcast</span><h1>Dear Homeschool Mom: <em>Grow Simply with Claire</em></h1><p class="lede">Honest weekly letters for the homeschool mom who needs reassurance, perspective, and a calmer way to trust what she is building.</p></div></section>
    <section class="container"><div class="panel"><img src="${ARTWORK}" alt="Dear Homeschool Mom: Grow Simply with Claire podcast artwork. Honest notes for the days you need a little reassurance." width="1678" height="937" loading="lazy"><div class="copy"><span class="label">Listen now</span><h2>A quiet place for confidence to grow.</h2><p>Each letter talks through the questions homeschool moms carry at the end of real days: Am I doing enough? Is my child behind? What is the actual goal? The episodes are short, grounded, and written to feel like one homeschool mom speaking to another.</p><div class="listen-grid" aria-label="Podcast listening options">${PLATFORM_LINKS.map(([name, action, url]) => `<a class="listen-card" href="${escapeHtml(url)}" target="_blank" rel="noopener"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(action)}</span></a>`).join("")}</div></div></div></section>
    <section class="container episode"><div class="episode-list">${episodeCards}</div></section>
  </main>
  ${footer}
</body>
</html>
`;
};

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

const renderTranscriptPage = (episode) => {
  const paragraphs = renderTranscriptParagraphs(episode.transcript);
  const description = episodeSummary(episode);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Read the transcript for ${escapeHtml(episode.title)}, episode ${episode.episodeNumber} of ${SHOW_TITLE}, a homeschool podcast from grovio.">
  <title>${escapeHtml(episode.title)} - Transcript | Grow Simply with Claire</title>
  ${sharedHead}
  <link rel="canonical" href="${SITE}/podcast/${episode.slug}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="grovio">
  <meta property="og:title" content="${escapeHtml(episode.title)} - Grow Simply with Claire">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${SITE}/podcast/${episode.slug}">
  <meta property="og:image" content="${SITE}${ARTWORK}">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: episode.title,
    episodeNumber: episode.episodeNumber,
    datePublished: episode.pubDate,
    duration: parseDuration(episode.duration),
    description,
    url: `${SITE}/podcast/${episode.slug}`,
    associatedMedia: episode.audioUrl ? { "@type": "MediaObject", contentUrl: episode.audioUrl, encodingFormat: "audio/mpeg" } : undefined,
    partOfSeries: { "@type": "PodcastSeries", name: SHOW_TITLE, url: `${SITE}/podcast` },
    author: { "@type": "Person", name: "Claire from grovio", url: `${SITE}/about/claire` },
    publisher: { "@type": "Organization", name: "grovio", url: SITE },
  }, null, 2)}
  </script>
  ${transcriptCss}
</head>
<body>
  ${nav}
  <main>
    <section class="hero"><div class="container"><span class="label">Episode ${episode.episodeNumber} transcript</span><h1><em>${escapeHtml(episode.title)}</em></h1><p class="lede">${escapeHtml(description)}</p></div></section>
    <section class="container"><div class="audio-card"><div class="meta">${SHOW_TITLE} &middot; ${episode.displayDate}${episode.duration ? ` &middot; ${escapeHtml(displayDuration(episode.duration))}` : ""}</div>${episode.audioUrl ? `<audio controls preload="none" src="${escapeHtml(episode.audioUrl)}"></audio>` : ""}<div class="links"><a class="btn" href="${escapeHtml(episode.episodeUrl || PLATFORM_LINKS[0][2])}" target="_blank" rel="noopener">Listen on Spotify</a><a class="text-link" href="${PLATFORM_LINKS[1][2]}" target="_blank" rel="noopener">Listen on Apple Podcasts &rarr;</a><a class="text-link" href="${PLATFORM_LINKS[2][2]}" target="_blank" rel="noopener">Listen on Amazon Music &rarr;</a><a class="text-link" href="${PLATFORM_LINKS[3][2]}" target="_blank" rel="noopener">Listen on iHeartRadio &rarr;</a><a class="text-link" href="/podcast">Podcast home &rarr;</a></div></div><article class="transcript"><h2>Transcript</h2>
        ${paragraphs}
      </article></section>
  </main>
  ${footer}
</body>
</html>
`;
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

const main = async () => {
  const rss = await fetchText(RSS_URL);
  const episodes = [];
  for (const episode of parseEpisodes(rss)) {
    const transcript = await getTranscript(episode);
    episodes.push({ ...episode, transcript: transcript.text, transcriptFile: transcript.filename, hasTranscript: Boolean(transcript.text) });
  }
  if (!episodes.length) throw new Error("No episodes found in RSS feed.");

  await fs.mkdir(path.join(ROOT, "podcast"), { recursive: true });
  await fs.writeFile(path.join(ROOT, "podcast.html"), renderPodcastHome(episodes));

  for (const episode of episodes.filter((item) => item.hasTranscript)) {
    await fs.writeFile(path.join(ROOT, "podcast", `${episode.slug}.html`), renderTranscriptPage(episode));
  }
  await updateSitemap(episodes);

  console.log(`Updated podcast hub from ${episodes.length} RSS episode(s).`);
  for (const episode of episodes) {
    console.log(`${episode.hasTranscript ? "✓" : "!"} ${episode.date} ${episode.title}${episode.hasTranscript ? "" : ` - missing transcript: ${episode.transcriptFile}`}`);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
