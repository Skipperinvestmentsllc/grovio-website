import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = join(root, 'assets/social-campaign-2026/carousels');
const logoMarkData = (await readFile(join(root, 'assets/grovio-mark.png'))).toString('base64');

const palettes = [
  { background: '#F7F4EE', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' },
  { background: '#F1E6D2', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' },
  { background: '#F7F4EE', ink: '#2C2218', accent: '#B96E4A', rust: '#4A6E4E' },
  { background: '#E9EFE6', ink: '#2C2218', accent: '#4A6E4E', rust: '#B96E4A' }
];

const line = (text, accent = false) => ({ text, accent });
const slide = (headline, caption = [], cta = false) => ({ headline, caption, cta });

const carousels = [
  {
    slug: '01-you-already-did-the-hardest-part',
    slides: [
      slide([line('You already did the hardest part.')], [line('Deciding was the hard part.', true)]),
      slide([line('Now there are tools to help.')], [line("You don't have to hold it all in your head.")]),
      slide([line('Begin with today, not every possible task.')], [line('Five minutes a day. No streaks, no guilt.', true)]),
      slide([line("Maybe you're not failing.")], [line("Maybe you just need to see what's already working.", true)]),
      slide([line('Take the 2-minute check-in.')], [line('What does your homeschool need right now?'), line('Link in bio.')], true)
    ]
  },
  {
    slug: '02-your-co-op-one-place',
    slides: [
      slide([line('How many apps does your co-op live on?')], [line('What if it was one?', true)]),
      slide([line('Tired of being stuck on social media')], [line("because that's where your group talks?")]),
      slide([line('The Community Hub lives inside Grovio —')], [line('separate from social media,', true), line('made for homeschool groups.')]),
      slide([line('One place for your co-op, your play group, your people.')], [line("And it's free, always.", true)]),
      slide([line("When you're ready, host your homeschool there too.")], [line('Take the 2-minute check-in — link in bio.')], true)
    ]
  },
  {
    slug: '03-planner-graveyard',
    slides: [
      slide([line('Do you have a homeschool'), line('planner graveyard?', true)]),
      slide([line('Every new planner gave you hope')], [line("you'd finally be organized.")]),
      slide([line('Neurotypical organization methods')], [line("don't work for a neurodivergent brain.", true)]),
      slide([line('Grovio follows your real life —', true)], [line('a rhythm for flexible days,'), line('a schedule when you need exact times.')]),
      slide([line("You don't need to homeschool like everyone else.")], [line('You need a calmer way to see your own.'), line('Take the 2-minute check-in — link in bio.')], true)
    ]
  },
  {
    slug: '04-your-homeschool-your-data',
    slides: [
      slide([line('Your records stay on your device.')], [line('Until you say otherwise.', true)]),
      slide([line("Most apps take your family's data")], [line('the moment you sign up.'), line("Grovio doesn't ask for an account at all.", true)]),
      slide([line('14 days of everything, free.')], [line('Your data lives on your device —'), line('no cloud, no account, no sharing.')]),
      slide([line('Choose Premium when you want to keep the whole year —')], [line('encrypted backup, exports,', true), line('and Friday Wrap-Ups you can edit.')]),
      slide([line('A calmer place to keep it all.')], [line('Take the 2-minute check-in — link in bio.')], true)
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

function wrapItems(items, maxCharacters) {
  const wrapped = [];
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

function headlineSize(lines) {
  const longest = Math.max(...lines.map((item) => item.text.length));
  if (lines.length >= 5 || longest > 28) return 54;
  if (lines.length >= 4 || longest > 23) return 60;
  if (longest > 19) return 70;
  return 84;
}

function captionSize(lines) {
  if (lines.length >= 4) return 36;
  if (lines.length >= 3) return 40;
  return 44;
}

function textBlock(items, size, startY, palette, lineHeight) {
  return items.map((item, index) => {
    const y = startY + index * lineHeight;
    const fill = item.accent ? palette.accent : palette.ink;
    const style = item.accent ? 'italic' : 'normal';
    return `<text x="540" y="${y}" text-anchor="middle" fill="${fill}" font-family="'Source Serif 4', Georgia, serif" font-size="${size}" font-weight="400" font-style="${style}" letter-spacing="-1.8">${escapeXml(item.text)}</text>`;
  }).join('\n    ');
}

function renderCard(data, slideIndex, carouselIndex) {
  const palette = palettes[(slideIndex + carouselIndex) % palettes.length];
  const headline = wrapItems(data.headline, 25);
  const caption = wrapItems(data.caption, 37);
  const headlineFont = headlineSize(headline);
  const captionFont = captionSize(caption);
  const headlineLineHeight = Math.round(headlineFont * 1.08);
  const captionLineHeight = Math.round(captionFont * 1.15);
  const headlineHeight = Math.max(0, (headline.length - 1) * headlineLineHeight);
  const captionHeight = Math.max(0, (caption.length - 1) * captionLineHeight);
  const headlineStart = Math.round(555 - headlineHeight / 2);
  const captionStart = Math.max(810, headlineStart + headlineHeight + 105);
  const logo = data.cta
    ? `<text x="540" y="1166" text-anchor="middle" fill="${palette.accent}" font-family="Nunito, Arial, sans-serif" font-size="58" font-weight="800" letter-spacing="-2.5">grovio</text>`
    : `<image href="data:image/png;base64,${logoMarkData}" x="519" y="1113" width="42" height="54" preserveAspectRatio="xMidYMid meet"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-label="Grovio carousel card">
  <rect width="1080" height="1350" fill="${palette.background}"/>
  <text x="540" y="190" text-anchor="middle" fill="${palette.ink}" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="500" letter-spacing="7">— A GENTLE REMINDER</text>
  ${textBlock(headline, headlineFont, headlineStart, palette, headlineLineHeight)}
  ${caption.length ? textBlock(caption, captionFont, captionStart, palette, captionLineHeight) : ''}
  ${logo}
  <text x="540" y="1231" text-anchor="middle" fill="${palette.ink}" font-family="Inter, Arial, sans-serif" font-size="23" font-weight="400" letter-spacing="0.2">five minutes a day, no guilt.</text>
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
