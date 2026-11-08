import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'assets/social-campaign-2026/carousels');

const palettes = [
  { background: '#F7F4EE', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' },
  { background: '#F1E6D2', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' },
  { background: '#F7F4EE', ink: '#2C2218', accent: '#B96E4A', rust: '#4A6E4E' },
  { background: '#E9EFE6', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' }
];

const line = (text, accent = false) => ({ text, accent });

const carousels = [
  {
    slug: '01-you-already-did-the-hardest-part',
    slides: [
      [line('You already did the hardest part.'), line('Deciding was the hard part.', true)],
      [line('Now there are tools to help.'), line("You don't have to hold it all in your head.")],
      [line('Begin with today,'), line('not every possible task.'), line('Five minutes a day. No streaks, no guilt.', true)],
      [line("Maybe you're not failing."), line('Maybe you just need to see'), line("what's already working.", true)],
      [line('Take the 2-minute check-in.'), line('What does your homeschool need right now?'), line('Link in bio.'), line('grovio')]
    ]
  },
  {
    slug: '02-your-co-op-one-place',
    slides: [
      [line('How many apps'), line('does your co-op live on?'), line('What if it was one?', true)],
      [line('Tired of being stuck on social media'), line("because that's where your group talks?")],
      [line('The Community Hub lives inside Grovio —'), line('separate from social media,', true), line('made for homeschool groups.')],
      [line('One place for your co-op,'), line('your play group, your people.'), line("And it's free, always.", true)],
      [line("When you're ready,"), line('host your homeschool there too.'), line('Take the 2-minute check-in — link in bio.'), line('grovio')]
    ]
  },
  {
    slug: '03-planner-graveyard',
    slides: [
      [line('Do you have a homeschool'), line('planner graveyard?', true)],
      [line('Every new planner gave you hope'), line("you'd finally be organized.")],
      [line('Neurotypical organization methods'), line("don't work for a neurodivergent brain.", true)],
      [line('Grovio follows your real life —', true), line('a rhythm for flexible days,'), line('a schedule when you need exact times.')],
      [line("You don't need to homeschool like everyone else."), line('You need a calmer way to see your own.'), line('Take the 2-minute check-in — link in bio.'), line('grovio')]
    ]
  },
  {
    slug: '04-your-homeschool-your-data',
    slides: [
      [line('Your records stay on your device.'), line('Until you say otherwise.', true)],
      [line("Most apps take your family's data"), line('the moment you sign up.'), line("Grovio doesn't ask for an account at all.", true)],
      [line('14 days of everything, free.'), line('Your data lives on your device —'), line('no cloud, no account, no sharing.')],
      [line('Choose Premium when you want'), line('to keep the whole year —'), line('encrypted backup, exports,', true), line('and Friday Wrap-Ups you can edit.')],
      [line('A calmer place to keep it all.'), line('Take the 2-minute check-in — link in bio.'), line('grovio')]
    ]
  }
];

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function wrapLines(items) {
  const wrapped = [];
  const maxCharacters = 30;
  for (const item of items) {
    const words = item.text.split(' ');
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && candidate.length > maxCharacters) {
        wrapped.push({ text: current, accent: item.accent });
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) wrapped.push({ text: current, accent: item.accent });
  }
  return wrapped;
}

function fontSizeFor(lines) {
  const longest = Math.max(...lines.map((item) => item.text.length));
  if (lines.length >= 8 || longest > 28) return 46;
  if (lines.length >= 6 || longest > 23) return 54;
  if (lines.length >= 5) return 60;
  return 70;
}

function renderText(lines, size, startY, palette) {
  const lineHeight = Math.round(size * 1.13);
  return lines.map((item, index) => {
    const y = startY + index * lineHeight;
    const fill = item.accent ? palette.accent : palette.ink;
    const style = item.accent ? 'italic' : 'normal';
    return `<text x="540" y="${y}" text-anchor="middle" fill="${fill}" font-family="'Source Serif 4', Georgia, serif" font-size="${size}" font-weight="400" font-style="${style}" letter-spacing="-1.4">${escapeXml(item.text)}</text>`;
  }).join('\n    ');
}

function renderCard(items, slideIndex, carouselIndex) {
  const palette = palettes[(slideIndex + carouselIndex) % palettes.length];
  const isCta = slideIndex === 4;
  const lines = wrapLines(isCta ? items.filter((item) => item.text !== 'grovio') : items);
  const size = fontSizeFor(lines);
  const lineHeight = Math.round(size * 1.13);
  const blockHeight = (lines.length - 1) * lineHeight;
  const startY = Math.round(640 - blockHeight / 2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Grovio carousel card">
  <rect width="1080" height="1350" fill="${palette.background}"/>
  <line x1="492" y1="126" x2="588" y2="126" stroke="${palette.ink}" stroke-width="3" stroke-linecap="round"/>
  ${renderText(lines, size, startY, palette)}
  <line x1="492" y1="1108" x2="588" y2="1108" stroke="${palette.rust}" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
  ${isCta ? `<text x="540" y="1202" text-anchor="middle" fill="${palette.accent}" font-family="Nunito, Arial, sans-serif" font-size="44" font-weight="800" letter-spacing="-2">grovio</text>` : ''}
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
