# Vizuara AI Testimonials

Static testimonial website for Vizuara AI reviews.

Production URL:

https://vizuara-reviews.vercel.app

## Files

- `index.html`, `styles.css`, `script.js` - static website
- `api/reviews.js` - Vercel serverless endpoint that fetches live Senja data
- `reviews-data.js` - generated fallback testimonial data consumed when the live API is unavailable
- `scripts/sync-senja.mjs` - pulls testimonials from the Senja API, applies public-site filters, and regenerates `reviews-data.js`
- `.github/workflows/sync-senja.yml` - optional manual sync for the fallback data file
- `config/known-testimonials.json` - curated course labels for existing testimonials whose Senja text does not explicitly name the course

## Live Updates

Live updates are handled by Vercel through `/api/reviews`. The Vercel project must have this production environment variable:

- `SENJA_API_KEY`

The browser first fetches `/api/reviews`; if the API is unavailable, it falls back to the checked-in `reviews-data.js`.

## Optional GitHub Secrets

Only needed if manually running the GitHub fallback sync workflow:

- `SENJA_API_KEY`
- `VERCEL_TOKEN`

## Local Sync

Create `env.local` with the Senja API key, then run:

```bash
npm run sync:senja
```

Do not commit `env.local`.

## Filtering Rules

The sync excludes internal/self-testimonials, Prakash Srinivasan, VIDESH/SOP/resume/admissions-prep testimonials, AI High School Researcher videos, application-related videos, and video rows without a confident AI/ML program signal.
