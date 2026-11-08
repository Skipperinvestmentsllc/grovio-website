import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'assets/social-campaign-2026/carousels');

const palettes = [
  { background: '#F7F4EE', ink: '#2C2218', accent: '#B96E4A', soft: '#E8D7C2' },
  { background: '#DDE8DC', ink: '#2C2218', accent: '#4A6E4E', soft: '#F7F4EE' },
  { background: '#B96E4A', ink: '#F7F4EE', accent: '#E8D7C2', soft: '#2C2218' },
  { background: '#2C2218', ink: '#F7F4EE', accent: '#B8D4BB', soft: '#B96E4A' },
  { background: '#F1E6D2', ink: '#2C2218', accent: '#4A6E4E', soft: '#B96E4A' }
];

const carousels = [
  {
    slug: '01-pick-the-anchors',
    title: 'Pick the anchors',
    slides: [
      ["Monday doesn't need a perfect plan.", 'It just needs a rhythm.'],
      ['Every week has a few things that don\'t move.', 'Those are your anchors.'],
      ['Put the anchors in first.', 'Let the rest flex — a lesson can slide a day,', 'a morning can start slower.'],
      ['In Grovio, your rhythm is a shape you return to —', 'not a schedule you have to keep up with.'],
      ['Take the 2-minute check-in.', 'What does your homeschool need right now?', 'Link in bio.', 'grovio']
    ]
  },
  {
    slug: '02-small-moments-are-the-portfolio',
    title: 'Small moments are the portfolio',
    slides: [
      ["Portfolios don't grow from big projects.", 'They grow from little moments you actually captured.'],
      ['It took about ten seconds,', "and now it won't get lost."],
      ['What counts:', 'the drawing, the leaf,', 'the half-built project,', 'the question they asked.'],
      ['In Grovio, a photo + one line', 'goes straight into your portfolio.', 'No scrapbook session. No guilt pile.'],
      ['What small moment is worth keeping', 'at your house this week?', 'Save this for your next portfolio moment.', 'grovio']
    ]
  },
  {
    slug: '03-close-the-week-in-5-minutes',
    title: 'Close the week in 5 minutes',
    slides: [
      ['Friday Wrap-Up time.', 'My favorite five minutes', 'of the homeschool week.'],
      ['1 — Note what actually happened.', 'Not what the plan said.'],
      ['2 — One line on what worked.', '3 — Mark attendance', 'while you still remember it.'],
      ['Records done while they\'re fresh.', 'Monday starts clean', 'instead of half-remembered.'],
      ['Then the weekend is actually a weekend.', 'Try the Friday Wrap-Up in Grovio —', 'free to start.', 'grovio']
    ]
  },
  {
    slug: '04-your-homeschool-your-data',
    title: 'Your homeschool, your data',
    slides: [
      ['Your records stay on your device.', 'Until you say otherwise.'],
      ['Most apps take your family\'s data', 'the moment you sign up.', "Grovio doesn't ask for an account at all."],
      ['14 days of everything, free.', 'Your data lives on your device —', 'no cloud, no account, no sharing.'],
      ['When you choose Premium,', "that's when your data is backed up —", 'because you chose it,', 'not because you downloaded an app.'],
      ['A calmer place to keep it all —', "and it's yours to share", 'when you\'re ready.', 'Free to start.', 'grovio']
    ]
  }
];

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function fontSizeFor(lines) {
  const longest = Math.max(...lines.map((line) => line.length));
  if (longest > 63) return 42;
  if (longest > 49) return 45;
  if (longest > 39) return 52;
  if (lines.length >= 5) return 50;
  return 60;
}

function wrapLines(lines) {
  const wrapped = [];
  const maxCharacters = 37;
  for (const line of lines) {
    const words = line.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > maxCharacters) {
        wrapped.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrapped.push(current);
  }
  return wrapped;
}

function renderCard(lines, slideIndex, carouselIndex) {
  const palette = palettes[(slideIndex + carouselIndex) % palettes.length];
  const displayLines = wrapLines(lines);
  const size = fontSizeFor(displayLines);
  const lineHeight = Math.round(size * 1.18);
  const blockHeight = displayLines.length * lineHeight;
  const startY = Math.max(350, Math.round((1350 - blockHeight) / 2) - 20);
  const isCta = slideIndex === 4;
  const logo = isCta
    ? `<text x="84" y="1192" fill="${palette.accent}" font-family="Avenir Next, Avenir, Arial, sans-serif" font-size="39" font-weight="800" letter-spacing="-1.8">grovio</text>`
    : '';
  const text = displayLines.map((line, index) => {
    const y = startY + index * lineHeight;
    const emphasis = index === displayLines.length - 1 && displayLines.length <= 2;
    return `<text x="84" y="${y}" fill="${palette.ink}" font-family="Georgia, Times New Roman, serif" font-size="${size}" font-weight="${emphasis ? 600 : 400}" font-style="${emphasis ? 'italic' : 'normal'}" letter-spacing="-1.25">${escapeXml(line)}</text>`;
  }).join('\n    ');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Grovio carousel card">
  <rect width="1080" height="1350" fill="${palette.background}"/>
  <circle cx="1000" cy="104" r="145" fill="${palette.accent}" opacity="0.12"/>
  <circle cx="930" cy="1190" r="220" fill="${palette.soft}" opacity="0.24"/>
  <path d="M82 106 C152 72 214 77 254 112 C214 143 149 145 82 126 Z" fill="${palette.accent}" opacity="0.85"/>
  <path d="M82 113 C134 122 186 117 226 97" fill="none" stroke="${palette.background}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
  <rect x="84" y="180" width="88" height="8" rx="4" fill="${palette.accent}"/>
  ${text}
  <rect x="84" y="1106" width="190" height="2" fill="${palette.accent}" opacity="0.7"/>
  ${logo}
</svg>`;
}

async function main() {
  for (let carouselIndex = 0; carouselIndex < carousels.length; carouselIndex += 1) {
    const carousel = carousels[carouselIndex];
    const directory = join(outputRoot, carousel.slug);
    await mkdir(directory, { recursive: true });
    for (let slideIndex = 0; slideIndex < carousel.slides.length; slideIndex += 1) {
      const file = join(directory, `${String(slideIndex + 1).padStart(2, '0')}.svg`);
      await writeFile(file, renderCard(carousel.slides[slideIndex], slideIndex, carouselIndex), 'utf8');
    }
  }
}

await main();
