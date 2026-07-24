# Grovio Search Readiness

## Bing Webmaster Tools

Submit the sitemap in Bing Webmaster Tools:

```text
https://grovioapp.com/sitemap.xml
```

After deployment, use Bing URL Inspection for:

```text
https://grovioapp.com/
https://grovioapp.com/guide/
```

## IndexNow

IndexNow key:

```text
a5935757debc434a81a6fb366c2dbe35
```

Key location:

```text
https://grovioapp.com/a5935757debc434a81a6fb366c2dbe35.txt
```

Submit changed URLs after a deployment:

```bash
curl "https://api.indexnow.org/indexnow?url=https://grovioapp.com/&key=a5935757debc434a81a6fb366c2dbe35"
curl "https://api.indexnow.org/indexnow?url=https://grovioapp.com/guide/&key=a5935757debc434a81a6fb366c2dbe35"
```

For larger batches, use the JSON API described by IndexNow and include only canonical public URLs from `sitemap.xml`.

## Crawler Notes

`robots.txt` explicitly allows Googlebot, Bingbot, and OAI-SearchBot while keeping `/assets/social/` blocked. Pinterest funnel pages under `/p/` remain noindexed by meta tag and Vercel header.
