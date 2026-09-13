// Foundation, edit with care
// =============================================================================
// What every share card is made of
// =============================================================================
// The cards are COMMITTED PNGs, rendered by hand with `npm run og:pages`. That
// keeps a browser out of the deploy path, and it means the pictures can fall
// behind the content with nothing to say so: change a page's SEO title in the
// Studio and its card keeps the old headline, forever, silently. The only
// person who would ever notice is whoever pastes the link into Facebook.
//
// So the INPUTS live here, in one place, and two callers share them:
//
//   generate-og-pages.mjs  renders each card and records what it rendered from
//   check-og-fresh.mjs     re-derives them and fails when the record disagrees
//
// The point of the shared module is that the check cannot drift from the thing
// it is checking. If these two derived their headlines separately, the check
// would eventually be testing its own copy of the logic rather than the
// generator's, which is the failure mode it exists to prevent.
//
// Deriving the inputs is CHEAP: four GROQ reads and some string work, no
// browser, no rendering. That is what makes the check affordable on every CI
// run. Reads are anonymous, verified 2026-09-13 against this dataset: pages,
// years, the home singleton and the race singleton all come back without a
// token, so CI needs only PUBLIC_SANITY_PROJECT_ID.
// =============================================================================

/**
 * An seoTitle is written for a browser TAB, so it usually ends in the site
 * name: "The course | Stone Steps 50K". The card already carries the race's
 * painted mark, so leaving that on spends the largest type on the card saying
 * what the logo directly above it just said.
 */
export const SITE_SUFFIX = /\s*[|·–—-]\s*Stone Steps 50K\s*$/i;

export const headlineFor = (title) => String(title).replace(SITE_SUFFIX, '').trim();

/**
 * The small line under every headline.
 *
 * NO DATE HERE, AND THAT IS THE DECISION. It carried "· 25 October 2026" for
 * about an hour on 2026-09-13. A baked date is wrong the moment the race date
 * changes in the Studio, not merely when the day passes, and nothing
 * regenerates these on a publish: a deploy runs typegen, tests, build and
 * wrangler. So the site would have said one date and all twenty-eight cards
 * another, with no signal. Regenerating in CI instead would put a 120MB
 * Chromium download in the deploy path of a workflow that now fires on every
 * content publish, which is a steep price for a line nobody clicks for. The
 * site itself states the date in three places on the home page alone; a share
 * card's job is to make someone click, not to brief them.
 */
export function strapFor(race) {
  const where = [race?.venue, race?.city].filter(Boolean).join(', ');
  return where || 'Mt. Airy Forest, Cincinnati';
}

/**
 * Every card the site ships, with the exact strings it is drawn from, in the
 * order they are rendered.
 *
 * `runners/<slug>` is deliberately absent: there are more than twelve hundred
 * of them and they fall back to og-default.png, which is the right trade.
 *
 * @param {import('@sanity/client').SanityClient} client
 * @returns {Promise<Array<{ slug: string, headline: string, strap: string }>>}
 */
export async function collectOgInputs(client) {
  const [home, race, pages, years] = await Promise.all([
    client.fetch(`*[_type == "homePage"][0]{ seoTitle }`).catch(() => null),
    client.fetch(`*[_type == "race"][0]{ name, venue, city }`).catch(() => null),
    client
      .fetch(
        `*[_type == "page" && defined(slug.current)]{ "slug": slug.current, seoTitle, title } | order(slug asc)`,
      )
      .catch(() => []),
    client.fetch(`array::unique(*[_type == "raceResult"].year) | order(@ desc)`).catch(() => []),
  ]);

  const strap = strapFor(race);
  const rows = [];
  const add = (slug, title) => rows.push({ slug, headline: headlineFor(title), strap });

  add('home', home?.seoTitle || "Cincinnati's longest running ultra marathon");
  for (const p of pages ?? []) add(p.slug, p.seoTitle || p.title || p.slug);
  add('results', `Every ${race?.name ?? 'Stone Steps'} result on file`);
  for (const year of years ?? []) {
    if (typeof year !== 'number') continue;
    add(`results-${year}`, `${year} results`);
  }

  return rows;
}
