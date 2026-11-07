# Deployment

> How the site deploys (GitHub Actions to Cloudflare Workers), the Sanity -> live-site rebuild model, environment variables, security headers, and privacy/analytics.

## Deployment

- Production: a push to `main` runs `.github/workflows/deploy.yml` (GitHub Actions), which builds and runs `wrangler deploy -c dist/server/wrangler.json` to the Worker that serves your production domain. Cloudflare's own git build is not connected.
- Previews: none. Only `main` deploys; other branches get CI checks only.
- Build command: `npm run build`. Output directory: `dist`.
- `output: 'static'` in `astro.config.mjs` prerenders every page to HTML at build time. The `@astrojs/cloudflare` adapter stays installed so individual pages can opt into server rendering later via `export const prerender = false` in that page's frontmatter, but for a content-rich marketing site it's effectively inert.

### Cloudflare Workers vs Pages note

As of early 2026, Cloudflare merged Pages into Workers. Pages is in maintenance mode; Workers gets all new investment. New Astro projects should use Workers via the `@astrojs/cloudflare` adapter and `wrangler deploy`.

### Sanity -> live site rebuild model (READ THIS BEFORE CHANGING CONTENT EXPECTATIONS)

The site is `output: 'static'` -- every page is **pre-rendered to HTML at build time, not fetched at runtime**. Practical implication: when an editor edits a field in Sanity and clicks Publish, **the change does NOT appear on the live site until the site rebuilds**. The Sanity dataset updates instantly, but the live HTML is whatever was generated at the last build.

There are two ways the site rebuilds:

1. **`git push origin main`** -- `deploy.yml` builds and deploys -- site updates in a few minutes.
2. **`repository_dispatch` of type `sanity-publish`** -- the Sanity webhook POSTs to GitHub, which starts the same workflow. `gh workflow run deploy.yml` does it by hand.

Without a webhook, every Sanity edit waits until the next code push. That's not a sustainable editor experience.

**Recommended GROQ filter (deny-list):** apply this at manage.sanity.io -> API -> Webhooks -> "Rebuild live site". It skips draft saves and internal Sanity asset-management events, and covers new content types automatically:

```
!(_id in path("drafts.**")) && !(_type in ["media.tag", "sanity.imageAsset", "sanity.fileAsset", "sanity.assetSourceData"])
```

The old allow-list approach (listing every `_type` that should trigger a rebuild) silently dropped new types until a developer remembered to add them. The deny-list is safer. See OPERATIONS.md for the full note.

**The setup pattern (for reference / if it ever needs to be re-created):**

1. **Create a GitHub token** (fine-grained, this repo only, Contents: Read and write) and keep it in the password manager. The webhook sends it as `Authorization: Bearer <token>`.

2. **Create the Sanity webhook** at manage.sanity.io -> project -> API -> Webhooks. Name it `Rebuild live site`, dataset `production`, trigger on Create + Update + Delete, HTTP method POST, URL `https://api.github.com/repos/<owner>/<repo>/dispatches`, projection `{"event_type": "sanity-publish"}`, the `Authorization` header above plus `Accept: application/vnd.github+json`. Apply the deny-list GROQ filter above.

3. **Test:** edit a Sanity singleton field -> publish -> watch GitHub Actions: a Deploy run with the `repository_dispatch` event starts within seconds -> live in a few minutes.

**Trade-offs to know:**

- Every publish triggers a full ~45 second build. Reasonable for a marketing site. If the editor batch-edits many records, save the publish click until the end to consolidate builds.
- There's always a 1-3 minute delay between publish and live render. Acceptable for a marketing site; would NOT be for breaking news.
- Deploy runs queue (one `deploy-production` group) rather than cancel each other, so a burst of publishes is safe.
- If near-instant updates are ever needed, the alternative is Incremental Static Regeneration or runtime-fetching from Sanity for specific pages. Both are larger architecture changes; the webhook is the right answer for most marketing sites.

### Video files and iPhones (card 222)

Cloudflare's asset store ignores `Range`, and Safari on an iPhone expects a 206 for video. So `wrangler.jsonc` names `src/worker.ts` as `main` and sends `/*.mp4` and `/*.webm` to it first, and `src/lib/video-ranges.ts` answers with the requested bytes. Every other asset skips the Worker, and every other request goes to Astro's own `handle()`. To check a clip: `curl -s -o /dev/null -D - -H 'Range: bytes=0-1' <clip url>` says `206 Partial Content`. Test locally with `npm run preview` (workerd); other local servers handle ranges themselves and hide the bug.

### Environment variables

Build-time `PUBLIC_*` values are GitHub repo variables read by `deploy.yml`; Worker runtime secrets are set in Cloudflare -> **Workers & Pages -> your-project -> Settings -> Variables and Secrets**. All documented in `.env.example`; copy to `.env` and fill in real values for local dev.

- `PUBLIC_SANITY_PROJECT_ID` -- Sanity project ID from manage.sanity.io. When absent, `sanityFetch` returns fallback values and the build completes cleanly (empty-state mode).
- `PUBLIC_SANITY_DATASET` -- `production` (or your dataset name). Same graceful-empty behavior as above.
- `PUBLIC_SANITY_API_VERSION` -- pinned ISO date like `2026-05-01`. Bump deliberately.
- `SANITY_API_READ_TOKEN` -- only if any page needs to read draft content (typically not, since published content is publicly readable). Mark as Secret.
- `PUBLIC_WEB3FORMS_KEY` -- contact form access key from [web3forms.com](https://web3forms.com/). Without it the contact form falls back to a no-op action and shows an inline notice.
- `PUBLIC_CF_ANALYTICS_TOKEN` -- Cloudflare Web Analytics token. Without it the analytics beacon doesn't render.
- `PUBLIC_STUDIO_HELP_EMAIL` -- the Studio Ask card's email button. Repo variable read by `deploy.yml` (not committed). Without it the card shows its words with no button.
- `PUBLIC_CALENDLY_URL` -- optional. Booking link for the discovery call CTA.
- `PUBLIC_NEWSLETTER_FORM_ACTION` -- optional. Build-time override for the ESP form-action endpoint.

### Studio: deploy after schema changes

When you change a Sanity schema (`src/sanity/schemaTypes/**`), run `npm run typegen` and commit the regenerated types, then deploy the site. The Studio is embedded at `/studio` and ships with the site build, so deploying the site publishes the schema. There is no separate Studio deploy (and `npx sanity deploy` must NOT be run: it would create a standalone Studio that silently falls behind). Until the deploy lands, editors may see fields that don't match the current types, or miss newly added ones.

### Security headers

`public/_headers` ships with the deploy. Five site-wide headers Cloudflare applies to every route:

- `Strict-Transport-Security` (HSTS, one year, includeSubDomains)
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Cross-Origin-Opener-Policy: same-origin`

Content-Security-Policy is intentionally not included; doing it right requires testing against all third-party scripts in use (Sanity CDN, Web3Forms, Cloudflare Analytics, any embed). See `stack-and-config.md` for why the meta-CSP approach was abandoned.

### Privacy and analytics

The starter ships in an effectively zero-cookie posture. The current baseline:

- **Cloudflare Web Analytics** uses no cookies and stores no personal data.
- **Google Analytics 4 is OFF in the starter and ON on stonesteps50k.com** (set `PUBLIC_GA_ID`; it sets `_ga` cookies and `src/pages/privacy.astro` derives its copy from the same flag). It fires only on the site's own production hostname, so a local or `*.workers.dev` build never files a hit. Details: `docs/agent/analytics.md`.
- **No Facebook/Meta Pixel.** No ad-tracking or retargeting pixels by default. If you add one, design a full consent management platform in BEFORE adding the tracker -- don't bolt it on.
- **Sanity client** reads public published content, no auth cookies.
- **Web3Forms** contact-form submissions go server-side via `fetch`; no cookies set.

**`/privacy` page:** a real privacy policy page ships, driven by the `privacyPage` singleton in Sanity with a plain-voice static fallback. Linked from the footer on every page and from every capture form's consent note. Update this page to reflect your actual data practices before going live.
