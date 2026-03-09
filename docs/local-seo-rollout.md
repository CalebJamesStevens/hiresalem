# HireSalem local SEO rollout

## Search platforms

- Verify `https://hiresalem.com` in Google Search Console.
- Verify `https://hiresalem.com` in Bing Webmaster Tools.
- Submit `/sitemap.xml` after each major content release.
- Configure the Google Indexing API for live `/jobs/[slug]` pages so new and removed job postings are pushed directly to Google.
- Inspect representative URLs:
  - `/`
  - `/jobs`
  - `/jobs/salem`
  - `/jobs/salem/healthcare`
  - one live job detail page
  - one company page with active jobs
  - one resource article

## Local entity setup

- Publish or update the Google Business Profile only if HireSalem has a legitimate business presence.
- Keep the business name, primary URL, and public description aligned with on-site branding.
- Keep NAP data consistent across reputable local citations.

## Content and link earning

- Prioritize outreach to Salem and mid-valley business groups, workforce organizations, colleges, chambers, and local publications.
- Collect legitimate employer testimonials that can be published on-site later.
- Revisit landing pages with low listing volume and keep only pages with durable value.

## Monitoring

- Track clicks, impressions, and indexed pages by route group:
  - home
  - `/jobs`
  - landing pages
  - job detail pages
  - company pages
  - resource articles
- Watch for duplicate-title or duplicate-description warnings after launch.
- Re-run rich results validation for live job pages after schema changes.
- Monitor `/api/cron/job-expirations` so expired listings stop appearing as live URLs and are reported back to Google promptly.
