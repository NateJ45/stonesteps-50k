// Studio Desk structure for the Stone Steps 50K. The order follows the race
// year: this year's race first (the date, the distances, the schedule, the
// sponsors), then the results and records (written by the nightly import),
// then the pages, the race notices and the site setup, then the Trash.
//
// Names (2026-10-18): one name per thing, in runners' words. Race notices
// (code: announcement), Runners (athlete), Results (raceResult), Records the
// results cannot prove (recordEntry), Saved sections (sectionPreset). Every
// document type is placed explicitly so nothing floats loose at the desk root;
// the trailing default-list filter is a safety net for a future type.
//
// The Studio kit (PORTS.md card 106) took over three things this desk used to
// hold: the Welcome pane is the Home tool, the Checkup pane is the Checkup
// tool, and the Help & Guide list is the Site Guide tool (all in the top bar).
// "Start a new race year" and "Brand colours" stay here: they are the race's
// own, and the race director comes looking for them in the menu.
//
// Orderable lists (distances, schedule, course features, sponsors) use the
// orderable-document-list plugin: drag rows to reorder; GROQ orders by
// orderRank so the site mirrors the Studio.

import type { StructureBuilder, StructureResolverContext } from 'sanity/structure';
import { orderableDocumentListDeskItem } from '@sanity/orderable-document-list';
import { RaceYearTool } from './components/RaceYearTool';
import BrandKit from './components/BrandKit';
import { staffDesk } from './kit/shared';
import { trashListItem } from './kit/trash';
import { brandIcon, typeIcon, type BrandIcon } from './brandIcons';
import { emptyAwareList } from './kit/emptyList';
import { WEEK_TYPE } from '../lib/studio-kit';
import { TRASH_TYPE } from '../lib/studio-trash';
import { tableListItem } from './workflow';
import { TABLES } from './tables.config';
import { kitConfig } from './kit.config';

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
  // The race's own singleton: date, venue, links.
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
  'announcement', // placed explicitly: Race notices
  'testimonial',
  'faqItem',
  'faqCategory',
  'journalEntry',
  'journalCategory',
  'page', // custom pages, placed explicitly under "Pages"
  'sectionPreset', // saved sections, placed explicitly under "Pages"
  'redirect', // placed explicitly under "Pages" -> Redirects
  // Race collections, placed explicitly under "Results and records".
  'athlete',
  'raceResult',
  'recordEntry',
  'raceDay',
  TRASH_TYPE, // the Studio kit's Trash, placed explicitly at the bottom
  // The Studio kit's weekly tick document (card 111): Home's bookkeeping, never edited here.
  WEEK_TYPE,
  // Private preview link records (card 117): managed from "Share a preview" only.
  'previewShare',
]);

/**
 * A singleton list item pinned to one document id. The id is the document's,
 * not the title's: an intent link ("open the race document", from Home, the
 * Checkup or a guide) resolves to the pane named after the document, and a
 * title-derived id opened the parent list instead (2026-09-12).
 */
function singletonWithPreview(
  S: StructureBuilder,
  schemaType: string,
  title: string,
  icon: BrandIcon = typeIcon(schemaType),
) {
  return S.listItem()
    .id(schemaType)
    .title(title)
    .icon(icon)
    .child(
      S.document()
        .schemaType(schemaType)
        .documentId(schemaType)
        .views([S.view.form().title('Edit')]),
    );
}

// The Studio kit's staff view hides kitConfig.staffHiddenPanes from this desk
// (src/sanity/kit/shared.tsx, staffDesk); everyone else sees all of it.
export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  staffDesk(fullDesk(S, context), context, kitConfig);

const fullDesk = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Content')
    .items([
      // THIS YEAR'S RACE. Everything that changes from one running to the next,
      // in one place, so preparing next year is one visit rather than a hunt.
      // EVERY PANE A TOOL LINKS TO NEEDS AN EXPLICIT ID: Home, the Checkup,
      // raceYearSteps.ts and the guides link to 'this-years-race;...'.
      S.listItem()
        .id('this-years-race')
        .title("This year's race")
        .icon(typeIcon('race'))
        .child(
          S.list()
            .title("This year's race")
            .items([
              singletonWithPreview(S, 'race', 'Race day (date, venue, links)'),
              orderableDocumentListDeskItem({
                type: 'distance',
                title: 'Distances (fees, caps, start times)',
                icon: typeIcon('distance'),
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'scheduleItem',
                title: 'Race-day schedule',
                icon: typeIcon('scheduleItem'),
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'courseFeature',
                title: 'Course features',
                icon: typeIcon('courseFeature'),
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'sponsor',
                title: 'Sponsors',
                icon: typeIcon('sponsor'),
                S,
                context,
              }),
              ...TABLES.filter((c) => c.type === 'sponsor').map((c) => tableListItem(S, c)),
              S.divider(),
              S.listItem()
                .id('race-year')
                .title('Start a new race year')
                .icon(brandIcon('event'))
                .child(
                  S.component(RaceYearTool as never)
                    .id('race-year-pane')
                    .title('Start a new race year'),
                ),
            ]),
        ),

      // RESULTS AND RECORDS. Shown, not typed into: scripts/import-results.mjs
      // writes results and runners from the RunSignUp API every night through
      // October and November, and weekly the rest of the year. The two hand
      // jobs are fixing a runner's name at its single source and ticking
      // "Ran as a trekker" on a result. Records are derived from the results
      // on the site itself; the recordEntry list is only for a mark the
      // results cannot prove (empty since 2026-09-17, PENDING 1j).
      S.listItem()
        .id('results-and-records')
        .title('Results and records')
        .icon(typeIcon('raceResult'))
        .child(
          S.list()
            .title('Results and records')
            .items([
              S.listItem()
                .id('results')
                .title('Results')
                .icon(typeIcon('raceResult'))
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
                            .icon(typeIcon('raceResult'))
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
              S.documentTypeListItem('athlete')
                .title('Runners (fix a name here)')
                .icon(typeIcon('athlete')),
              // Hidden in the staff view (kit.config.ts staffHiddenPanes): the
              // records show only what a finish can prove (PENDING 1j), so a
              // hand-typed record is a developer's call, never a form to fill.
              S.documentTypeListItem('recordEntry')
                .id('record-entries')
                .title('Records the results cannot prove')
                .icon(typeIcon('recordEntry')),
              // Recorded automatically each November by scripts/weather-sync.mjs;
              // here so a missed year can be typed in. Hidden in the staff view.
              S.documentTypeListItem('raceDay')
                .id('race-days')
                .title('Race days (for the weather strip)')
                .icon(typeIcon('raceDay')),
            ]),
        ),

      S.divider(),

      // Pages: every page the race director can change.
      S.listItem()
        .id('pages')
        .title('Pages')
        .icon(brandIcon('pages'))
        .child(
          S.list()
            .title('Pages')
            .items([
              // Only the pages this site serves. The starter's About, Services,
              // Process, FAQ, Journal and Privacy singletons still exist as
              // schema types, but their routes were removed: the race does not
              // have those pages, and a page an editor can fill in and never
              // see published is worse than not offering it.
              singletonWithPreview(S, 'homePage', 'Home'),
              singletonWithPreview(S, 'notFoundPage', 'The "page not found" page'),

              S.divider(),

              // Course, Records and Contact live here: they are `page`
              // documents built from the section library, so the race director
              // can reorder or add to them freely.
              emptyAwareList(S, context, {
                id: 'page',
                type: 'page',
                title: 'Pages (course, records, contact)',
                icon: typeIcon('page'),
                explain:
                  'Pages you build from sections: the course, the records, contact, or a new one like a volunteer call or a race recap.',
              }),

              S.divider(),

              // Saved sections: one band of a page, kept for reuse.
              S.documentTypeListItem('sectionPreset')
                .title('Saved sections')
                .icon(typeIcon('sectionPreset')),

              S.divider(),

              // Redirects: old address -> new address. Most are filed
              // automatically when a page's web address changes on publish.
              S.documentTypeListItem('redirect')
                .title('Redirects (old links)')
                .icon(typeIcon('redirect')),
            ]),
        ),

      // RACE NOTICES. The line across the top of every page: parking, bib
      // pickup, the weather, a course change. Quick update makes one from a
      // phone. The id is load-bearing: Home and the race checklist link to it.
      emptyAwareList(S, context, {
        id: 'announcement',
        type: 'announcement',
        title: 'Race notices',
        icon: typeIcon('announcement'),
        explain:
          'A short line across the top of every page, for race-week news: parking, bib pickup, the weather, a course change. Quick update puts one up from your phone.',
        createLabel: 'Write the first notice',
      }),
      ...TABLES.filter((c) => c.type === 'announcement').map((c) => tableListItem(S, c)),

      S.divider(),

      // Site setup: the menus, the footer, the settings. Rarely touched.
      singletonWithPreview(S, 'siteSettings', 'Site setup (menus, footer)'),

      // BRAND COLOURS. Not a website job, which is exactly why it is here: the
      // flyer and the Facebook post are made somewhere else, and this is the
      // only place the race's actual values are written down in one list.
      S.listItem()
        .id('brand-kit')
        .title('Brand colours (for flyers and posts)')
        .icon(brandIcon('brandKit'))
        .child(
          S.component(BrandKit as never)
            .id('brand-kit-pane')
            .title('Brand colours'),
        ),

      S.divider(),

      // The Studio kit's Trash: "Move to Trash" keeps a copy here, and "Bring
      // it back" puts it where it was (src/sanity/kit/trash.tsx). The id is
      // load-bearing: the Checkup's "Open the Trash" links to it.
      trashListItem(S, context, brandIcon('trash')),

      // Safety net: surface any document type we have NOT explicitly placed above
      // (and keep the hidden set out of the desk root). Every media.* type
      // belongs to sanity-plugin-media's own tool.
      ...S.documentTypeListItems().filter((item) => {
        const id = item.getId() as string;
        return !HIDDEN_FROM_DEFAULT.has(id) && !id.startsWith('media.');
      }),
    ]);
