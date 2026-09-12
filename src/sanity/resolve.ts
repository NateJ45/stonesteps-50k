// Foundation, edit with care
// =============================================================================
// Presentation Tool location resolver
// (ported from presacademy 2026-08-28; original lineage: the WCP site)
// =============================================================================
// Two halves:
//
//  - `mainDocuments` (URL -> document): as you click through the preview iframe
//    like a normal website, Presentation opens the matching document in the
//    editor panel automatically. Routes match the iframe pathname (which lives
//    under /preview). Order matters: the singleton routes come before the
//    catch-all `page` route.
//
//  - `locations` (document -> URL): the reverse, so opening a document from the
//    desk points the preview at the right page. Singletons map to their fixed
//    preview path; `page` docs resolve from the slug. Collection docs (service,
//    testimonial, faqItem, journalEntry, ...) have no dedicated draft-preview
//    route, so they land on the page they appear on.
//
// The preview routes themselves live in the site app: src/pages/preview/.
// SINGLETON_PREVIEW_PATHS is the SAME map as SINGLETON_BY_PATH in
// src/pages/preview/[...slug].astro. Two places, one truth: change one and
// change the other. (There was a third, FIRST_SEGMENT_PREVIEWABLE in
// PreviewLayout.astro, which turned out to be dead code and is gone.)
// =============================================================================
import {
  defineDocuments,
  defineLocations,
  type PresentationPluginOptions,
} from 'sanity/presentation';

/**
 * Preview path per singleton. THIS SITE HAS TWO.
 *
 * It inherited the starter's nine (about, services, process, faq, contact,
 * journal, privacy), and none of those pages exist here: there is no
 * src/pages/about.astro, no aboutPage document, no route. Two things went
 * wrong because of it (2026-09-12).
 *
 * The Presentation tool listed all nine under "Main pages", so clicking About
 * offered the race director a blank New About Page to fill in and publish, for
 * a page the site cannot render.
 *
 * Worse, `contact` claimed the path. The real contact page is a `page`
 * document with the slug "contact", but the singleton branch matched first and
 * looked for a contactPage that does not exist, so /preview/contact answered
 * "No document found" and the Contact page could not be previewed at all.
 *
 * The pages this site really has are the home page, the 404, and `page`
 * documents (course, records, contact), which the :slug route handles.
 */
export const SINGLETON_PREVIEW_PATHS: Record<string, string> = {
  homePage: '/preview',
  notFoundPage: '/preview/404',
};

const previewHref = (slug?: string) => (slug === 'home' ? '/preview' : `/preview/${slug}`);

// One static location entry per singleton.
const singletonLocations = Object.fromEntries(
  Object.entries(SINGLETON_PREVIEW_PATHS).map(([type, href]) => [
    type,
    { locations: [{ title: 'Preview', href }] },
  ]),
);

export const resolve: PresentationPluginOptions['resolve'] = {
  mainDocuments: defineDocuments([
    { route: '/preview', filter: '_type == "homePage"' },
    // Singleton routes before the generic :slug catch-all.
    ...Object.entries(SINGLETON_PREVIEW_PATHS)
      .filter(([type]) => type !== 'homePage')
      .map(([type, href]) => ({ route: href, filter: `_type == "${type}"` })),
    { route: '/preview/:slug', filter: '_type == "page" && slug.current == $slug' },
  ]),
  locations: {
    ...singletonLocations,
    page: defineLocations({
      select: { title: 'title', slug: 'slug.current' },
      resolve: (doc) => {
        const slug = doc?.slug;
        if (!slug) return { locations: [], message: 'Give this page a slug to preview it.' };
        return { locations: [{ title: doc?.title ?? slug, href: previewHref(slug) }] };
      },
    }),
    // Collection docs have no draft-preview route of their own, so each is sent
    // to the page it renders on. The starter's entries (journalEntry, service,
    // processStep, faqItem and the rest) are gone with the pages they pointed
    // at: see the note on SINGLETON_PREVIEW_PATHS. Every type below holds real
    // documents on this site.
    announcement: { locations: [{ title: 'Home', href: '/preview' }] },
    siteSettings: { locations: [{ title: 'Home', href: '/preview' }] },
    race: { locations: [{ title: 'Home', href: '/preview' }] },
    distance: { locations: [{ title: 'Home', href: '/preview' }] },
    scheduleItem: { locations: [{ title: 'Home', href: '/preview' }] },
    sponsor: { locations: [{ title: 'Home', href: '/preview' }] },
    courseFeature: { locations: [{ title: 'The course', href: '/preview/course' }] },
    recordEntry: { locations: [{ title: 'Records', href: '/preview/records' }] },
  },
};
