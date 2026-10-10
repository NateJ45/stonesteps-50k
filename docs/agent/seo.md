# SEO

> BaseLayout foundation, JSON-LD schemas, robots.txt, llms.txt, sitemap, OG generation, and pre-launch checklist.

## SEO

### Foundation (BaseLayout, every page)

- `<title>` -- unique per page, 50-60 characters, brand name as suffix ("Services -- Studio Starter"). Pulled from the page singleton's `seoTitle` field, falls back to the page's primary headline.
- `<meta name="description">` -- unique per page, 150-160 characters, written as a sentence a human would click. Pulled from `seoDescription`. No marketing puffery; match the on-page voice.
- `<link rel="canonical">` -- absolute URL computed from `Astro.url.pathname` + `site.domain`. Prevents a workers.dev URL or staging domain from competing with the production domain once DNS cuts over.
- Open Graph + Twitter meta -- set in BaseLayout. The OG image resolves in priority order: (1) the `ogImage` prop a page passes (detail pages pass their real hero/cover photo, served from cdn.sanity.io); (2) the page singleton's `seoImage` field -- a per-page override set in the page's SEO section in Studio; (3) `siteSettings.seoImage` -- the site-wide default social image; (4) the auto-generated branded card at `/og/<route>.png` (from `npm run og:pages`); (5) `og-default.png`. Sanity images (2 and 3) run through `urlFor().width(1200).height(630).fit('crop')` via the `ogUrlFromImage` helper. BaseLayout also emits `og:locale`, `og:image:alt`, and a theme-aware `theme-color`.
- `<html lang="en">`. Update this if the site ships in another language.

**OG regeneration is a per-project step.** The `og-default.png` committed in the starter is a placeholder. Run `npm run og` after updating the brand inputs in `scripts/generate-og-default.mjs` (brand colors, tagline, wordmark) to regenerate it for the actual project.

**llms.txt regeneration is also per-project.** `public/llms.txt` ships as an AI/LLM crawler index for the core routes. Update it when pages are added or removed, and review it before launch to make sure it describes the actual project.

### JSON-LD schemas (via `StructuredData.astro`)

Every page receives a relevant structured data block via the `schemas` prop on BaseLayout. The site-wide LocalBusiness schema renders on every page; per-page schemas add to it.

**Site-wide LocalBusiness (configure per project):**

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/#business",
  "name": "Your Business Name",
  "url": "https://example.com",
  "image": "https://example.com/og-default.png",
  "telephone": "+1-XXX-XXX-XXXX",
  "email": "hello@example.com",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Your City",
    "addressRegion": "ST",
    "addressCountry": "US"
  },
  "priceRange": "$$",
  "sameAs": []
}
```

Source the values from `siteSettings`. The `address`, `telephone`, and any Google Business Profile data MUST match exactly -- Google compares them for NAP (Name/Address/Phone) consistency, and a mismatch hurts local ranking.

**Per-page schemas to consider:**

- `/services` -- array of `Service` schemas, one per active `service` document, each with `provider` referencing the LocalBusiness `@id`.
- `/faq` -- `FAQPage` schema with each Q/A as `Question` and `acceptedAnswer`.
- Every internal page -- `BreadcrumbList` from `/` to the current page.

Test every schema with Google's Rich Results Test (https://search.google.com/test/rich-results) before launch. Errors at scale will suppress rich results without loud failures.

### Trailing slashes (every internal link ends in `/`)

`astro.config.mjs` sets `trailingSlash: 'always'`. Canonicals and the sitemap use the slash form (`/course/`), and the host answers a slash-less page address with a redirect, so every internal page link is written with the slash too (otherwise Search Console reports "Page with redirect"). Hand-written paths carry the slash; anything that comes from Sanity (nav and footer links, CTA blocks, rich-text links, the announcement bar, `/journal/<slug>` queries) goes through `withSlash()` in `src/lib/links.ts`, which leaves external URLs, `#anchors`, `mailto:`/`tel:` and file paths (`.pdf`, `.xml`, images) alone. GET calls to our own routes use the slash form (`/api/forecast/?date=`, `/preview/live/`); the shared PORTABLE files (`contact-transport.ts`, `shareDraftLink.tsx`) keep slash-less API URLs, which is fine because Astro answers a slash-less POST with a 308 that keeps method and body (verified with `wrangler dev`). Proof after a build: grep `dist/client` for `href="/..."` values that end without `/` and have no file extension; the count must be 0.

### Sitemap and robots

`@astrojs/sitemap` generates `sitemap-index.xml` + `sitemap-0.xml` automatically from every prerendered page on `astro build`. The default `<priority>` and `<changefreq>` values are fine for a marketing site of this size.

`robots.txt` is generated at build time by `src/pages/robots.txt.ts`. It reads the production URL from `src/data/site.ts` and writes:

```
User-agent: *
Allow: /

Sitemap: <site.url>/sitemap-index.xml
```

There is no static `public/robots.txt`. The generated endpoint ensures the sitemap URL is always the correct production domain as long as `site.ts` `url` is set correctly -- no manual file editing needed.

`public/llms.txt` also ships -- an AI/LLM crawler index of the site for tools that follow the emerging llms.txt convention. Keep it updated if major pages are added or removed.

**Stone Steps: `public/llms.txt` and `public/llms-full.txt` are hand-maintained (2026-10-03).** Both were rewritten by hand from the live site pages, because the starter text (an interior-design studio with example.com links and a consultation price) was false for a trail-run site. Do NOT run `npm run llms:full` here: the marked starter script `scripts/generate-llms-full.mjs` reads starter content types (services, process, portfolio, journal, guides) that a race site does not have, so it would overwrite the file with a stub (starter card 81 fixed its site name and URL, not its content types). When race details change (date, fees, start times, entry caps, records, results years), edit both files by hand against the live pages, and keep every fact sourced from a page or repo file. Never put a price or time in them that the live site does not state. **Privacy:** `llms-full.txt` names winners and record holders, and the privacy page promises removal on request (email the race director with the name and year). When someone is removed from the results pages, also remove their name and time from `public/llms-full.txt` in the same change, or the file keeps publishing what the site has taken down.

After DNS cutover, submit `sitemap-index.xml` to Google Search Console. Verify the property via DNS TXT record (preferred -- survives redeploys) or HTML file upload.

### Title and description rules

- Every Sanity page singleton has `seoTitle` and `seoDescription` fields. They MUST be unique across pages.
- Title: target 50-60 characters. Front-load the keyword (location or service).
- Description: target 150-160 characters. Speak to the reader, not the search engine. Don't restate the title.
- If `seoTitle` is empty, BaseLayout falls back to the page's primary headline. Don't rely on the fallback for launch -- fill the field.

### The "Search & sharing" panel on a custom page (PORTS.md card 21)

The `page` document type builds its SEO group through `seoFields()` in
`src/sanity/schemaTypes/_seoFields.ts`. The page's own `seoTitle`, `seoDescription`, and
`seoImage` definitions are passed back in by REFERENCE, so their names and wording are
unchanged; the helper adds two things:

- `seoPreview` -- a value-less field whose custom input (`src/sanity/components/SeoSnippetInput.tsx`)
  draws a live Google result and a live share card as the editor types. It is an INPUT and
  must never be re-registered as a document VIEW: a view mounted inside the Presentation
  tool has no `FormValueProvider`, so `useFormValue` throws and freezes the panel.
- `hideFromSearch` -- "Keep this page out of Google". **Two halves, and both are required**,
  or the switch silently does nothing: `src/pages/[slug].astro` passes `noindex` to
  BaseLayout (which emits `<meta name="robots" content="noindex, follow">`), and the
  `sitemap()` filter in `astro.config.mjs` drops the same path using a build-time query.

Page singletons do NOT have `hideFromSearch` yet, on purpose -- nothing on their routes
reads it. Adding it means doing both halves for that page in the same change.

### Redirects when a page is renamed (PORTS.md card 22)

Changing a page's web address files an old-path -> new-path `redirect` document
automatically at publish time (`src/sanity/components/slugRedirect.tsx`). Published
redirects are read at build time in `astro.config.mjs` and folded into Astro's `redirects`
map, which the Cloudflare adapter emits as real 301/302s. The editor can also add one by
hand under Pages -> Redirects for an address that never existed on this site. The path
normalization rules are shared with the build and unit-tested in `src/lib/redirects.ts`.

**Old WordPress addresses** are hand-written in `src/lib/launch-redirects.ts` (spread into the
redirects map before the Studio ones, so an editor can still override one). Today:
`/all-time-records` -> `/records/`, `/the-course` -> `/course/`, `/dev/wordpress/course` -> `/course/`,
`/registered-runners` -> `/results/`, all 301. Destinations keep the trailing slash on purpose: the host answers a slash-less page
address with a 307 to the slash form, so pointing straight at it saves a hop (301 then 307 then 200
becomes 301 then 200). Add one only with evidence the old address is in use (Wayback Machine CDX index for
whether it existed, GA4 landing pages for whether anyone arrives on it); the last three were added
on 2026-10-05 (September GA4 showed 12 visitors landing on the 404 page on the first two; `/registered-runners`
had 3 landings and 200 Wayback captures, and Nathan chose `/results/` as its destination). A unit test
(`launch-redirects.test.ts`) pins all four so none can be dropped by accident.

An **archived** page is not built at all, so its URL 404s, it drops out of the menus, and
it never reaches the sitemap.

### Image SEO

For Sanity-uploaded images, the alt text field does double duty: accessibility (required) and image search signal. Good alt text describes the image AND uses relevant terms where natural. Descriptive alt beats empty alt; meaningful descriptive alt beats generic.

See the [Image guidelines for editors](images.md#image-guidelines-for-editors) section for filename, format, and color profile rules.

### Pre-launch SEO checklist

- [ ] Every page has unique `seoTitle` and `seoDescription` in Sanity
- [ ] No page is left with "Keep this page out of Google" on by mistake (check Pages, then each custom page's Search & sharing tab)
- [ ] `og-default.png` regenerated with the actual project brand inputs
- [ ] `src/data/site.ts` `url` set to the production domain (robots.txt is generated from this automatically)
- [ ] `llms.txt` updated for the actual page set
- [ ] LocalBusiness JSON-LD validates in Google Rich Results Test
- [ ] FAQPage JSON-LD validates (if `/faq` is included)
- [ ] Service schemas validate (if per-service schemas are wired)
- [ ] BreadcrumbList present on every internal page
- [ ] OG previews look right in Slack, iMessage, or a social debugger (verify with opengraph.xyz or similar)
- [ ] All Sanity image alt text is meaningful (no "image1" placeholders, no empty strings)
- [ ] Sitemap submitted to Google Search Console
- [ ] Canonical URL points at the production domain on every page
