import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lastModified = '2026-09-04';
const navPanel = `<nav class="grovio-nav-panel" id="grovioNavPanel" aria-hidden="true">
  <a href="/" class="grovio-nav-panel-link">Home</a>
  <a href="/features" class="grovio-nav-panel-link">Features</a>
  <a href="/pricing" class="grovio-nav-panel-link">Pricing</a>
  <a href="/podcast" class="grovio-nav-panel-link">Podcast</a>
  <a href="/guide/" class="grovio-nav-panel-link">The Guide</a>
  <a href="/compare" class="grovio-nav-panel-link">Compare Apps</a>
  <a href="/about" class="grovio-nav-panel-link grovio-nav-panel-link--parent">About</a>
  <a href="/about/claire" class="grovio-nav-panel-sublink">Claire</a>
  <a href="/faq" class="grovio-nav-panel-link">FAQ</a>
  <a href="/support" class="grovio-nav-panel-link">Support</a>
  <p class="grovio-nav-panel-tagline">Grow simply. Homeschool confidently.</p>
</nav>`;

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.')) return htmlFiles(path);
    return entry.isFile() && entry.name.endsWith('.html') ? [path] : [];
  }));
  return nested.flat();
}

const files = await htmlFiles(root);
let navCount = 0;
let articleCtaCount = 0;
let funnelCtaCount = 0;
const sitemapPaths = new Set(['/guide/', '/faq', '/privacy', '/terms', '/features', '/pricing', '/compare']);

for (const file of files) {
  let html = await readFile(file, 'utf8');
  const before = html;

  if (html.includes('id="grovioNavPanel"')) {
    const navPattern = /<nav class="grovio-nav-panel" id="grovioNavPanel" aria-hidden="true">[\s\S]*?<\/nav>/;
    if (!navPattern.test(html)) throw new Error(`Could not find navigation markup in ${file}`);
    const next = html.replace(
      navPattern,
      navPanel,
    );
    html = next;
    navCount += 1;

    if (!html.includes('overflow-y: auto;')) {
      const styled = html.replace(
        /(\.grovio-nav-panel\s*\{[\s\S]*?height:\s*100dvh;)/,
        '$1\n      overflow-y: auto;\n      overscroll-behavior: contain;',
      );
      if (styled === html) throw new Error(`Could not make navigation scrollable in ${file}`);
      html = styled;
    }
  }

  if (file.includes('/guide/') && !file.endsWith('/guide/index.html') && !file.endsWith('/guide/homeschool-records-by-state.html')) {
    const next = html
      .replace('Read more in the grovio app', 'Put the proof in one calm place')
      .replace(
        'The Guide lives inside grovio alongside your attendance records, portfolio moments, daily rhythm, and simple homeschool records.',
        'grovio helps you keep attendance, portfolio moments, your family\'s rhythm, and simple homeschool records together — so you can see the school you\'re already building.',
      );
    if (next !== html) articleCtaCount += 1;
    html = next;
    sitemapPaths.add(`/guide/${file.split('/').pop().replace(/\.html$/, '')}`);
  }

  if (file.includes('/p/')) {
    const next = html.replace(
      'The rest of this guide lives in the grovio app — along with 24 others on the honest parts of homeschooling. All free, on the dashboard after a quick setup.',
      'The full grovio Guide is free to read on the web. grovio gives you a calmer place to keep attendance, portfolio moments, and your family\'s daily rhythm.',
    ).replace('All 25 Guide articles, free', 'Free web Guide articles');
    if (next !== html) funnelCtaCount += 1;
    html = next;
  }

  if (file.endsWith('/pricing.html')) {
    html = html.replace('<li>The full grovio Guide</li>', '<li>Free web Guide, no account needed</li>');
  }

  if (file.endsWith('/features.html')) {
    html = html
      .replace('reports, Guide, offline use, and multi-child support.', 'reports, a free web Guide, offline use, and multi-child support.')
      .replace('exports, and built-in Guide support.', 'exports, and a free web Guide.')
      .replace('Guidance built in', 'Guidance when you need it')
      .replace('The Guide is there when the next step feels blurry.', 'The Guide is here when the next step feels blurry.')
      .replace("Claire's short, practical articles answer the questions homeschool parents ask when they need clarity, reassurance, or a calmer way to think.", "Claire's short, practical articles live in the free grovio Guide, so you can find clarity, reassurance, or a calmer way to think when you need it.")
      .replace('grovio Guide screen with article categories', 'grovio Guide with article categories');
  }

  if (file.endsWith('/compare.html')) {
    html = html
      .replaceAll('and all 25 Guide articles', 'and the free grovio Guide on the web')
      .replaceAll('and every Guide article', 'and the free grovio Guide on the web')
      .replace("grovio doesn't have a community feature. If connecting with other homeschool families inside the app matters to you, Panda offers that.", 'Community Hub, an optional private space for homeschool groups, is coming soon to grovio. Until it launches, families who need an in-app community today may prefer Panda.');
  }

  if (html !== before) await writeFile(file, html);
}

const sitemapFile = resolve(root, 'sitemap.xml');
let sitemap = await readFile(sitemapFile, 'utf8');
let sitemapUpdates = 0;
for (const path of sitemapPaths) {
  const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`(<loc>https://grovioapp\\.com${escapedPath}<\\/loc><lastmod>)[^<]+(<\\/lastmod>)`);
  if (pattern.test(sitemap)) {
    sitemap = sitemap.replace(pattern, `$1${lastModified}$2`);
    sitemapUpdates += 1;
  }
}
await writeFile(sitemapFile, sitemap);

console.log(`Updated ${navCount} navigation panels, ${articleCtaCount} article CTAs, ${funnelCtaCount} funnel CTAs, and ${sitemapUpdates} sitemap dates.`);
