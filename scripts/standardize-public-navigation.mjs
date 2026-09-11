import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const navigationStylesheet = '/assets/grovio-navigation.css?v=20260911';
const navigationScript = '/assets/grovio-navigation.js?v=20260911-2';
const consentStylesheet = '/assets/grovio-consent.css?v=20260911-2';
const consentScript = '/assets/grovio-consent.js?v=20260911-2';
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

const dropdown = (label, menuId, links) => `<div class="grovio-nav-dropdown">
  <button class="grovio-nav-dropdown-trigger" type="button" aria-label="Open ${label} menu" aria-expanded="false" aria-haspopup="true" aria-controls="${menuId}" data-grovio-dropdown="${menuId}"><span>${label}</span><span class="grovio-nav-dropdown-chevron" aria-hidden="true">&#8964;</span></button>
  <div class="grovio-nav-dropdown-panel" id="${menuId}" hidden>
    ${links.map(({ href: linkHref, label: linkLabel }) => `<a href="${linkHref}">${linkLabel}</a>`).join('')}
  </div>
</div>`;

const primaryLinks = `<nav class="grovio-nav-links" aria-label="Primary navigation">
  ${dropdown('Features', 'grovioFeaturesMenu', [
    { href: '/features', label: 'Explore grovio features' },
    { href: '/community', label: 'Community' },
  ])}
  <a href="/pricing">Pricing</a>
  <a href="/podcast">Podcast</a>
  ${dropdown('The Guide', 'grovioGuideMenu', [
    { href: '/guide/', label: 'Browse The Guide' },
    { href: '/guide/homeschool-records-by-state', label: 'Homeschool Records by State' },
    { href: '/compare', label: 'Compare Homeschool Apps' },
  ])}
  ${dropdown('About', 'grovioAboutMenu', [
    { href: '/about', label: 'About grovio' },
    { href: '/about/claire', label: 'Meet Claire' },
  ])}
  ${dropdown('Help', 'grovioHelpMenu', [
    { href: '/faq', label: 'FAQ' },
    { href: '/support', label: 'Support' },
  ])}
</nav>`;

const menuPanel = `<nav class="grovio-nav-panel" id="grovioNavPanel" aria-hidden="true" aria-label="Site menu">
  <div class="grovio-nav-panel-group">
    <p class="grovio-nav-panel-heading">The app</p>
    <a href="/" class="grovio-nav-panel-link">Home</a>
    <a href="/features" class="grovio-nav-panel-link">Features</a>
    <a href="/community" class="grovio-nav-panel-link">Community</a>
    <a href="/pricing" class="grovio-nav-panel-link">Pricing</a>
    <a href="/get" class="grovio-nav-panel-link">Download free</a>
  </div>
  <div class="grovio-nav-panel-group">
    <p class="grovio-nav-panel-heading">Learn</p>
    <a href="/guide/" class="grovio-nav-panel-link">The Guide</a>
    <a href="/guide/homeschool-records-by-state" class="grovio-nav-panel-link">Homeschool Records by State</a>
    <a href="/compare" class="grovio-nav-panel-link">Compare Homeschool Apps</a>
    <a href="/podcast" class="grovio-nav-panel-link">Podcast</a>
  </div>
  <div class="grovio-nav-panel-group">
    <p class="grovio-nav-panel-heading">About &amp; help</p>
    <a href="/about" class="grovio-nav-panel-link">About grovio</a>
    <a href="/about/claire" class="grovio-nav-panel-link">Meet Claire</a>
    <a href="/faq" class="grovio-nav-panel-link">FAQ</a>
    <a href="/support" class="grovio-nav-panel-link">Support</a>
  </div>
  <p class="grovio-nav-panel-tagline">Grow simply. Homeschool confidently.</p>
</nav>`;

const sharedHeader = `<header class="grovio-nav">
  <div class="grovio-nav-inner">
    <a href="/" class="grovio-wordmark">grovio</a>
    ${primaryLinks}
    <div class="grovio-nav-right">
      <a href="/get" class="grovio-nav-cta">Download free</a>
      <button class="grovio-nav-burger" id="grovioNavBurger" aria-label="Open site menu" aria-expanded="false" aria-controls="grovioNavPanel">
        <span class="grovio-nav-menu-label">Menu</span>
        <span class="grovio-nav-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>
<div class="grovio-nav-overlay" id="grovioNavOverlay"></div>
${menuPanel}`;

const fullNavigationPattern = /<header class="grovio-nav(?: [^"]*)?">[\s\S]*?<\/header>\s*<div class="grovio-nav-overlay" id="grovioNavOverlay"><\/div>\s*<nav class="grovio-nav-panel" id="grovioNavPanel"[^>]*>[\s\S]*?<\/nav>/;
const fullNavigationPatternGlobal = /<header class="grovio-nav(?: [^"]*)?">[\s\S]*?<\/header>\s*<div class="grovio-nav-overlay" id="grovioNavOverlay"><\/div>\s*<nav class="grovio-nav-panel" id="grovioNavPanel"[^>]*>[\s\S]*?<\/nav>/g;
const copiedNavigationScriptPattern = /<script>\s*\(function\(\) \{\s*var burger = document\.getElementById\('grovioNavBurger'\);[\s\S]*?\}\)\(\);\s*<\/script>\s*/g;

const landingHeader = `<header class="grovio-nav grovio-nav--landing">
  <div class="grovio-nav-inner">
    <a href="/" class="grovio-wordmark">grovio</a>
    <div class="grovio-nav-right">
      <button class="grovio-nav-burger grovio-nav-burger--landing" id="grovioNavBurger" aria-label="Explore grovio" aria-expanded="false" aria-controls="grovioNavPanel">
        <span class="grovio-nav-menu-label">Explore grovio</span>
        <span class="grovio-nav-menu-icon" aria-hidden="true"><i></i><i></i><i></i></span>
      </button>
    </div>
  </div>
</header>
<div class="grovio-nav-overlay" id="grovioNavOverlay"></div>
${menuPanel}`;

function addSharedAssets(html) {
  if (!html.includes('/assets/grovio-navigation.css')) {
    html = html.replace('</head>', `  <link rel="stylesheet" href="${navigationStylesheet}">\n  <script defer src="${navigationScript}"></script>\n</head>`);
  } else {
    html = html.replace(/href="\/assets\/grovio-navigation\.css(?:\?[^\"]*)?"/g, `href="${navigationStylesheet}"`);
    if (html.includes('/assets/grovio-navigation.js')) {
      html = html.replace(/src="\/assets\/grovio-navigation\.js(?:\?[^\"]*)?"/g, `src="${navigationScript}"`);
    } else {
      html = html.replace('</head>', `  <script defer src="${navigationScript}"></script>\n</head>`);
    }
  }

  if (!html.includes('/assets/grovio-consent.css')) {
    html = html.replace('</head>', `  <link rel="stylesheet" href="${consentStylesheet}">\n  <script defer src="${consentScript}"></script>\n</head>`);
  } else {
    html = html.replace(/href="\/assets\/grovio-consent\.css(?:\?[^\"]*)?"/g, `href="${consentStylesheet}"`);
    if (html.includes('/assets/grovio-consent.js')) {
      html = html.replace(/src="\/assets\/grovio-consent\.js(?:\?[^\"]*)?"/g, `src="${consentScript}"`);
    } else {
      html = html.replace('</head>', `  <script defer src="${consentScript}"></script>\n</head>`);
    }
  }

  return html;
}

function removeWebsiteMeasurement(html) {
  return html
    .replace(/<!-- Google Analytics 4 -->\s*/gi, '')
    .replace(/<script\s+async\s+src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=G-ZM2WLE995S"><\/script>\s*/gi, '')
    .replace(/<script>\s*window\.dataLayer\s*=\s*window\.dataLayer\s*\|\|\s*\[\];[\s\S]*?gtag\('config',\s*['"]G-ZM2WLE995S['"][\s\S]*?<\/script>\s*/gi, '')
    .replace(/<!-- Meta Pixel Code -->[\s\S]*?(?:<!-- End Meta Pixel Code -->|(?=<!-- Pinterest Tag -->))\s*/gi, '')
    .replace(/<!-- Pinterest Tag -->[\s\S]*?(?:<!-- end Pinterest Tag -->|(?=<meta\s+name="viewport"))\s*/gi, '')
    .replace(/<script>\s*!function\(w,d,s,u\)\{if\(w\.oaiq\)[\s\S]*?bzrcdn\.openai\.com\/sdk\/oaiq\.min\.js[\s\S]*?<\/script>\s*/g, '');
}

function addOpenAIConversionConfiguration(html, relativePath) {
  if (relativePath !== 'start.html' || html.includes('grovio-openai-conversion-pixel')) return html;
  return html.replace('</head>', '  <meta name="grovio-openai-conversion-pixel" content="WtKnfY6Nk16KRdKDGcRUEj">\n</head>');
}

function keepOneNavigation(html) {
  let found = false;
  return html.replace(fullNavigationPatternGlobal, (navigation) => {
    if (found) return '';
    found = true;
    return navigation;
  });
}

let legacyUpdated = 0;
for (const relativePath of legacyFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  if (html.includes('id="grovioNavPanel"')) {
    html = html.replace(fullNavigationPattern, sharedHeader);
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
  'guide/what-supplies-do-i-need.html',
];

let modernUpdated = 0;
for (const relativePath of modernFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  if (!fullNavigationPattern.test(html)) throw new Error(`Could not find the current navigation in ${relativePath}`);
  html = html.replace(fullNavigationPattern, sharedHeader);
  html = addSharedAssets(html);
  html = html.replace(/@media \(min-width: 761px\) \{ \.grovio-nav-burger \{ display: none; \} \}\n?/, '');
  html = html.replace(/\n        @media \(max-width: 760px\)/g, '\n    @media (max-width: 760px)');
  await writeFile(file, html);
  modernUpdated += 1;
}

const standalonePublicFiles = [
  'community.html',
  'get.html',
  'links/index.html',
  'share.html',
  'grovio-vs-homeschool-ledger.html',
  'grovio-vs-homeschool-planet.html',
  'grovio-vs-homeschool-tracker.html',
];

for (const relativePath of standalonePublicFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  html = addSharedAssets(html);

  if (html.includes('id="grovioNavPanel"')) {
    html = html.replace(fullNavigationPattern, sharedHeader);
  } else if (relativePath === 'community.html') {
    html = html.replace(/<header class="nav">[\s\S]*?<\/header>/, sharedHeader);
  } else if (relativePath === 'links/index.html') {
    html = html.replace(/<a class="wordmark" href="https:\/\/grovioapp\.com\/" aria-label="grovio home">grovio<\/a>/, '<span aria-hidden="true"></span>');
    html = html.replace('<body>', `<body>\n  ${sharedHeader}`);
  } else if (relativePath === 'share.html') {
    html = html.replace(/<div class="top-bar">[\s\S]*?<\/div>/, sharedHeader);
  } else if (relativePath.startsWith('grovio-vs-')) {
    html = html.replace(/<nav class="nav">[\s\S]*?<\/nav>/, sharedHeader);
  } else {
    html = html.replace('<body>', `<body>\n  ${sharedHeader}`);
  }

  await writeFile(file, html);
}

const directLinkFiles = [
  'creator-program.html',
  'start.html',
  'p/can-i-homeschool-if-im-not-a-teacher.html',
  'p/how-do-i-create-a-daily-rhythm.html',
  'p/how-do-i-start-homeschooling.html',
  'p/how-do-i-stay-consistent-without-burnout.html',
  'p/is-it-normal-for-homeschooling-to-feel-hard.html',
  'p/what-counts-as-learning.html',
  'p/what-if-my-child-is-ahead-or-behind.html',
  'p/what-supplies-do-i-need.html',
];

for (const relativePath of directLinkFiles) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  html = addSharedAssets(html);

  if (html.includes('grovio-nav--landing')) {
    html = html.replace(fullNavigationPattern, landingHeader);
  } else if (relativePath === 'creator-program.html') {
    if (!/<meta name="robots"/i.test(html)) {
      html = html.replace('</head>', '  <meta name="robots" content="noindex, nofollow">\n</head>');
    }
    html = html.replace(/\s*<header class="site-header">[\s\S]*?<\/header>/, '');
    html = html.replace('<body>', `<body>\n  ${landingHeader}`);
  } else if (relativePath === 'start.html') {
    html = html.replace(fullNavigationPattern, landingHeader);
  } else {
    html = html.replace(/<div class="top-bar">[\s\S]*?<\/div>/, landingHeader);
  }

  await writeFile(file, html);
}

const publicHtmlFiles = [
  ...legacyFiles,
  ...modernFiles,
  ...standalonePublicFiles,
  ...directLinkFiles,
];

for (const relativePath of new Set(publicHtmlFiles)) {
  const file = resolve(root, relativePath);
  let html = await readFile(file, 'utf8');
  html = removeWebsiteMeasurement(html);
  html = addOpenAIConversionConfiguration(html, relativePath);
  html = addSharedAssets(html);
  html = html
    .replace(/family=Plus\+Jakarta\+Sans(?::[^&"']+)?/g, 'family=Inter:wght@400;500;600')
    .replace(/'Plus Jakarta Sans'/g, "'Inter'")
    .replace(/"Plus Jakarta Sans"/g, '"Inter"')
    .replace(/Plus Jakarta Sans/g, 'Inter');
  html = keepOneNavigation(html);
  html = html.replace(copiedNavigationScriptPattern, '');
  html = html.replace(/\n[ \t]+\n/g, '\n\n');
  await writeFile(file, html);
}

console.log(`Updated ${legacyUpdated} legacy headers, ${modernUpdated} current headers, ${standalonePublicFiles.length} standalone pages, and ${directLinkFiles.length} direct-link pages.`);
