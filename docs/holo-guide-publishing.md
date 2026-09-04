# Holo Guide Publishing

## What this does

Holo remains the drafting calendar and review space. Claire reviews and approves a post in Holo; then Holo sends the approved article to this repository. A GitHub Action creates or updates a full, static page at `/guide/{slug}`, refreshes the "Latest from the Guide" section, updates the sitemap, and Vercel deploys it.

Every public Holo article is branded as part of the grovio Guide and includes `Written by Claire`, a real reviewed-and-updated date, article and breadcrumb structured data, a canonical `/guide/{slug}` URL, site navigation, related reading, and a restrained download CTA.

The incoming Holo JSON is stored under `.github/holo-guide/`. Vercel does not serve that directory, so it is not a duplicate public article.

## One-time setup

1. Create a fine-grained GitHub token for the `Skipperinvestmentsllc/grovio-website` repository with **Contents: Read and write** permission. Do not use a broad, long-lived classic token.
2. In Vercel, add these Production environment variables for the `grovio` project:

   | Name | Value |
   | --- | --- |
   | `GITHUB_CONTENTS_TOKEN` | The fine-grained GitHub token from step 1. |
   | `GITHUB_REPOSITORY` | `Skipperinvestmentsllc/grovio-website` |
   | `GITHUB_BRANCH` | `main` |
   | `SITE_ORIGIN` | `https://grovioapp.com` |
   | `HOLO_BRAND_ID` | `d5c93ede-f885-4283-b775-00e293fc6a88` |

3. Deploy this code to Vercel before connecting Holo.
4. In Holo, open **Brand DNA -> Integrations -> SEO publishing -> Webhook**. Choose **HMAC signature** and enter:

   ```text
   https://grovioapp.com/api/holo-seo-webhook
   ```

5. After Holo creates the connection, copy its signing secret immediately. Add it in Vercel as the Production variable `HOLO_WEBHOOK_SECRET`, then redeploy so the endpoint can verify Holo's signature.
6. Return to Holo and use **Send test**. It should receive a `200` response.

Never paste either secret into a Guide article, source file, issue, or chat.

## Publishing checklist

Before Claire approves a Holo article:

1. Rewrite it until it sounds like Claire and adds something real beyond a search answer.
2. Verify every product claim against the current app.
3. Verify state, legal, compliance, health, or academic claims against primary sources. Add links and an accurate-as-of date where the topic needs them.
4. Remove universal claims when the answer depends on a family or state.
5. Confirm the title, description, slug, and any feature image are accurate.

After approval, no copy-and-paste is needed. Holo sends the approved article to the webhook, the webhook commits the private source payload to GitHub, GitHub Actions builds the static Guide page and updates `/guide/` and `sitemap.xml`, and Vercel deploys the commit.

The Holo dashboard receives the final canonical Guide URL in the webhook response. For an update, edit and republish the same Holo article. Its stable slug updates the existing Guide page rather than creating another URL.

## Troubleshooting

- **Holo test returns 401:** The `HOLO_WEBHOOK_SECRET` in Vercel does not match the Holo connection. Rotate the Holo secret, update Vercel, redeploy, and test.
- **Holo test returns 503:** One or both required Vercel environment variables are missing.
- **Holo reports a 5xx:** Check the Vercel function log and the GitHub token's repository and Contents permissions. Holo retries transient failures.
- **The source payload commits but no page appears:** Open the GitHub Action named `Publish approved Holo Guide articles`; its build error will name the invalid article field.
