// Foundation, edit with care
// GROQ queries per page. Each function returns the page singleton plus any
// auto-populated collections that page needs (testimonials grid, services
// where showOnHomepage, process steps in order, etc.).
//
// Types: until `sanity typegen generate` runs, return types are `any`.
// Run `npm run typegen` after schema changes to regenerate src/lib/sanity.types.ts.

import { sanityFetch } from './sanity';

// Common Portable Text + image projection shorthand
export const IMAGE_PROJECTION = `{
  ...,
  asset->,
  "alt": coalesce(alt, asset->altText, "")
}`;

export const CTA_PROJECTION = `{
  ...,
  internalLink->{ _type, "slug": slug.current }
}`;

// Page-builder array projection. Spreads each block, then resolves the nested
// images and ctaBlocks inside the block types that carry them, so SectionRenderer
// gets ready-to-use data. Block types without images/ctas (text, quote, stats,
// video, spacer) pass through on the leading `...`.
//
// Parameterized by field name so it serves both `pageBuilder` (custom pages)
// and `additionalSections` (the flexible append zone on core pages).
/**
 * THE RESULTS ARCHIVE, FETCHED ONCE PER PAGE.
 *
 * The records board and the dynasties band both need every finish on file, and
 * both used to carry their own `*[_type == "raceResult"]` inside the
 * `pageBuilder[]` projection. GROQ evaluates a sub-query inside an array
 * projection once PER ITEM, so an eleven-section page ran that scan, with its
 * per-row athlete dereference, eleven times over. Measured on the deployed
 * worker: the home page's query took 6.8 seconds, of which 6.3 were these two
 * scans. Hoisted to the document, where they run once, the same query is 0.8
 * seconds (2026-09-12).
 *
 * It is invisible on the live site, which is statically built and pays it once
 * per deploy. It is very visible in the Studio's Presentation tool, where every
 * page switch is a fresh render: that is the several-second pause this removes.
 *
 * GROQ has no query-level variable and `^` cannot reach a computed sibling
 * (tested: it returns null), so SectionRenderer merges these into the two
 * sections that want them.
 *
 * AND IT IS SKIPPED ENTIRELY when the page has no section that wants it. Only
 * the records page and the home page's dynasties band read these; the course
 * and contact pages were paying half a second for 1,961 rows they throw away.
 */
const WANTS_ARCHIVE = `count(pageBuilder[_type in ["recordsBoardSection", "dynastiesSection"]]) > 0`;

export const ARCHIVE_PROJECTION = `
  "results": select(${WANTS_ARCHIVE} => *[_type == "raceResult"]{
    year, timeSeconds, gender, age, place, timeSource, trekker,
    "distance": distance->slug.current,
    "athlete": { "name": athlete->name, "slug": athlete->slug.current }
  }, []),
  "historical": select(${WANTS_ARCHIVE} => *[_type == "recordEntry"]{
    bracket, gender, year, timeSeconds, sourceNote,
    "distance": distance->slug.current,
    // THE HOLDER. Never projected before (2026-09-12): every transcribed record
    // reached the board with its year and its time and no name, so the board
    // printed "Unclaimed" beside a 2010 time, which reads as a contradiction.
    // The document has always carried the reference; the query never asked.
    "athlete": { "name": athlete->name, "slug": athlete->slug.current }
  }, [])`;

export function sectionsProjection(field = 'pageBuilder'): string {
  return `${field}[]{
    ...,
    _type == "heroSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      primaryCta${CTA_PROJECTION},
      secondaryCta${CTA_PROJECTION}
    },
    _type == "ctaBandSection" => {
      ...,
      backgroundImage${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "imageTextSection" => {
      ...,
      image${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "gallerySection" => {
      ...,
      images[]${IMAGE_PROJECTION}
    },
    _type == "founderSection" => {
      ...,
      portrait${IMAGE_PROJECTION},
      cta${CTA_PROJECTION}
    },
    _type == "storySection" => {
      ...,
      portrait${IMAGE_PROJECTION}
    },
    _type == "servicesGridSection" => {
      ...,
      cta${CTA_PROJECTION},
      "services": *[_type == "service"] | order(orderRank asc, displayOrder asc)
    },
    _type == "testimonialsSection" => {
      ...,
      "featuredQuote": featuredQuote->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      },
      "testimonialsToShow": testimonialsToShow[]->{
        ...,
        "relatedProject": relatedProject->{ title, "slug": slug.current }
      }
    },
    _type == "valuesSection" => {
      ...,
      "points": *[_type == "philosophyPoint"] | order(orderRank asc, displayOrder asc){
        title, description, displayOrder
      }
    },
    _type == "processSection" => {
      ...,
      cta${CTA_PROJECTION},
      "steps": *[_type == "processStep"] | order(orderRank asc, stepNumber asc){
        stepNumber, title, timeEstimate, shortDescription, features, tierNote
      }
    },
    _type == "serviceAreaSection" => {
      ...,
      "travelFees": *[_type == "businessInfo"][0].travelFees
    },
    _type == "guaranteeSection" => {
      ...,
      "siteSettingsText": *[_type == "siteSettings"][0].satisfactionGuarantee
    },
    _type == "faqSection" => {
      ...,
      cta${CTA_PROJECTION},
      "items": items[]->{
        _id, _type, question, answer,
        "category": coalesce(categoryRef->title, category),
        displayOrder
      }
    },
    _type == "logoStripSection" => {
      ...,
      logos[]${IMAGE_PROJECTION}
    },
    // ---- Stone Steps race blocks ----------------------------------------
    // Most of these are SELF-FILLING: the editor places the section and names
    // it, and the contents come from the collections. That is deliberate. A
    // records table that can be typed by hand is a records table that will
    // eventually disagree with the results it claims to summarise, which is
    // exactly what happened on the site this one replaces.
    _type == "raceHeroSection" => {
      ...,
      images[]${IMAGE_PROJECTION},
      image${IMAGE_PROJECTION},
      primaryCta${CTA_PROJECTION},
      secondaryCta${CTA_PROJECTION},
      "race": *[_type == "race"][0]{ raceDate, editionNumber, registerUrl, resultsUrl, confirmed }
    },
    _type == "distanceTicketsSection" => {
      ...,
      "distances": *[_type == "distance"] | order(orderRank asc){
        _id, name, "slug": slug.current, kicker, loopStructure, totalMiles, loopCount,
        blurb, includes, startTime, trekkerNote, entryCap, runSignUpEventId, featured,
        confirmed, feeTiers[]{ label, amount, endsOn }
      },
      "race": *[_type == "race"][0]{ registerUrl, feeTiers }
    },
    // The records board hands the component the RAW result set per distance and
    // gender, plus the transcribed historical rows, and the derivation happens
    // in src/lib/age-brackets.ts. Deriving in GROQ would need one ordered query
    // per bracket per gender per distance, which is twenty-four round trips to
    // build one page, and would put the bracket boundaries somewhere they
    // cannot be unit tested.
    _type == "recordsBoardSection" => {
      ...,
      "distances": *[_type == "distance"] | order(orderRank asc){
        _id, name, "slug": slug.current
      },
      "race": *[_type == "race"][0]{ resultsUrl, atmosphere[]${IMAGE_PROJECTION} }
    },
    _type == "photoBandSection" => {
      ...,
      image${IMAGE_PROJECTION}
    },
    _type == "raceScheduleSection" => {
      ...,
      "items": *[_type == "scheduleItem"] | order(orderRank asc){
        _id, label, time, detail, confirmed
      },
      "race": *[_type == "race"][0]{ atmosphere[]${IMAGE_PROJECTION} }
    },
    _type == "courseFeaturesSection" => {
      ...,
      cta${CTA_PROJECTION},
      image${IMAGE_PROJECTION},
      "features": *[_type == "courseFeature"] | order(orderRank asc){
        _id, title, body, confirmed
      }
    },
    _type == "elevationSection" => {
      ...,
      "race": *[_type == "race"][0]{
        gpxUrl,
        elevationProfile{ source, miles, gainFt, lowFt, highFt, points[]{ mile, ft } }
      }
    },
    // The group's address is NOT a field on the block. It is read from The
    // Race, the same singleton the header's icon link reads, so the two can
    // never drift to different groups.
    _type == "communitySection" => {
      ...,
      cta${CTA_PROJECTION},
      "race": *[_type == "race"][0]{ facebookUrl }
    },
    _type == "parksSection" => {
      ...,
      image${IMAGE_PROJECTION},
      cta${CTA_PROJECTION},
      "race": *[_type == "race"][0]{ parksDonation, directorName, directorNote }
    },
    // Same shape the records board takes, because it runs the same derivation.
    // Handing this block a pre-computed answer instead would mean two code
    // paths that could drift, which is the whole thing being avoided here.
    _type == "dynastiesSection" => {
      ...,
      cta${CTA_PROJECTION},
      "distances": *[_type == "distance"] | order(orderRank asc){
        _id, name, "slug": slug.current
      }
    },
    _type == "pageHeaderSection" => {
      ...,
      image${IMAGE_PROJECTION}
    },
    _type == "contactSection" => {
      ...,
      "race": *[_type == "race"][0]{
        directorName, directorNote, facebookUrl, venue, startArea, city, region, raceDate
      }
    },
    _type == "sponsorPatchesSection" => {
      ...,
      "sponsors": *[_type == "sponsor"] | order(orderRank asc){
        _id, name, url, logo${IMAGE_PROJECTION}
      }
    },
    _type == "teamSection" => {
      ...,
      members[]{
        ...,
        photo${IMAGE_PROJECTION}
      }
    },
    // dynamicListSection: items fetched inline via a GROQ select() per source,
    // each normalised to a flat items array so the component handles one shape.
    _type == "dynamicListSection" => {
      ...,
      cta${CTA_PROJECTION},
      // GROQ subscript ranges must have INTEGER endpoints. A slice written as
      // 0...limit is a parse error, not a dynamic slice, and the limit here is
      // a per-BLOCK field so a single $param cannot stand in for it either.
      // Slice at 12, the schema's max, and let DynamicList.astro trim to the
      // block's own limit. NOTE: no backticks in this comment. It lives inside
      // a template literal, so one would terminate the query string.
      "items": select(
        source == "journal" => *[_type == "journalEntry"] | order(publishedAt desc)[0...12]{
          _id, "title": title, "meta": publishedAt, "summary": excerpt,
          "href": "/journal/" + slug.current,
          "coverImage": coverImage${IMAGE_PROJECTION}
        },
        source == "services" => *[_type == "service"] | order(orderRank asc, displayOrder asc)[0...12]{
          _id, "title": name, "meta": price, "summary": shortDescription,
          "href": "/services#" + slug.current
        },
        source == "testimonials" => *[_type == "testimonial"] | order(_createdAt desc)[0...12]{
          _id, "title": attribution, "meta": detail, "summary": quote, "href": null
        },
        source == "faqs" => *[_type == "faqItem"] | order(displayOrder asc, _createdAt asc)[0...12]{
          _id, "title": question, "summary": null, "meta": coalesce(categoryRef->title, category), "href": null,
          "answer": answer
        }
      )
    }
  }`;
}

// ---- Site settings (used in BaseLayout / Header / Footer) -----------------
// availabilityStatus, serviceAreas, travelFees, city, state, serviceRegion,
// geoLat, and geoLng moved to the businessInfo singleton. Pulled in here under
// the same flat field names so Header / Footer / pages that read
// siteSettings.serviceAreas etc. keep working with no change; only the source
// document changed.

// One menu link (schemaTypes/navLink.ts), as every menu needs it: the label,
// the hand-typed address that older items still carry, and the picked page
// DEREFERENCED down to a type + slug. src/lib/nav-href.ts turns that into an
// href. The field list is separate from the braces so it can also be spread
// into a projection that adds children (navItems' dropdown groups).
const NAV_LINK_FIELDS = `_key, _type, label, linkType, href, externalUrl,
    "slug": internalPage->slug.current,
    "docType": internalPage->_type,
    "pageArchived": internalPage->archived`;
export const NAV_LINK_PROJECTION = `{ ${NAV_LINK_FIELDS} }`;

// Module-level memoized promise. The first call triggers the actual Sanity
// fetch; every subsequent call (across all pages in the same build process)
// returns the same promise, collapsing 11+ per-page calls to one request.
let _siteSettingsPromise: Promise<any> | null = null;

// Exported so the preview shell (src/layouts/PreviewLayout.astro) fetches the
// chrome through the SAME projection. Fetching the raw document would leave
// every dereferenced menu link null in the preview.
export const SITE_SETTINGS_PROJECTION = `{
    title,
    tagline,
    email,
    phone,
    businessType,
    "availabilityStatus": *[_type == "businessInfo"][0].availabilityStatus,
    "serviceAreas": *[_type == "businessInfo"][0].serviceAreas,
    "travelFees": *[_type == "businessInfo"][0].travelFees,
    "geoLat": *[_type == "businessInfo"][0].geoLat,
    "geoLng": *[_type == "businessInfo"][0].geoLng,
    "city": *[_type == "businessInfo"][0].city,
    "state": *[_type == "businessInfo"][0].state,
    "serviceRegion": *[_type == "businessInfo"][0].serviceRegion,
    socialInstagram,
    socialFacebook,
    socialLinks[]{
      platform,
      url,
      label
    },
    seoImage${IMAGE_PROJECTION},
    footerCredit,
    footerCreditUrl,
    newsletter,
    googleBusinessUrl,
    reviewsNote,
    satisfactionGuarantee,
    logo${IMAGE_PROJECTION},
    // Optional editor-managed menus. Empty arrays mean "use the built-in defaults."
    navItems[]{
      ${NAV_LINK_FIELDS},
      links[]${NAV_LINK_PROJECTION}
    },
    footerColumns[]{
      _key,
      title,
      links[]${NAV_LINK_PROJECTION}
    },
    legalNav[]${NAV_LINK_PROJECTION},
    headerCta{ show, label, link${NAV_LINK_PROJECTION} },
    showEmail,
    showSocials,
    showFooterSocials,
    sectionVisibility{
      showPortfolio,
      showJournal,
      showShop,
      showEDesign,
      showGiftCertificates,
      showPress,
      showResources,
      showGuides,
      showStyleQuiz,
      showBudgetCalculator
    }
  }`;

/**
 * The race singleton: date, venue, links, fee tiers.
 *
 * Used for the SportsEvent JSON-LD as well as page content. Everything it
 * returns is either verified against the race's RunSignUp listing or carries
 * the `confirmed` flag, and unconfirmed values are kept OUT of the structured
 * data. Telling Google a start time the race has not published would be worse
 * than telling it nothing.
 */
/* ---------- Runners ------------------------------------------------------ */

/**
 * Every athlete slug, for getStaticPaths.
 *
 * Only athletes who actually have a result: the historical record entries
 * reference a few athletes with no imported finish, and a page showing one
 * transcribed row and nothing else is not worth a URL.
 */
export async function getAllRunners() {
  return sanityFetch(
    `*[_type == "athlete" && count(*[_type == "raceResult" && references(^._id)]) > 0]
      | order(name asc){
      name, "slug": slug.current, city, region,
      "results": *[_type == "raceResult" && references(^._id)] | order(year desc){
        year, timeSeconds, gender, age, place, timeSource, trekker,
        "distance": distance->name,
        "distanceSlug": distance->slug.current
      },
      "records": *[_type == "recordEntry" && references(^._id)]{
        bracket, gender, year, timeSeconds, sourceNote,
        "distance": distance->name,
        "distanceSlug": distance->slug.current
      }
    }`,
    {},
    [],
  );
}

export async function getRunner(slug: string) {
  return sanityFetch(
    `*[_type == "athlete" && slug.current == $slug][0]{
      name, "slug": slug.current, city, region,
      "results": *[_type == "raceResult" && references(^._id)] | order(year desc){
        year, timeSeconds, gender, age, place, timeSource, trekker,
        "distance": distance->name,
        "distanceSlug": distance->slug.current
      },
      // Transcribed records this runner holds. Without these a page can
      // UNDERSTATE someone: Katie Ruhlman holds the 50K course record from
      // 2020, and 2020 has no importable results, so her page would otherwise
      // show only her slower 2017 and 2018 finishes and look authoritative
      // while doing it.
      "records": *[_type == "recordEntry" && references(^._id)]{
        bracket, gender, year, timeSeconds, sourceNote,
        "distance": distance->name,
        "distanceSlug": distance->slug.current
      }
    }`,
    { slug },
    null,
  );
}

/**
 * The lookup index behind the results search: one small row per runner.
 *
 * Deliberately NOT a browsable directory. See src/pages/runners/[slug].astro
 * for why these pages are noindex, and why search is the right way in.
 */
export async function getRunnerIndex() {
  return sanityFetch(
    `*[_type == "athlete" && count(*[_type == "raceResult" && references(^._id)]) > 0]
      | order(name asc){
        name, "slug": slug.current,
        "n": count(*[_type == "raceResult" && references(^._id)])
      }`,
    {},
    [],
  );
}

/**
 * The whole results archive, in one query, for the /results pages.
 *
 * ONE FETCH, NOT ONE PER YEAR. There are 22 editions and 1,961 rows. Fetching
 * per year would be 22 round trips to build 22 pages; fetching once and passing
 * the rows through getStaticPaths props is a single request. The runner pages
 * taught this the expensive way: a per-page query there turned a fourteen
 * second build into seven minutes.
 *
 * The slice is explicit because GROQ has no implicit ceiling worth relying on,
 * and a silently truncated archive is the kind of bug that looks like missing
 * history rather than a missing limit.
 */
export async function getAllResults() {
  return sanityFetch(
    `*[_type == "raceResult"] | order(year desc, place asc)[0...6000]{
      year, place, age, gender, timeSeconds, timeSource, trekker, sourceNote,
      "name": athlete->name,
      "slug": athlete->slug.current,
      "city": athlete->city,
      "region": athlete->region,
      "distance": distance->name,
      "distanceSlug": distance->slug.current
    }`,
    {},
    [],
  );
}

/** The distances, in the order the race lists them. Drives column order. */
export async function getDistanceRefs() {
  return sanityFetch(
    `*[_type == "distance"] | order(orderRank asc){
      name, "slug": slug.current
    }`,
    {},
    [],
  );
}

export async function getRace() {
  return sanityFetch(
    `*[_type == "race"][0]{
      name, tagline, editionNumber, raceDate, venue, startArea,
      streetAddress, city, region, postalCode, geo,
      registerUrl, resultsUrl, facebookUrl, gpxUrl,
      feeTiers[]{ label, amount, processingFee, endsOn },
      elevationProfile{ source, sampledAt, miles, gainFt, lowFt, highFt, points[]{ mile, ft } },
      directorName, directorNote, parksDonation, confirmed
    }`,
    {},
    null,
  );
}

export async function getSiteSettings() {
  if (_siteSettingsPromise) return _siteSettingsPromise;
  _siteSettingsPromise = sanityFetch(
    `*[_type == "siteSettings"][0]${SITE_SETTINGS_PROJECTION}`,
    {},
    null,
  );
  return _siteSettingsPromise;
}

// ---- Business info (service areas, travel, availability, geo) -------------
// Most consumers read these through getSiteSettings (flat names), but pages
// or blocks that need businessInfo directly can use this.
export async function getBusinessInfo() {
  return sanityFetch(
    `*[_type == "businessInfo"][0]{
    businessModel,
    city,
    state,
    serviceRegion,
    serviceAreas,
    travelFees,
    availabilityStatus,
    geoLat,
    geoLng,
    additionalLocations[]{
      city,
      state,
      geoLat,
      geoLng
    }
  }`,
    {},
    null,
  );
}

// ---- Announcement banner --------------------------------------------------
// Fetches the single active announcement: enabled, started (or no startDate),
// not yet ended (or no endDate). Urgency ordering: urgent first, then highlight,
// then info; ties broken by soonest endDate so the most time-sensitive shows.
//
// "now" is evaluated at BUILD TIME (static site). A banner appears or disappears
// after the next rebuild. Use a scheduled Cloudflare deploy hook for auto-expiry.
//
// Returns null when no announcement is active (graceful absence: no banner renders).
export async function getActiveAnnouncement() {
  const now = new Date().toISOString();
  return sanityFetch(
    `*[_type == "announcement" && enabled == true
      && (!defined(startDate) || startDate <= $now)
      && (!defined(endDate) || endDate >= $now)]
      | order(select(style == "urgent" => 0, style == "highlight" => 1, 2) asc, endDate asc)[0]{
        message, style, link
      }`,
    { now },
    null,
  );
}

// ---- Home page ------------------------------------------------------------

export async function getHomePage() {
  return sanityFetch(
    `*[_type == "homePage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')},
    ${ARCHIVE_PROJECTION}
  }`,
    {},
    null,
  );
}

// ---- About page -----------------------------------------------------------

export async function getAboutPage() {
  return sanityFetch(
    `*[_type == "aboutPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')},
    ${ARCHIVE_PROJECTION}
  }`,
    {},
    null,
  );
}

// ---- Services page --------------------------------------------------------

export async function getServicesPage() {
  return sanityFetch(
    `*[_type == "servicesPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')},
    ${ARCHIVE_PROJECTION}
  }`,
    {},
    null,
  );
}

// Minimal service list for JSON-LD on the services page.
export async function getServiceListForSchema() {
  return sanityFetch(
    `*[_type == "service"] | order(orderRank asc, displayOrder asc){
    _id, name, slug, shortDescription, price, priceNumeric
  }`,
    {},
    [],
  );
}

// ---- Process page -----------------------------------------------------------

export async function getProcessPage() {
  return sanityFetch(
    `*[_type == "processPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    ${sectionsProjection('pageBuilder')},
    ${ARCHIVE_PROJECTION}
  }`,
    {},
    null,
  );
}

// ---- FAQ page -------------------------------------------------------------

export async function getFaqPage() {
  return sanityFetch(
    `*[_type == "faqPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    categoryOrder,
    "faqs": *[_type == "faqItem"] | order(category asc, displayOrder asc){
      question, answer,
      "category": coalesce(categoryRef->title, category),
      displayOrder
    },
    finalCtaEyebrow, finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION},
    secondaryCta${CTA_PROJECTION}
  }`,
    {},
    null,
  );
}

// ---- Contact page ---------------------------------------------------------

export async function getContactPage() {
  return sanityFetch(
    `*[_type == "contactPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    formIntroNote,
    formProjectTypeOptions,
    formLocationOptions,
    formBudgetOptions,
    formTimelineOptions,
    formSourceOptions,
    formFields[]{ label, kind, options, required },
    whatToExpectEyebrow,
    whatToExpectHeadline,
    whatToExpectContent,
    postInquiryRoadmap[]{
      title, body, timeEstimate
    },
    schedulingLink,
    schedulingLinkLabel,
    availabilityNote
  }`,
    {},
    null,
  );
}

// ---- 404 page -------------------------------------------------------------

export async function getNotFoundPage() {
  return sanityFetch(
    `*[_type == "notFoundPage"][0]{
    seoTitle,
    seoDescription,
    eyebrow,
    headline,
    body,
    heroImage${IMAGE_PROJECTION},
    primaryCtaLabel, primaryCtaHref,
    secondaryCtaLabel, secondaryCtaHref,
    tertiaryCtaLabel, tertiaryCtaHref
  }`,
    {},
    null,
  );
}

// ---- Projects (used by Footer.astro for Latest Projects column) -----------

/** Minimal project shape used by core surfaces (footer "Latest Projects" column,
 *  home Featured Work section). Fields mirror the GROQ projection below.
 *  Defined locally so core typechecks whether or not the portfolio module is enabled. */
export interface CoreProjectCard {
  _id: string;
  title?: string;
  slug?: { current?: string };
  location?: string;
  year?: number;
  roomType?: string;
  designStyle?: string;
  briefSummary?: string;
  featured?: boolean;
  heroImage?: any;
}

export async function getAllProjects(): Promise<CoreProjectCard[]> {
  return sanityFetch(
    `*[_type == "project"] | order(orderRank asc, coalesce(displayOrder, 999) asc, publishedAt desc){
    _id, title, slug, location, year, roomType, designStyle, briefSummary,
    heroImage${IMAGE_PROJECTION}
  }`,
    {},
    [],
  );
}

// ---- Journal --------------------------------------------------------------

// Projection for a journal card (index page) — small surface, no body.
const JOURNAL_CARD_PROJECTION = `{
  _id,
  title,
  slug,
  excerpt,
  publishedAt,
  featured,
  coverImage${IMAGE_PROJECTION},
  "categories": categories[]->{ _id, title, slug, description }
}`;

export async function getJournalPage() {
  return sanityFetch(
    `*[_type == "journalPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    stickyCtaLabel,
    finalCtaHeadline, finalCtaScriptAccent, finalCtaSubhead,
    finalCtaBackgroundImage${IMAGE_PROJECTION},
    finalCta${CTA_PROJECTION}
  }`,
    {},
    null,
  );
}

export async function getAllJournalEntries() {
  // Featured first, then newest first. Excerpt + cover only (no body).
  return sanityFetch(
    `*[_type == "journalEntry"] | order(featured desc, publishedAt desc) ${JOURNAL_CARD_PROJECTION}`,
    {},
    [],
  );
}

export async function getAllJournalCategories() {
  return sanityFetch(
    `*[_type == "journalCategory"] | order(title asc){
    _id, title, slug, description,
    "postCount": count(*[_type == "journalEntry" && references(^._id)])
  }`,
    {},
    [],
  );
}

export async function getJournalEntryBySlug(slug: string) {
  // Full doc including body. The body's inline image blocks get their asset
  // resolved + alt fallback at the GROQ layer so the renderer doesn't have to
  // chase asset refs for every block. Image gallery items + beforeAfter pairs
  // + sourceCard images + inline images all get the same treatment.
  return sanityFetch(
    `*[_type == "journalEntry" && slug.current == $slug][0]{
      _id, title, slug, excerpt, author, publishedAt, updatedAt, featured,
      seoTitle, seoDescription,
      coverImage${IMAGE_PROJECTION},
      "categories": categories[]->{ _id, title, slug, description },
      "relatedProject": relatedProject->{ _id, title, slug, location, year, heroImage${IMAGE_PROJECTION} },
      body[]{
        ...,
        _type == "inlineImage" => ${IMAGE_PROJECTION},
        _type == "beforeAfter" => {
          ...,
          beforeImage${IMAGE_PROJECTION},
          afterImage${IMAGE_PROJECTION}
        },
        _type == "sourceCard" => {
          ...,
          image${IMAGE_PROJECTION}
        },
        _type == "imageGallery" => {
          ...,
          images[]${IMAGE_PROJECTION}
        }
      },
      // Explicit relatedPosts if set; otherwise auto-pick 3 most recent in the
      // same primary category, excluding this post itself.
      "relatedPosts": coalesce(
        relatedPosts[]->${JOURNAL_CARD_PROJECTION},
        *[_type == "journalEntry" && _id != ^._id && count(categories[@._ref in ^.^.categories[]._ref]) > 0]
          | order(publishedAt desc)[0..2] ${JOURNAL_CARD_PROJECTION}
      )
    }`,
    { slug },
    null,
  );
}

// Static path generation for /journal/[slug]. Returns just the slugs.
export async function getAllJournalSlugs(): Promise<string[]> {
  const list: Array<{ slug: { current: string } }> = await sanityFetch(
    `*[_type == "journalEntry" && defined(slug.current)]{ slug }`,
    {},
    [],
  );
  return list.map((e) => e.slug?.current).filter(Boolean);
}

// ---- Privacy page ---------------------------------------------------------

export async function getPrivacyPage() {
  return sanityFetch(
    `*[_type == "privacyPage"][0]{
    seoTitle,
    seoDescription,
    seoImage${IMAGE_PROJECTION},
    heroEyebrow, heroHeadline, heroSubhead,
    heroImage${IMAGE_PROJECTION},
    heroScriptAccent,
    lastUpdated,
    body
  }`,
    {},
    null,
  );
}

// ---- Press items (used by core: about.astro + index.astro PressStrip) ----

/** Minimal press item shape used by the core PressStrip component.
 *  Defined locally so core typechecks whether or not the press module is enabled. */
export interface CorePressItem {
  _id: string;
  outlet?: string;
  logo?: any;
  quote?: string;
  url?: string;
  date?: string;
  orderRank?: string;
}

// Press items ordered by orderRank for the PressStrip on the home + about pages.
export async function getPressItems(): Promise<CorePressItem[]> {
  return sanityFetch(
    `*[_type == "pressItem"] | order(orderRank asc){
    _id, outlet,
    logo${IMAGE_PROJECTION},
    quote, url, date, orderRank
  }`,
    {},
    [],
  );
}

// ---- Custom pages (page builder) ------------------------------------------

// One published custom page by slug, with its section array fully resolved.
export async function getPage(slug: string) {
  return sanityFetch(
    `*[_type == "page" && slug.current == $slug][0]{
      title,
      "slug": slug.current,
      seoTitle, seoDescription, hideFromSearch,
      seoImage${IMAGE_PROJECTION},
      ${sectionsProjection('pageBuilder')},
      ${ARCHIVE_PROJECTION}
    }`,
    { slug },
    null,
  );
}

// Slugs of every published custom page, for getStaticPaths in [slug].astro.
//
// `archived != true`, never `archived == false`: a page made before the archive
// field existed has no value there and must stay visible. An archived page is
// simply not built, so its URL 404s and never reaches the sitemap.
export async function getAllPageSlugs(): Promise<string[]> {
  const list: Array<{ slug: string }> = await sanityFetch(
    `*[_type == "page" && defined(slug.current) && archived != true]{ "slug": slug.current }`,
    {},
    [],
  );
  return list.map((p) => p.slug).filter(Boolean);
}

// Custom pages flagged to appear in the main nav and/or footer. Header.astro
// and Footer.astro can inject these alongside the built-in links.
//
// Archived pages drop out: the page is not built, so a menu link to it would be
// a 404 in the middle of the navigation.
export async function getNavPages() {
  return sanityFetch(
    `*[_type == "page" && defined(slug.current) && archived != true && (addToMainNav == true || addToFooter == true)]{
    title,
    "slug": slug.current,
    navLabel,
    addToMainNav,
    navGroup,
    addToFooter
  }`,
    {},
    [],
  );
}
