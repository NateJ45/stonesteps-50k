// Studio Desk structure. Pins Site Settings at the top, then ALL page singletons
// (one document each) under "Pages", then the reusable content collections under
// "Content", then "Journal". Every document type is placed explicitly so nothing
// floats loose at the desk root. The trailing default-list filter is a safety net
// for any future type that hasn't been placed (and hides sanity-plugin-media's
// media.tag type, which would otherwise show at the root).
//
// "Pages" is one list (so the rule for editors is simple: every page lives here).
//
// Orderable lists: service / philosophyPoint use the orderable-document-list plugin.
// Editors drag rows to reorder; the plugin writes an `orderRank` string. GROQ
// queries order by orderRank (with displayOrder fallback) so the site mirrors Studio.
//
// Preview: 2026-08-28 the per-document iframe tab (sanity-plugin-iframe-pane)
// was retired in favour of the Presentation tool, which renders the SSR
// /preview/* routes with click-to-edit and in-canvas section controls. The
// singleton list items below therefore carry the plain form view, and
// "see it on the page" is the Presentation tool in the navbar.

import type { StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import {
  BellIcon,
  BlockElementIcon,
  CogIcon,
  ColorWheelIcon,
  HomeIcon,
  InfoOutlineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  DocumentsIcon,
  HeartIcon,
  ThListIcon,
  PinIcon,
  ArrowRightIcon,
  StarFilledIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ActivityIcon,
} from '@sanity/icons';
import { makeGuideView } from './components/GuideView';
import { guides, GUIDE_CATEGORIES } from './guides/content';
import { WelcomePane } from './components/WelcomePane';
import { CheckupTool } from './components/CheckupTool';
import { RaceYearTool } from './components/RaceYearTool';
import BrandKit from './components/BrandKit';

const SINGLETON_TYPES = [
  'siteSettings',
  'businessInfo',
  // Core pages
  'homePage',
  'aboutPage',
  'servicesPage',
  'processPage',
  'faqPage',
  'contactPage',
  'journalPage',
  'notFoundPage',
  'privacyPage',
  // The race's own singleton: date, venue, links, fee tiers.
  'race',
] as const;

const ORDERABLE_TYPES = [
  'service',
  'philosophyPoint',
  'processStep',
  // Race collections an editor reorders by dragging.
  'distance',
  'scheduleItem',
  'courseFeature',
  'sponsor',
] as const;

const HIDDEN_FROM_DEFAULT = new Set<string>([
  ...SINGLETON_TYPES,
  ...ORDERABLE_TYPES,
  'announcement', // placed explicitly under Content → Announcements
  'testimonial',
  'faqItem',
  'faqCategory',
  'journalEntry',
  'journalCategory',
  'page', // custom pages, placed explicitly under "Pages"
  'sectionPreset', // saved sections, placed explicitly under "Pages"
  'redirect', // placed explicitly under "Pages" -> Redirects
  // sanity-plugin-media registers this tag type; keep it out of the desk root
  // (the "Media" tool in the top sidebar is where tags belong).
  'media.tag',
  // processStep is placed explicitly under Content → Process Steps
  'processStep',
  // Race collections, all placed explicitly under "The Race" below.
  'athlete',
  'raceResult',
  'recordEntry',
]);

/**
 * Build a singleton list item pinned to one document id.
 *
 * The name is historical: it used to attach an iframe preview view alongside
 * the form. Since 2026-08-28 the live draft preview is the Presentation tool
 * (src/sanity/resolve.ts maps every one of these types to a /preview path), so
 * the editor pane is the form. Views are still set explicitly because
 * S.document().views([...]) bypasses defaultDocumentNode in sanity.config.ts,
 * and that is where the per-type extra tabs are added.
 */
function singletonWithPreview(S: StructureBuilder, schemaType: string, title: string, icon: any) {
  return (
    S.listItem()
      // THE ID IS THE DOCUMENT'S, NOT THE TITLE'S, and that is what makes every
      // "Take me there" button land on the form. With no explicit id Sanity
      // derives one from the title, so "Race day (date, times, fees)" became the
      // pane `raceDayDateTimesFees`, while an edit intent for the race document
      // looks for a pane called `race`. It found the parent list and stopped
      // there, which is why the guides opened the category rather than the
      // document (2026-09-12). Naming the pane after the document also means a
      // reworded title can no longer break a link.
      .id(schemaType)
      .title(title)
      .icon(icon)
      .child(S.document().schemaType(schemaType).documentId(schemaType).views([S.view.form()]))
  );
}

export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Stone Steps 50K')
    .items([
      // WELCOME — the landing screen. First, because the desk used to open on
      // nothing at all: a menu, and no indication of which entry answers the
      // question you arrived with. Ported from west-chester-preschool.
      S.listItem()
        .id('welcome')
        .title('Welcome')
        .icon(HomeIcon)
        .child(
          S.component(WelcomePane as never)
            .id('welcome-pane')
            .title('Welcome'),
        ),

      // CHECKUP and START A NEW RACE YEAR. Both read-only, both ported from
      // west-chester-preschool (HealthTool and SetupWizard). They sit here
      // rather than in the top toolbar on purpose: the toolbar already holds
      // Presentation, Media and Releases, and a tool nobody notices is a tool
      // nobody runs. This site is edited twice a year by one person, so the
      // things that tell him what needs doing belong where he already is.
      S.listItem()
        .id('checkup')
        .title('Checkup (what needs attention)')
        .icon(ActivityIcon)
        .child(
          S.component(CheckupTool as never)
            .id('checkup-pane')
            .title('Checkup'),
        ),

      S.listItem()
        .id('race-year')
        .title('Start a new race year')
        .icon(CalendarIcon)
        .child(
          S.component(RaceYearTool as never)
            .id('race-year-pane')
            .title('Start a new race year'),
        ),

      // BRAND COLOURS. Not a website job, which is exactly why it is here: the
      // flyer and the Facebook post are made somewhere else, and this is the
      // only place the race's actual values are written down in one list.
      S.listItem()
        .id('brand-kit')
        .title('Brand colours (for flyers and posts)')
        .icon(ColorWheelIcon)
        .child(
          S.component(BrandKit as never)
            .id('brand-kit-pane')
            .title('Brand colours'),
        ),

      S.divider(),

      // HELP & GUIDE — the handbook, kept high so it is always in reach.
      //
      // This replaced the starter's "Start Here" panes on 2026-09-07. Those were
      // written for a design studio ("Your business at a glance", "Brand kit",
      // "Grow your studio"), which means nothing to a race director, and all
      // three of their documents were never seeded for this project, so every
      // one of those panes opened empty.
      //
      // The pattern is ported from west-chester-preschool, where it was worked
      // out with a volunteer who had never used a CMS. The guides are DATA in
      // src/sanity/guides/content.ts, held in the repo rather than in Sanity so
      // they cannot be deleted by accident and the next person inherits them.
      S.listItem()
        .id('help-and-guide')
        .title('Help & Guide')
        .icon(InfoOutlineIcon)
        .child(
          S.list()
            .id('help-and-guide-list')
            .title('Help & Guide')
            .items(
              GUIDE_CATEGORIES.flatMap((category) => {
                const mine = guides.filter((g) => g.category === category);
                return mine.length === 0
                  ? []
                  : [
                      S.divider().title(category),
                      ...mine.map((g) =>
                        S.listItem()
                          .id(`guide-${g.slug}`)
                          .title(g.title)
                          .icon(() => g.icon)
                          .child(
                            S.component(makeGuideView(g.slug) as never)
                              .id(`guide-view-${g.slug}`)
                              .title(g.title),
                          ),
                      ),
                    ];
              }),
            ),
        ),

      S.divider(),

      // Site Settings — pinned singleton (no preview; not a page)
      singletonWithPreview(S, 'siteSettings', 'Site setup (menus, footer)', CogIcon),

      S.divider(),

      // THIS YEAR'S RACE. Everything that changes from one running to the next,
      // in one place, so preparing next year is one visit rather than a hunt.
      // Named for WHEN you touch it rather than for what it holds: "The Race"
      // was accurate and told a first-time editor nothing.
      //
      // Athletes and Results are listed but are not day-to-day editing surfaces:
      // both are written by scripts/import-results.mjs from the RunSignUp API.
      // They are here so a name can be corrected at its single source, which is
      // the whole reason results reference an athlete rather than repeating one.
      S.listItem()
        // EVERY PANE A TOOL LINKS TO NEEDS AN EXPLICIT ID. A list item with no
        // `.id()` gets a generated one, so `/structure/this-years-race` matched
        // nothing and the "Start a new race year" cards that pointed here were
        // dead links (2026-09-12). Change an id here and the targets in
        // RaceYearTool.tsx and guides/content.ts have to move with it.
        .id('this-years-race')
        .title("This year's race")
        .icon(ActivityIcon)
        .child(
          S.list()
            .title("This year's race")
            .items([
              singletonWithPreview(S, 'race', 'Race day (date, times, fees)', CalendarIcon),
              orderableDocumentListDeskItem({
                type: 'distance',
                title: 'Distances',
                icon: ArrowRightIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'scheduleItem',
                title: 'Race-day schedule',
                icon: ClockIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'courseFeature',
                title: 'Course features',
                icon: PinIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'sponsor',
                title: 'Sponsors',
                icon: HeartIcon,
                S,
                context,
              }),
              S.divider(),
              // Results, drilled down by year and then by distance.
              //
              // WHY THIS IS NOT A PLAIN documentTypeListItem. There are 1,961
              // result documents across 22 runnings. Sanity's default list is
              // virtualised so it does not fall over, but it is one infinite
              // scroll with no structure: finding the 2011 field means
              // scrolling past a decade, and the ordering options can only sort
              // the whole archive at once. Splitting on year turns that into 22
              // lists, each of which is one race.
              //
              // AND THEN ON DISTANCE, because a year holds two separate races.
              // Ordering a mixed year by time interleaves them and puts a fast
              // 27K above a slow 50K, which reads as a results table that has
              // gone wrong. Sorting the list on the distance REFERENCE was the
              // first attempt and the Studio rejects it: `distance._ref` is a
              // valid GROQ sort but not a schema field path, and the pane fails
              // with "Could not fetch list items". A second level is clearer
              // than a clever sort would have been anyway.
              //
              // Both levels are QUERIED, not hardcoded, so importing a
              // recovered edition adds it to the desk without anyone editing
              // this file, and a year that only ever ran one distance shows
              // only that one. The query is inside the child callback, so it
              // runs when an editor opens Results rather than on every boot.
              S.listItem()
                .id('results')
                .title('Results')
                .icon(ThListIcon)
                .child(() =>
                  context
                    .getClient({ apiVersion: '2026-05-01' })
                    .fetch<string[]>(
                      // "2011|50k" per year-and-distance that actually exists.
                      'array::unique(*[_type == "raceResult" && defined(year) && defined(distance)]' +
                        '{"k": string(year) + "|" + distance->slug.current}.k)',
                    )
                    .then((keys) => {
                      const byYear = new Map<number, string[]>();
                      for (const key of keys) {
                        const [year, slug] = key.split('|');
                        if (!year || !slug) continue;
                        const list = byYear.get(Number(year)) ?? [];
                        if (!list.includes(slug)) list.push(slug);
                        byYear.set(Number(year), list);
                      }

                      const yearItems = [...byYear.keys()]
                        .sort((a, b) => b - a)
                        .map((year) => {
                          const slugs = (byYear.get(year) ?? []).sort();
                          return S.listItem()
                            .id(`results-${year}`)
                            .title(String(year))
                            .child(
                              S.list()
                                .id(`results-year-${year}`)
                                .title(`${year} results`)
                                .items(
                                  slugs.map((slug) =>
                                    S.listItem()
                                      .id(`results-${year}-${slug}`)
                                      .title(slug.toUpperCase())
                                      .child(
                                        S.documentList()
                                          .id(`results-list-${year}-${slug}`)
                                          .title(`${year} ${slug.toUpperCase()}`)
                                          .schemaType('raceResult')
                                          .filter(
                                            '_type == "raceResult" && year == $year && ' +
                                              'distance->slug.current == $slug',
                                          )
                                          .params({ year, slug })
                                          .defaultOrdering([
                                            { field: 'timeSeconds', direction: 'asc' },
                                          ]),
                                      ),
                                  ),
                                ),
                            );
                        });

                      return S.list()
                        .title('Results by year')
                        .items([
                          // The escape hatch. Search and cross-year ordering
                          // still need a flat list, and a desk that removes the
                          // only way to do something is worse than one that
                          // buries it a click down.
                          S.listItem()
                            .id('all-results')
                            .title('All results')
                            .icon(ThListIcon)
                            .child(S.documentTypeList('raceResult').title('All results')),
                          S.divider(),
                          ...yearItems,
                        ]);
                    })
                    // A desk pane that throws renders as a broken Studio, so a
                    // failed query falls back to the flat list rather than
                    // taking Results away entirely.
                    .catch(() => S.documentTypeList('raceResult').title('All results')),
                ),
              S.documentTypeListItem('athlete').title('Runners (fix a name here)').icon(UsersIcon),
              S.documentTypeListItem('recordEntry')
                .title('Records the results cannot prove')
                .icon(StarFilledIcon),
            ]),
        ),

      S.divider(),

      // Pages — every page singleton lives here.
      S.listItem()
        .id('pages')
        .title('Pages')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('Pages')
            .items([
              // Only the pages this site actually serves. The starter's About,
              // Services, Process, FAQ, Journal and Privacy singletons still
              // exist as schema types (src/lib/section-fields.test.ts reads two
              // of those files), but their ROUTES were removed because the race
              // does not have those pages. Listing a page an editor can fill in
              // and then never see published is worse than not offering it.
              singletonWithPreview(S, 'homePage', 'Home', HomeIcon),
              singletonWithPreview(
                S,
                'notFoundPage',
                'The "page not found" page',
                DocumentTextIcon,
              ),

              S.divider(),

              // Custom pages: editors build these themselves from the section library.
              // Multi-instance (not a singleton), so it is a normal document list.
              // Course, Records and Contact live here: they are `page`
              // documents built from the section library, not singletons, so
              // the race director can reorder or add to them freely.
              S.documentTypeListItem('page')
                .title('Pages (course, records, contact)')
                .icon(DocumentsIcon),

              S.divider(),

              // Saved sections: one band of a page, kept for reuse. Made from a
              // page's publish menu ("Save a section as preset..."), added to a
              // page from the Saved sections group in the Presentation
              // navigator. Ordered by name, because the name is the only way
              // you find one again.
              S.documentTypeListItem('sectionPreset')
                .title('Saved sections')
                .icon(BlockElementIcon),

              S.divider(),

              // Redirects: old address -> new address. Most entries are filed
              // automatically when a page's web address changes on publish
              // (src/sanity/components/slugRedirect.tsx); the editor adds one by
              // hand for an address that never existed on this site.
              S.documentTypeListItem('redirect')
                .title('Redirects (old links)')
                .icon(ArrowRightIcon),
            ]),
        ),

      S.divider(),

      // Content. The starter's service-business collections (services,
      // philosophy values, process steps, testimonials, FAQ items, journal)
      // are NOT listed: this site has no routes that render them, and a
      // collection an editor can fill with content that reaches no page is a
      // trap. Their schema types stay registered so the section library and
      // its drift tests are unchanged.
      S.listItem()
        .title('Content')
        .icon(ThListIcon)
        .child(
          S.list()
            .title('Content')
            .items([S.documentTypeListItem('announcement').title('Announcements').icon(BellIcon)]),
        ),

      S.divider(),

      // Safety net: surface any document type we have NOT explicitly placed above
      // (and keep the hidden set, including media.tag, out of the desk root).
      ...S.documentTypeListItems().filter(
        (item) => !HIDDEN_FROM_DEFAULT.has(item.getId() as string),
      ),
    ]);
