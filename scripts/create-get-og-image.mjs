import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from '/Users/skipperkilian/grovio-app/node_modules/sharp/lib/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'og-get.png');
const logoPath = join(root, 'assets', 'grovio-logo.png');
const homeScreenPath = join(root, 'assets', 'feature-home-toast.png');

const width = 1200;
const height = 630;

const layout = `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#F8F6F0"/>
  <rect x="781" width="419" height="630" fill="#E8F0E3"/>
  <rect x="74" y="166" width="58" height="4" fill="#4A6E4E"/>
  <text x="74" y="216" fill="#4A6E4E" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" letter-spacing="2.2">THE HOMESCHOOL COMPANION APP</text>
  <text x="74" y="286" fill="#2D302A" font-family="Georgia, 'Times New Roman', serif" font-size="54" font-weight="700">A calmer way to</text>
  <text x="74" y="347" fill="#2D302A" font-family="Georgia, 'Times New Roman', serif" font-size="48" font-weight="700">homeschool with confidence.</text>
  <text x="74" y="407" fill="#5E675D" font-family="Arial, Helvetica, sans-serif" font-size="24">Built for the learning your family is</text>
  <text x="74" y="440" fill="#5E675D" font-family="Arial, Helvetica, sans-serif" font-size="24">actually living.</text>
  <line x1="74" y1="504" x2="690" y2="504" stroke="#CED8CA" stroke-width="2"/>
  <text x="74" y="549" fill="#4A6E4E" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="700" letter-spacing="1.5">AVAILABLE ON IOS + ANDROID</text>
  <rect x="820" y="45" width="324" height="550" rx="26" fill="#FFFFFF"/>
</svg>`;

const logo = await sharp(logoPath)
  .trim()
  .resize({ width: 208 })
  .png()
  .toBuffer();

const homeScreen = await sharp(homeScreenPath)
  .extract({ left: 0, top: 298, width: 1290, height: 2498 })
  .resize({ height: 538 })
  .png()
  .toBuffer();

await sharp({
  create: {
    width,
    height,
    channels: 4,
    background: '#F8F6F0',
  },
})
  .composite([
    { input: Buffer.from(layout), top: 0, left: 0 },
    { input: logo, top: 70, left: 74 },
    {
      input: homeScreen,
      top: 51,
      left: 842,
      blend: 'over',
    },
  ])
  .png({ compressionLevel: 9, palette: true, quality: 95 })
  .toFile(output);

console.log(`Created ${output}`);
