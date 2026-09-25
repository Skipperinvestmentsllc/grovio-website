# Podcast publishing

RSS is the source of truth for what is live, title, release date, duration,
audio URL, and platform URL. A date in a writing filename is only a planned date.
Never publish a draft merely because that date has arrived.

## Content organization

- `content/podcast/transcripts/<slug>.txt`: canonical transcripts for released
  episodes, saved by the publisher and committed alongside their pages. These
  files keep previously published episodes independent of iCloud and the writing
  computer. Edit this copy for deliberate corrections to released transcripts.
- `/Users/skipperkilian/Desktop/Podcast/Transcripts/<planned-date>--<slug>.txt`:
  private writing inbox, including unreleased letters. The publisher accepts a
  unique slug match even when the planned date differs from RSS. It leaves the
  original filenames alone and refuses ambiguous matches. Do not copy unreleased
  letters into this public website repository.
- `scripts/podcast-episode-data.mjs`: curated editorial profiles, keyed by slug.
- `podcast/<slug>.html`: published pages. Ordinary runs only create missing pages;
  they do not rewrite existing episode pages.
- `scripts/update-podcast-from-rss.mjs`: feed retrieval, preflight, and generation.
- `scripts/test-podcast-publishing.mjs`: isolated regression checks.

`PODCAST_TRANSCRIPT_DIR` can override the private writing inbox for another machine
or tests. Released transcripts in the repository take precedence.

## Publishing run

1. Inspect local changes. Fetch origin before generating. Prefer a clean worktree
   based on current `origin/main` if the main checkout has unrelated work. If the
   Desktop repository is offloaded to iCloud and reads stall, use a separate clone
   outside Desktop (for example under `~/.codex/workspaces`). Do not overwrite or
   reset local work to recover it. Read this file from the current checkout.
2. Run `node scripts/update-podcast-from-rss.mjs --check`. It fetches a fresh feed
   with a unique query and no-cache headers, sorts by publication date, excludes
   future items, and reports all unpublished episodes and prerequisites as JSON.
   `--check` is diagnostic: inspect `problems`, not just its exit status. A stale or
   truncated feed that omits a published page stops the run. Retry a fresh fetch;
   never bypass archive protection. With no unpublished episodes, change nothing.
3. Read each unpublished episode's entire matching transcript. Confirm its topic
   against the RSS title and description. Do not infer actual release dates from
   filenames. Missing or ambiguous source material requires resolution; do not
   fabricate a transcript. A source must have at least 600 characters, five
   paragraphs, and the `Love, Claire` closing used by this series.
4. If editorial content is absent or incomplete, **write it from that transcript**.
   This is part of publishing, not a request for the user to fill a data structure.
   Supply a search title, meta description, question-led H1, direct answer,
   accurate sections and FAQs, existing related guide and live episode slugs, and
   an appropriate grovio CTA. Preserve Claire's meaning. Do not invent anecdotes,
   promise results, turn her personal account into universal advice, or use generic
   fallback content. See existing profiles for the schema. New related episodes
   may be included when they are part of the same validated publication batch.
5. Run `node scripts/update-podcast-from-rss.mjs --dry-run`, then
   `node scripts/update-podcast-from-rss.mjs`. To validate and publish one exact RSS
   snapshot, pass `--rss-file=/absolute/path/feed.xml` to both commands after
   fetching that snapshot with a cache-busting query. All episodes are validated
   and every output is prepared before the first write. A normal unchanged run
   writes nothing. `--refresh` explicitly regenerates existing pages; use only for
   an intentional correction and review every resulting page.
6. Verify the new pages' complete transcript, visible original title, question H1,
   direct answer, Claire attribution, canonical/social tags, RSS date/duration,
   audio player, PodcastEpisode/BreadcrumbList data, internal links and analytics.
   Check all earlier hub entries remain and the newest is first; the hub must have
   PodcastSeries/BreadcrumbList data. Verify `sitemap.xml`, `llms.txt`, and the
   Instagram card in `links/index.html`. The card links directly to the newest
   episode and says `Listen to the latest letter, <title>`.
7. Run `node --test scripts/test-podcast-publishing.mjs` after publisher changes and
   `git diff --check`. Stage only reviewed podcast files, released transcripts,
   intentional editorial/publisher/test changes, and publishing documentation.
   Fetch origin again, carefully integrate real conflicts, commit and push main.
   Do not broadly stage or stash unrelated work.
8. Wait for deployment. Verify HTTP 200 for each added episode, the live hub's
   ordering and retained archive, the newest URL in live `llms.txt` and sitemap,
   and the live `/links` card. Report success only after production verification.
   If publishing from an isolated checkout, fast-forward the original checkout
   only when Git can preserve its local work; otherwise report the divergence.

## Known release reconciliation

The September 15, 2026 RSS release is `i-tried-to-recreate-school-at-home`; its
writing filename is dated September 22. The September 22 RSS release is
`what-i-was-actually-buying`; its writing filename is dated September 29. These
are intentional slug matches, not missing transcripts. `the-planner-graveyard`
is not in the RSS as of September 25; leave it unpublished until it actually is.
