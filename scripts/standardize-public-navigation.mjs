import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const navigationStylesheet = '/assets/grovio-navigation.css?v=20260913-2';
const navigationScript = '/assets/grovio-navigation.js?v=20260911-2';
const consentStylesheet = '/assets/grovio-consent.css?v=20260911-2';
const consentScript = '/assets/grovio-consent.js?v=20260911-2';
const socialProfiles = [
  { label: 'Instagram', href: 'https://www.instagram.com/groviohomeschool/', iconPath: 'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077' },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61590897646398', iconPath: 'M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/grovioapp/', iconPath: 'M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@groviohomeschoolapp', iconPath: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  { label: 'X', href: 'https://x.com/groviohomeskool', iconPath: 'M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z' },
];
const lightFooterFiles = new Set([
  'community.html',
  'get.html',
  'links/index.html',
  'share.html',
  'p/can-i-homeschool-if-im-not-a-teacher.html',
  'p/how-do-i-create-a-daily-rhythm.html',
  'p/how-do-i-start-homeschooling.html',
  'p/how-do-i-stay-consistent-without-burnout.html',
  'p/is-it-normal-for-homeschooling-to-feel-hard.html',
  'p/what-counts-as-learning.html',
  'p/what-if-my-child-is-ahead-or-behind.html',
  'p/what-supplies-do-i-need.html',
]);

const socialFooterPattern = /\s*<nav class="grovio-social-links(?: grovio-social-links--on-dark)?" aria-label="Follow grovio">[\s\S]*?<\/nav>/g;

function socialFooterMarkup({ onDark = false } = {}) {
  const toneClass = onDark ? ' grovio-social-links--on-dark' : '';
  return `\n    <nav class="grovio-social-links${toneClass}" aria-label="Follow grovio">
      <span class="grovio-social-links-label">Follow grovio</span>
      ${socialProfiles.map(({ href, iconPath, label }) => `<a class="grovio-social-link grovio-social-link--${label.toLowerCase()}" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="Follow grovio on ${label}" title="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${iconPath}"/></svg><span class="grovio-visually-hidden">${label}</span></a>`).join('\n      ')}
    </nav>\n  `;
}

function addSocialFooterLinks(html, relativePath) {
  if (html.includes('grovio-social-links')) {
    return html.replace(socialFooterPattern, socialFooterMarkup({ onDark: !lightFooterFiles.has(relativePath) }));
  }
  const footerCloseIndex = html.lastIndexOf('</footer>');
  if (footerCloseIndex < 0) return html;
  return `${html.slice(0, footerCloseIndex)}${socialFooterMarkup({ onDark: !lightFooterFiles.has(relativePath) })}${html.slice(footerCloseIndex)}`;
}

function addCreatorFooter(html) {
  if (html.includes('grovio-social-footer')) {
    return html.replace(socialFooterPattern, socialFooterMarkup({ onDark: true }));
  }
  const footer = `
  <footer class="grovio-social-footer">
    <a href="/" class="grovio-social-footer-wordmark">grovio</a>
    <p>Grow Simply. Homeschool Confidently.</p>${socialFooterMarkup({ onDark: true })}</footer>`;
  return html.replace('</main>', `</main>${footer}`);
}
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
  html = relativePath === 'creator-program.html'
    ? addCreatorFooter(html)
    : addSocialFooterLinks(html, relativePath);
  html = html.replace(/\n[ \t]+\n/g, '\n\n');
  await writeFile(file, html);
}

console.log(`Updated ${legacyUpdated} legacy headers, ${modernUpdated} current headers, ${standalonePublicFiles.length} standalone pages, and ${directLinkFiles.length} direct-link pages.`);
