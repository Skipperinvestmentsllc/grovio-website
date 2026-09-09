import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const legacyFiles = [
  'features.html',
  'pricing.html',
  'podcast.html',
  'start.html',
  'guide/homeschool-records-by-state.html',
  'podcast/am-i-doing-enough.html',
  'podcast/behind-compared-to-what.html',
  'podcast/i-thought-i-was-doing-it-for-the-wrong-reason.html',
  'podcast/the-day-i-pulled-him-out.html',
  'podcast/the-homeschool-mom-in-my-head.html',
  'podcast/what-is-the-actual-goal.html',
];

const primaryLinks = `<nav class="grovio-nav-links" aria-label="Primary navigation">
      <a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/podcast">Podcast</a><a href="/guide/">Guide</a><a href="/compare">Compare apps</a>
    </nav>`;

const menuPanel = `<nav class="grovio-nav-panel" id="grovioNavPanel" aria-hidden="true" aria-label="Site menu">
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

const sharedHeader = `<header class="grovio-nav">
  <div class="grovio-nav-inner">
    <a href="/" class="grovio-wordmark">grovio</a>
    ${primaryLinks}
    <div class="grovio-nav-right">
      <a href="/get" class="grovio-nav-cta">Download free</a>
      <button class="grovio-nav-burger" id="grovioNavBurger" aria-label="Open site menu" aria-expanded="false" aria-controls="grovioNavPanel">
        <span></span><span></span><span></span>
      </button>
    </div>
  </div>
</header>
<div class="grovio-nav-overlay" id="grovioNavOverlay"></div>
${menuPanel}`;

function addSharedAssets(html) {
  if (!html.includes('/assets/grovio-navigation.css')) {
    html = html.replace('</head>', '  <link rel="stylesheet" href="/assets/grovio-navigation.css">\n  <script defer src="/assets/grovio-navigation.js"></script>\n</head>');
  }
  return html;
}

let legacyUpdated = 0;
for (const relativePath of legacyFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  if (html.includes('id="grovioNavPanel"')) {
    html = addSharedAssets(html);
    await writeFile(file, html);
    legacyUpdated += 1;
    continue;
  }
  const headerPattern = relativePath === 'start.html'
    ? /<header class="shell">[\s\S]*?<\/header>/
    : /<header class="nav">[\s\S]*?<\/header>/;
  if (!headerPattern.test(html)) throw new Error(`Could not find the legacy header in ${relativePath}`);
  html = html.replace(headerPattern, sharedHeader);
  html = addSharedAssets(html);
  await writeFile(file, html);
  legacyUpdated += 1;
}

const modernFiles = [
  'about.html', 'about/claire.html', 'compare.html', 'delete-account.html', 'faq.html', 'guide/index.html',
  'index.html', 'privacy.html', 'support.html', 'terms.html',
  'guide/can-i-homeschool-if-im-not-a-teacher.html', 'guide/do-i-need-a-curriculum.html',
  'guide/do-i-need-to-give-grades.html', 'guide/do-i-need-to-track-attendance.html',
  'guide/end-of-year-reporting.html', 'guide/how-do-homeschool-portfolios-work.html',
  'guide/how-do-i-create-a-daily-rhythm.html', 'guide/how-do-i-handle-frustration.html',
  'guide/how-do-i-know-if-my-child-is-on-track.html', 'guide/how-do-i-motivate-without-pressure.html',
  'guide/how-do-i-start-homeschooling.html', 'guide/how-do-i-stay-consistent-without-burnout.html',
  'guide/how-do-i-teach-multiple-ages.html', 'guide/how-many-hours-should-we-homeschool.html',
  'guide/is-it-normal-for-homeschooling-to-feel-hard.html', 'guide/legal-requirements-for-homeschooling.html',
  'guide/what-counts-as-learning.html', 'guide/what-if-homeschooling-causes-tension.html',
  'guide/what-if-my-child-is-ahead-or-behind.html', 'guide/what-if-my-child-refuses-schoolwork.html',
  'guide/what-if-we-dont-finish-everything.html', 'guide/what-records-should-i-keep.html',
  'guide/what-should-a-typical-day-look-like.html', 'guide/what-subjects-do-i-need-to-teach.html',
];

let modernUpdated = 0;
for (const relativePath of modernFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  const fullNavigationPattern = /<header class="grovio-nav">[\s\S]*?<\/header>\s*<div class="grovio-nav-overlay" id="grovioNavOverlay"><\/div>\s*<nav class="grovio-nav-panel" id="grovioNavPanel"[^>]*>[\s\S]*?<\/nav>/;
  if (!fullNavigationPattern.test(html)) throw new Error(`Could not find the current navigation in ${relativePath}`);
  html = html.replace(fullNavigationPattern, sharedHeader);
  html = html.replace(/@media \(min-width: 761px\) \{ \.grovio-nav-burger \{ display: none; \} \}\n?/, '');
  html = html.replace(/\n        @media \(max-width: 760px\)/g, '\n    @media (max-width: 760px)');
  await writeFile(file, html);
  modernUpdated += 1;
}

console.log(`Updated ${legacyUpdated} legacy headers and ${modernUpdated} current headers.`);
