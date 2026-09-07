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
  HomeIcon,
  InfoOutlineIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  DocumentsIcon,
  HeartIcon,
  ThListIcon,
  PinIcon,
  PresentationIcon,
  ThumbsUpIcon,
  ColorWheelIcon,
  RocketIcon,
  ArrowRightIcon,
  StarFilledIcon,
  CalendarIcon,
  ClockIcon,
  UsersIcon,
  ActivityIcon,
} from '@sanity/icons';
import StudioGuide from './components/StudioGuide';
import BusinessOverview from './components/BusinessOverview';
import BrandKit from './components/BrandKit';
import StudioPlaybook from './components/StudioPlaybook';

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
  'studioGuide',
  'studioNotes',
  'studioPlaybook',
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
  return S.listItem()
    .title(title)
    .icon(icon)
    .child(S.document().schemaType(schemaType).documentId(schemaType).views([S.view.form()]));
}

export const deskStructure = (S: StructureBuilder, context: StructureResolverContext) =>
  S.list()
    .title('Stone Steps 50K')
    .items([
      // Start Here — three-panel handbook for the editor. First item so it is always visible.
      // Panel 1: how the Studio works and step-by-step how-tos (static).
      // Panel 2: live business overview (services + site settings fetched from Sanity).
      // Panel 3: brand kit — colors + fonts for Canva (static).
      S.listItem()
        .title('Start Here')
        .icon(InfoOutlineIcon)
        .child(
          S.list()
            .title('Start Here')
            .items([
              S.listItem()
                .title('How the website works')
                .icon(PresentationIcon)
                .child(
                  S.document()
                    .schemaType('studioGuide')
                    .documentId('studioGuide')
                    .views([
                      S.view.component(StudioGuide).title('Guide'),
                      S.view.form().title('Edit'),
                    ]),
                ),
              S.listItem()
                .title('Your business at a glance')
                .icon(ThumbsUpIcon)
                .child(
                  S.document()
                    .schemaType('studioNotes')
                    .documentId('studioNotes')
                    .views([
                      S.view.component(BusinessOverview).title('Overview'),
                      S.view.form().title('Edit notes'),
                    ]),
                ),
              S.listItem()
                .title('Brand kit')
                .icon(ColorWheelIcon)
                .child(S.component(BrandKit).title('Brand kit')),
              S.listItem()
                .title('Grow your studio')
                .icon(RocketIcon)
                .child(
                  S.document()
                    .schemaType('studioPlaybook')
                    .documentId('studioPlaybook')
                    .views([
                      S.view.component(StudioPlaybook).title('Guides'),
                      S.view.form().title('Edit'),
                    ]),
                ),
            ]),
        ),

      S.divider(),

      // Site Settings — pinned singleton (no preview; not a page)
      singletonWithPreview(S, 'siteSettings', 'Site Settings', CogIcon),

      S.divider(),

      // The Race. Everything about the event itself, kept together so an editor
      // preparing next year's edition never has to hunt through Content.
      //
      // Athletes and Results are listed but are not day-to-day editing surfaces:
      // both are written by scripts/import-results.mjs from the RunSignUp API.
      // They are here so a name can be corrected at its single source, which is
      // the whole reason results reference an athlete rather than repeating one.
      S.listItem()
        .title('The Race')
        .icon(ActivityIcon)
        .child(
          S.list()
            .title('The Race')
            .items([
              singletonWithPreview(S, 'race', 'This year', CalendarIcon),
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
              S.documentTypeListItem('raceResult').title('Results').icon(ThListIcon),
              S.documentTypeListItem('athlete').title('Athletes').icon(UsersIcon),
              S.documentTypeListItem('recordEntry')
                .title('Historical records')
                .icon(StarFilledIcon),
            ]),
        ),

      S.divider(),

      // Pages — every page singleton lives here.
      S.listItem()
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
              singletonWithPreview(S, 'notFoundPage', '404 Page', DocumentTextIcon),

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
