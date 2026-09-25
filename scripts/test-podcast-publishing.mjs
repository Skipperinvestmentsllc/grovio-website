import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { podcastEpisodeData } from './podcast-episode-data.mjs';

const source = new URL('./update-podcast-from-rss.mjs', import.meta.url);
const slug = 'what-i-was-actually-buying';
const other = 'i-tried-to-recreate-school-at-home';
const transcript = `${'A complete paragraph about choosing curriculum for the child and noticing real learning.\n\n'.repeat(10)}Love,\n\nClaire\n`;
const item = (title, date, duration = '00:02:53') => `<item><title>${title}</title><pubDate>${date}</pubDate><link>https://example.com/episode</link><itunes:duration>${duration}</itunes:duration><enclosure url="https://example.com/audio.mp3" /></item>`;
const rss = (...items) => `<rss xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"><channel>${items.join('')}</channel></rss>`;
const latest = item('What I Was Actually Buying', 'Tue, 22 Sep 2026 11:00:00 GMT');
const earlier = item('I Tried to Recreate School at Home', 'Tue, 15 Sep 2026 11:00:00 GMT');

async function fixture(t, feed = rss(latest)) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'grovio-podcast-test-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'scripts'));
  await fs.mkdir(path.join(root, 'drafts'));
  await fs.mkdir(path.join(root, 'links'));
  await fs.copyFile(source, path.join(root, 'scripts/update-podcast-from-rss.mjs'));
  const profiles = structuredClone(podcastEpisodeData);
  for (const p of Object.values(profiles)) p.relatedEpisodeSlugs = [slug];
  await fs.writeFile(path.join(root, 'scripts/podcast-episode-data.mjs'), `export const podcastEpisodeData=${JSON.stringify(profiles)}; export const guideCatalog=${JSON.stringify((await import('./podcast-episode-data.mjs')).guideCatalog)};`);
  await fs.writeFile(path.join(root, 'rss.xml'), feed);
  await fs.writeFile(path.join(root, 'drafts', `2026-09-29--${slug}.txt`), transcript);
  for (const file of ['sitemap.xml', 'llms.txt', 'links/index.html']) await fs.copyFile(new URL(`../${file}`, import.meta.url), path.join(root, file));
  return { root, run: (...args) => spawnSync(process.execPath, ['scripts/update-podcast-from-rss.mjs', '--rss-file=rss.xml', ...args], { cwd: root, env: { ...process.env, PODCAST_TRANSCRIPT_DIR: path.join(root, 'drafts') }, encoding: 'utf8' }) };
}

test('planned date mismatch publishes with RSS date, archives verbatim, and rerun makes no writes', async (t) => {
  const f = await fixture(t);
  const run = f.run();
  assert.equal(run.status, 0, run.stderr);
  const html = await fs.readFile(path.join(f.root, `podcast/${slug}.html`), 'utf8');
  assert.match(html, /2026-09-22T11:00:00.000Z/);
  assert.match(html, /PT2M53S/);
  assert.match(html, /PodcastEpisode/);
  assert.match(html, /BreadcrumbList/);
  assert.match(html, /data-analytics="audio-/);
  assert.equal(await fs.readFile(path.join(f.root, `content/podcast/transcripts/${slug}.txt`), 'utf8'), transcript);
  const before = (await fs.stat(path.join(f.root, 'podcast.html'))).mtimeMs;
  await fs.rm(path.join(f.root, 'drafts'), { recursive: true });
  assert.match(f.run().stdout, /Nothing new is live/);
  assert.equal((await fs.stat(path.join(f.root, 'podcast.html'))).mtimeMs, before);
});

test('dry run and check report do not write; future items excluded and feed sorted', async (t) => {
  const f = await fixture(t, rss(earlier, item('Future Draft', 'Tue, 22 Sep 2099 11:00:00 GMT'), latest));
  await fs.writeFile(path.join(f.root, 'drafts', `2026-09-22--${other}.txt`), transcript);
  const report = JSON.parse(f.run('--check').stdout);
  assert.equal(report.newest.slug, slug);
  assert.deepEqual(report.unpublished.map(e => e.slug), [slug, other]);
  assert.deepEqual(report.problems, []);
  assert.equal(f.run('--dry-run').status, 0);
  await assert.rejects(fs.stat(path.join(f.root, 'podcast.html')), { code: 'ENOENT' });
});

test('duplicate transcript candidates block before any output writes', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'drafts', `2026-09-22--${slug}.txt`), transcript);
  assert.match(f.run().stderr, /Ambiguous transcript/);
  await assert.rejects(fs.stat(path.join(f.root, 'podcast.html')), { code: 'ENOENT' });
});

test('missing or incomplete older transcript blocks the entire batch', async (t) => {
  const f = await fixture(t, rss(latest, earlier));
  assert.match(f.run().stderr, /missing transcript/);
  await fs.writeFile(path.join(f.root, 'drafts', `2026-09-22--${other}.txt`), transcript.replace(/Love,[\s\S]*$/, ''));
  assert.match(f.run().stderr, /missing Claire's closing/);
  await assert.rejects(fs.stat(path.join(f.root, 'podcast.html')), { code: 'ENOENT' });
});

test('stale or truncated RSS cannot remove previously published episodes', async (t) => {
  const f = await fixture(t);
  await fs.mkdir(path.join(f.root, 'podcast'));
  await fs.writeFile(path.join(f.root, `podcast/${other}.html`), 'existing page');
  assert.match(f.run().stderr, /refusing to shrink archive/);
  assert.equal(await fs.readFile(path.join(f.root, `podcast/${other}.html`), 'utf8'), 'existing page');
});

test('missing editorial and invalid duration are reported together', async (t) => {
  const f = await fixture(t, rss(item('Unknown Episode', 'Tue, 22 Sep 2026 11:00:00 GMT', '')));
  const report = JSON.parse(f.run('--check').stdout);
  assert.ok(report.problems.some(p => p.includes('missing editorial')));
  assert.ok(report.problems.some(p => p.includes('invalid duration')));
  assert.equal(f.run().status, 1);
});

test('integration page mismatch fails before writing any episode', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'links/index.html'), '<p>different layout</p>');
  assert.match(f.run().stderr, /Podcast card not found/);
  await assert.rejects(fs.stat(path.join(f.root, 'podcast.html')), { code: 'ENOENT' });
});

test('publishing a backlog retains old episode bytes and later llms sections', async (t) => {
  const f = await fixture(t, rss(latest, earlier));
  await fs.mkdir(path.join(f.root, 'podcast'));
  await fs.writeFile(path.join(f.root, `podcast/${other}.html`), 'existing page');
  await fs.writeFile(path.join(f.root, 'drafts', `2026-09-22--${other}.txt`), transcript);
  await fs.appendFile(path.join(f.root, 'llms.txt'), '\n## Keep this section\nUnrelated content\n');
  assert.equal(f.run().status, 0);
  assert.equal(await fs.readFile(path.join(f.root, `podcast/${other}.html`), 'utf8'), 'existing page');
  assert.match(await fs.readFile(path.join(f.root, 'llms.txt'), 'utf8'), /Keep this section\nUnrelated content/);
});

test('publication preserves current navigation, consent assets and footer', async (t) => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.root, 'podcast.html'), '<html><head><script defer src="/assets/grovio-consent.js?v=1"></script><link rel="stylesheet" href="/assets/grovio-navigation.css?v=1"></head><body><header>Current navigation</header><main>Old hub</main><footer>Current footer</footer></body></html>');
  assert.equal(f.run().status, 0);
  for (const name of ['podcast.html', `podcast/${slug}.html`]) {
    const html = await fs.readFile(path.join(f.root, name), 'utf8');
    assert.match(html, /<header>Current navigation<\/header>/);
    assert.match(html, /<footer>Current footer<\/footer>/);
    assert.match(html, /grovio-consent.js\?v=1/);
    assert.match(html, /grovio-navigation.css\?v=1/);
  }
});
