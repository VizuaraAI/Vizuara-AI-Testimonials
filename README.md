# Vizuara AI Testimonials

Static testimonial website for Vizuara AI reviews.

Production URL:

https://vizuara-reviews.vercel.app

## Files

- `index.html`, `styles.css`, `script.js` - static website
- `reviews-data.js` - generated testimonial data consumed by the website
- `scripts/sync-senja.mjs` - pulls testimonials from the Senja API, applies public-site filters, and regenerates `reviews-data.js`
- `.github/workflows/sync-senja.yml` - scheduled sync every 6 hours plus Vercel deploy
- `config/known-testimonials.json` - curated course labels for existing testimonials whose Senja text does not explicitly name the course

## Required GitHub Secrets

- `SENJA_API_KEY` - Senja API key
- `VERCEL_TOKEN` - Vercel token with access to `rajatdandekars-projects/vizuara-reviews`

## Local Sync

Create `env.local` with the Senja API key, then run:

```bash
npm run sync:senja
```

Do not commit `env.local`.

## Filtering Rules

The sync excludes internal/self-testimonials, Prakash Srinivasan, VIDESH/SOP/resume/admissions-prep testimonials, AI High School Researcher videos, application-related videos, and video rows without a confident AI/ML program signal.
