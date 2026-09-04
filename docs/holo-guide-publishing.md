# Holo Guide Publishing

## What this does

Holo remains the drafting calendar and review space. Claire reviews and approves a post in Holo; then the scheduled GitHub Action reads Holo's official public publishing feed, creates or updates a full, static page at `/guide/{slug}`, refreshes the "Latest from the Guide" section, updates the sitemap, and Vercel deploys it.

Every public Holo article is branded as part of the grovio Guide and includes `Written by Claire`, a real reviewed-and-updated date, article and breadcrumb structured data, a canonical `/guide/{slug}` URL, site navigation, related reading, and a restrained download CTA.

The feed snapshots are stored under `.github/holo-guide/`. Vercel does not serve that directory, so it is not a duplicate public article.

## One-time setup

No Vercel environment variables, API tokens, or inbound webhook connection are needed. Holo's current Custom integration publishes approved article data to its public feed; the GitHub workflow reads only that feed every two hours, at 17 minutes past the even-numbered hour, and commits static Guide pages only when Holo has something new or updated.

To run it immediately after an approved article is available, open **GitHub -> Actions -> Sync approved Holo Guide articles -> Run workflow**. Otherwise, leave it alone and the next scheduled check will handle it.

## Publishing checklist

Before Claire approves a Holo article:

1. Rewrite it until it sounds like Claire and adds something real beyond a search answer.
2. Verify every product claim against the current app.
3. Verify state, legal, compliance, health, or academic claims against primary sources. Add links and an accurate-as-of date where the topic needs them.
4. Remove universal claims when the answer depends on a family or state.
5. Confirm the title, description, slug, and any feature image are accurate.

After approval, no copy-and-paste is needed. The next GitHub sync reads Holo's approved publishing feed, stores the source snapshot privately in the repository, builds the static Guide page, updates `/guide/` and `sitemap.xml`, and Vercel deploys the commit.

For an update, edit and republish the same Holo article. Its stable slug updates the existing Guide page rather than creating another URL.

## Troubleshooting

- **A post has not appeared after two hours:** Open the GitHub Action named `Sync approved Holo Guide articles`, select **Run workflow**, and check its log for the article title or a feed error.
- **The sync finds no articles:** Confirm the post is approved/published in Holo rather than only drafted or scheduled.
- **A source snapshot commits but no page appears:** The Action build log will name the missing or invalid article field.
