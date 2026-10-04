# Routes and modules (moved from CLAUDE.md)

Read when adding or changing a route, a custom page, or enabling an opt-in module.

Core routes that ship with the starter (always on, not toggleable):

| Path                 | Source                              | Notes                                                                                                                    |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `/`                  | `src/pages/index.astro`             | Home -- section-driven via `pageBuilder` + `SectionRenderer`                                                             |
| `/about`             | `src/pages/about.astro`             | About -- section-driven via `pageBuilder` + `SectionRenderer`                                                            |
| `/services`          | `src/pages/services.astro`          | Services -- section-driven via `pageBuilder` + `SectionRenderer`                                                         |
| `/process`           | `src/pages/process.astro`           | Process -- section-driven via `pageBuilder` + `SectionRenderer` (graduated from module into core)                        |
| `/[slug]`            | `src/pages/[slug].astro`            | Custom pages created in the Studio; reserved slugs are filtered inside `getStaticPaths` (see `src/lib/reservedSlugs.ts`) |
| `/faq`               | `src/pages/faq.astro`               | FAQ page + faqItem collection grouped by category                                                                        |
| `/contact`           | `src/pages/contact.astro`           | Contact page + Web3Forms form + Calendly embed                                                                           |
| `/journal`           | `src/pages/journal/index.astro`     | Post grid with category chips                                                                                            |
| `/journal/[slug]`    | `src/pages/journal/[slug].astro`    | Post detail: reading progress + header + cover + body + related                                                          |
| `/privacy`           | `src/pages/privacy.astro`           | Privacy policy from singleton, with static fallback when doc is absent                                                   |
| `/journal/rss.xml`   | `src/pages/journal/rss.xml.ts`      | Journal RSS feed                                                                                                         |
| `/studio`            | `@sanity/astro` (mounted)           | The embedded Sanity Studio                                                                                               |
| `/preview/**`        | `src/pages/preview/[...slug].astro` | SSR draft preview for the Studio's Presentation tool. noindex, sitemap-excluded                                          |
| `/preview/live`      | `src/pages/preview/live.ts`         | SSE proxy for preview auto-refresh (403 without the Studio cookie)                                                       |
| `/api/draft-mode/*`  | `src/pages/api/draft-mode/`         | Turns draft mode on/off for the preview                                                                                  |
| `/api/forecast`      | `src/pages/api/forecast.ts`         | Race-week forecast: Worker fetches Open-Meteo, cached 1 h; `?date=` must be today to +15 days                            |
| `/robots.txt`        | `src/pages/robots.txt.ts`           | Generated; reads production URL from `site.ts`                                                                           |
| `/sitemap-index.xml` | `@astrojs/sitemap` (auto)           | Production sitemap                                                                                                       |
| `/404`               | `src/pages/404.astro`               | Custom 404                                                                                                               |

The section-driven pages (home/about/services/process) render whichever `pageBuilder` array Sanity provides. If the array is absent (fresh clone, no Sanity project), the route falls back to code-defined defaults in `src/data/defaultSections.ts`, so the site is never blank.

Additional routes come from opt-in modules staged under `modules/` (OFF by default). Each module is documented under `docs/modules/`. There are 13 modules: `portfolio`, `shop`, `virtual-services`, `gift-certificates`, `press`, `resources`, `lead-magnets`, `newsletter`, `style-quiz`, `budget-calculator`, `events`, `donations`, `team`.
