// Page-builder discriminated union.
//
// Generated types (sanity.types.ts) describe the raw *schema* shapes. The GROQ
// sectionsProjection() in queries.ts RESHAPES several fields at query time:
//   - Images: asset reference is resolved to a full asset document via `asset->`
//     and alt gets a coalesce fallback. The projected shape is wider than the
//     raw SanityImageAssetReference.
//   - CTA blocks: internalLink is resolved to `{ _type: string; slug: string }`
//     (not a union of Reference types).
//   - Rich sections inject collection fields that do not exist on the schema
//     type at all (services, points, steps, travelFees, siteSettingsText).
//
// For each divergence we use a locally-scoped override type rather than `as any`,
// so callers that read these fields get a meaningful type (not `unknown`).
//
// This file is safe to edit by hand. Do NOT import from it in sanity.types.ts.

import type {
  HeroSection as _HeroSection,
  RichTextSection as _RichTextSection,
  ImageTextSection as _ImageTextSection,
  GallerySection as _GallerySection,
  QuoteSection as _QuoteSection,
  StatSection as _StatSection,
  CtaBandSection as _CtaBandSection,
  VideoSection as _VideoSection,
  SpacerSection as _SpacerSection,
  FounderSection as _FounderSection,
  ServicesGridSection as _ServicesGridSection,
  TestimonialsSection as _TestimonialsSection,
  StorySection as _StorySection,
  ValuesSection as _ValuesSection,
  ProcessSection as _ProcessSection,
  ServiceAreaSection as _ServiceAreaSection,
  GuaranteeSection as _GuaranteeSection,
  // U7 new blocks — hand-authored below since typegen has not run yet
  // FaqSection, LogoStripSection, TeamSection, EmbedSection — not imported from
  // sanity.types yet; their projected types are fully defined below.
} from './sanity.types';

// ---------------------------------------------------------------------------
// Shared projected shapes
// ---------------------------------------------------------------------------

/** Image after `asset->` + alt coalesce in the GROQ projection. */
export interface ProjectedImage {
  _type: 'image';
  asset?: {
    _id?: string;
    _ref?: string;
    _type?: string;
    url?: string;
    metadata?: {
      dimensions?: { width?: number; height?: number; aspectRatio?: number };
      lqip?: string;
      blurHash?: string;
    };
    [key: string]: unknown;
  } | null;
  alt?: string;
  hotspot?: { x?: number; y?: number; height?: number; width?: number };
  crop?: { top?: number; bottom?: number; left?: number; right?: number };
  caption?: string;
  [key: string]: unknown;
}

/**
 * The image shape every component that renders a Sanity image should accept.
 *
 * Nine components used to redeclare their own `interface SanityImageObject`
 * with `asset?: { _ref?: string; _id?: string }` and REQUIRED hotspot/crop
 * numbers. None of those matched `ProjectedImage`, which is what the GROQ
 * projection actually returns: `asset->` resolves to a whole asset document
 * (extra keys, and `null` when the reference is broken) and Sanity marks every
 * hotspot and crop number optional. `astro check` reported eight assignment
 * errors along that seam the first time it ran here, 2026-09-06. Every one was
 * the prop contract being narrower than the data, not the data being wrong.
 *
 * `_type` is optional because the code-defined fallbacks in
 * src/data/defaultSections.ts build image objects without it.
 */
export interface SanityImageObject extends Omit<ProjectedImage, '_type'> {
  // Spelled out rather than written as `Omit<ProjectedImage, '_type'>` alone:
  // ProjectedImage carries an index signature, and Omit over an index signature
  // drops every named property with it, which would leave `.alt` typed `{}`.
  _type?: string;
  asset?: ProjectedImage['asset'];
  alt?: string;
  hotspot?: { x?: number; y?: number; height?: number; width?: number };
  crop?: { top?: number; bottom?: number; left?: number; right?: number };
  caption?: string;
}

/** CTA block after `internalLink->{ _type, "slug": slug.current }` projection. */
export interface ProjectedCtaBlock {
  _type: 'ctaBlock';
  label?: string;
  linkType?: 'internal' | 'external' | 'email' | 'phone';
  /** Resolved internal link — shape is `{ _type: string; slug: string }` after deref. */
  internalLink?: { _type?: string; slug?: string } | null;
  externalUrl?: string;
  emailAddress?: string;
  phoneNumber?: string;
  openInNewTab?: boolean;
  /** Fallback href used by default sections (no Sanity project). */
  href?: string;
}

// ---------------------------------------------------------------------------
// Per-block projected types
// Each member carries _key (required for page-builder arrays in Sanity) and
// overrides only the fields that the projection reshapes.
// ---------------------------------------------------------------------------

export type ProjectedHeroSection = { _key: string } & Omit<
  _HeroSection,
  'backgroundImage' | 'primaryCta' | 'secondaryCta'
> & {
    backgroundImage?: ProjectedImage | null;
    primaryCta?: ProjectedCtaBlock | null;
    secondaryCta?: ProjectedCtaBlock | null;
  };

export type ProjectedRichTextSection = { _key: string } & _RichTextSection & {
    /** Non-schema extra field present in some defaultSections entries. */
    cta?: ProjectedCtaBlock | null;
    [key: string]: unknown;
  };

export type ProjectedImageTextSection = { _key: string } & Omit<
  _ImageTextSection,
  'image' | 'cta'
> & {
    image?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
    /** Non-schema alias for imageSide present in some defaultSections entries. */
    imagePosition?: 'left' | 'right';
    [key: string]: unknown;
  };

export type ProjectedGallerySection = { _key: string } & Omit<_GallerySection, 'images'> & {
    images?: ProjectedImage[];
  };

export type ProjectedQuoteSection = { _key: string } & _QuoteSection;

export type ProjectedStatSection = { _key: string } & _StatSection;

export type ProjectedCtaBandSection = { _key: string } & Omit<
  _CtaBandSection,
  'backgroundImage' | 'cta'
> & {
    backgroundImage?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
  };

export type ProjectedVideoSection = { _key: string } & _VideoSection;

export type ProjectedSpacerSection = { _key: string } & _SpacerSection & {
    /** Non-schema size field present in some defaultSections entries. */
    size?: string;
    [key: string]: unknown;
  };

export type ProjectedFounderSection = { _key: string } & Omit<
  _FounderSection,
  'portrait' | 'cta'
> & {
    portrait?: ProjectedImage | null;
    cta?: ProjectedCtaBlock | null;
  };

/** servicesGridSection adds a `services` array resolved from the collection. */
export type ProjectedServicesGridSection = { _key: string } & Omit<_ServicesGridSection, 'cta'> & {
    cta?: ProjectedCtaBlock | null;
    /** Resolved service documents from `*[_type == "service"]`. */
    services?: Array<{
      _id?: string;
      _type?: string;
      name?: string;
      slug?: { current?: string };
      price?: string;
      priceNumeric?: number;
      shortDescription?: string;
      features?: string[];
      bestFor?: string;
      featuredImage?: ProjectedImage;
      ctaLabel?: string;
      [key: string]: unknown;
    }>;
  };

/** Testimonial shape after dereffing in the projection. */
interface ProjectedTestimonial {
  _id?: string;
  _type?: string;
  quote?: string;
  attribution?: string;
  detail?: string;
  relatedProject?: { title?: string; slug?: string } | null;
  [key: string]: unknown;
}

export type ProjectedTestimonialsSection = { _key: string } & Omit<
  _TestimonialsSection,
  'featuredQuote' | 'testimonialsToShow'
> & {
    featuredQuote?: ProjectedTestimonial | null;
    testimonialsToShow?: ProjectedTestimonial[];
  };

export type ProjectedStorySection = { _key: string } & Omit<_StorySection, 'portrait'> & {
    portrait?: ProjectedImage | null;
  };

/** valuesSection adds a `points` array resolved from the collection. */
export type ProjectedValuesSection = { _key: string } & _ValuesSection & {
    points?: Array<{
      title?: string;
      description?: string;
      displayOrder?: number;
    }>;
  };

/** processSection adds a `steps` array resolved from the collection + cta projection. */
export type ProjectedProcessSection = { _key: string } & Omit<_ProcessSection, 'cta'> & {
    cta?: ProjectedCtaBlock | null;
    steps?: Array<{
      stepNumber?: number;
      title?: string;
      timeEstimate?: string;
      shortDescription?: string;
      features?: string[];
      tierNote?: string;
    }>;
  };

/** serviceAreaSection adds `travelFees` resolved from businessInfo. */
export type ProjectedServiceAreaSection = { _key: string } & _ServiceAreaSection & {
    travelFees?: Array<{ distanceLabel?: string; fee?: string }>;
  };

/** guaranteeSection adds `siteSettingsText` resolved from siteSettings. */
export type ProjectedGuaranteeSection = { _key: string } & _GuaranteeSection & {
    siteSettingsText?: string;
  };

// ---------------------------------------------------------------------------
// U7 new blocks — hand-authored projected types (typegen will regenerate
// sanity.types.ts after this unit lands; at that point the orchestrator should
// verify these align with the generated shapes and update the imports above).
// ---------------------------------------------------------------------------

/** A dereffed faqItem projected inside faqSection.items. */
export interface ProjectedFaqItem {
  _id?: string;
  _type?: string;
  question?: string;
  answer?: any;
  category?: string;
  displayOrder?: number;
}

/**
 * faqSection — references faqItem documents, dereffed at query time.
 * SELF_CONTAINED (no surface prop).
 * NOTE: does not emit FAQPage JSON-LD (Google penalises duplicate markup).
 */
export interface ProjectedFaqSection {
  _type: 'faqSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  /** Word in `headline` rendered in the script accent face. */
  headingAccent?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  /** faqItem refs resolved to { question, answer, category, displayOrder }. */
  items?: ProjectedFaqItem[];
  cta?: ProjectedCtaBlock | null;
}

/** A single logo image inside logoStripSection, after asset-> projection. */
export type ProjectedLogoStripLogo = ProjectedImage;

/**
 * logoStripSection — grayscale logo row or grid.
 * SELF_CONTAINED (no surface prop).
 */
export interface ProjectedLogoStripSection {
  _type: 'logoStripSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  logos?: ProjectedLogoStripLogo[];
  layout?: 'row' | 'grid';
}

/** A single team member inline object inside teamSection. */
export interface ProjectedTeamMember {
  _key?: string;
  name?: string;
  role?: string;
  photo?: ProjectedImage | null;
  bio?: string;
  socialLinks?: Array<{ _key?: string; label?: string; url?: string }>;
}

/**
 * teamSection — inline team member grid (no teamMember collection dependency).
 * SELF_CONTAINED (no surface prop).
 * A future modules/team module will own a full teamMember collection.
 */
export interface ProjectedTeamSection {
  _type: 'teamSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  members?: ProjectedTeamMember[];
}

/**
 * embedSection — sandboxed iframe, URL or raw code variant.
 * SELF_CONTAINED (no surface prop).
 */
export interface ProjectedEmbedSection {
  _type: 'embedSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  embedUrl?: string;
  embedCode?: string;
  heightHint?: 'short' | 'medium' | 'tall';
}

// ---------------------------------------------------------------------------
// Church-reverse-port: dynamicListSection
// ---------------------------------------------------------------------------

/**
 * A single item inside dynamicListSection.items after the per-source GROQ
 * subquery. All sources normalise to the same shape so the component is
 * source-agnostic. `href` is null for sources that have no detail page
 * (testimonials, faqs).
 */
export interface ProjectedDynamicListItem {
  _id?: string;
  title?: string;
  meta?: string | null;
  summary?: string | null;
  href?: string | null;
  coverImage?: ProjectedImage | null;
  /** FAQ answer (present only when source == "faqs"). */
  answer?: any;
}

/**
 * dynamicListSection — auto-pulls the latest items from a core collection.
 * SELF_CONTAINED (no surface prop).
 * Source-specific behaviour:
 *   journal      -> latest journalEntry cards (title, excerpt, publishedAt, coverImage)
 *   services     -> all services ordered by orderRank (name, price, shortDescription)
 *   testimonials -> latest testimonials (attribution, detail, quote)
 *   faqs         -> faqItems ordered by displayOrder (question, answer, category)
 */
export interface ProjectedDynamicListSection {
  _type: 'dynamicListSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  /** Portable Text twin of `subhead` (bold / italic only). */
  subheadRich?: unknown;
  columns?: 2 | 3;
  source?: 'journal' | 'services' | 'testimonials' | 'faqs';
  limit?: number;
  items?: ProjectedDynamicListItem[];
  cta?: ProjectedCtaBlock | null;
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

/* ---------- Stone Steps race blocks --------------------------------------
 * Most of these carry a collection the GROQ projection filled in, not fields
 * an editor typed. See the race clauses in sectionsProjection().
 */

export interface ProjectedRaceDistance {
  _id: string;
  name?: string;
  slug?: string;
  kicker?: string;
  loopStructure?: string;
  totalMiles?: number;
  loopCount?: number;
  blurb?: string;
  includes?: string[];
  startTime?: string;
  trekkerNote?: string;
  entryCap?: number;
  runSignUpEventId?: number;
  featured?: boolean;
  confirmed?: boolean;
}

export interface ProjectedFeeTier {
  _key?: string;
  label?: string;
  amount?: number;
  processingFee?: number;
  endsOn?: string;
}

/** One row out of the results archive, before any derivation. */
export interface ProjectedRaceResult {
  year?: number;
  timeSeconds?: number;
  gender?: string;
  age?: number;
  place?: number;
  timeSource?: 'chip' | 'gun';
  trekker?: boolean;
  distance?: string;
  athlete?: { name?: string | null; slug?: string | null } | null;
}

/** One transcribed record that predates the results archive. */
export interface ProjectedRecordEntry {
  bracket?: string;
  gender?: string;
  year?: number;
  timeSeconds?: number;
  sourceNote?: string;
  distance?: string;
  athlete?: { name?: string | null; slug?: string | null } | null;
}

export interface ProjectedRaceHeroSection {
  _type: 'raceHeroSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subhead?: string;
  images?: ProjectedImage[];
  /** Pre-slideshow documents. Read as a single slide when `images` is empty. */
  image?: ProjectedImage;
  showCountdown?: boolean;
  primaryCta?: ProjectedCtaBlock;
  secondaryCta?: ProjectedCtaBlock;
  race?: {
    raceDate?: string;
    registerUrl?: string;
    resultsUrl?: string;
    confirmed?: boolean;
  } | null;
}

export interface ProjectedDistanceTicketsSection {
  _type: 'distanceTicketsSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  note?: string;
  distances?: ProjectedRaceDistance[];
  race?: { registerUrl?: string; feeTiers?: ProjectedFeeTier[] } | null;
}

export interface ProjectedRecordsBoardSection {
  _type: 'recordsBoardSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  intro?: string;
  distances?: { _id: string; name?: string; slug?: string }[];
  results?: ProjectedRaceResult[];
  historical?: ProjectedRecordEntry[];
  race?: { resultsUrl?: string } | null;
}

export interface ProjectedRaceScheduleSection {
  _type: 'raceScheduleSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  items?: {
    _id: string;
    label?: string;
    time?: string;
    detail?: string;
    confirmed?: boolean;
  }[];
}

export interface ProjectedCourseFeaturesSection {
  _type: 'courseFeaturesSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  cta?: ProjectedCtaBlock;
  image?: ProjectedImage;
  features?: { _id: string; title?: string; body?: string; confirmed?: boolean }[];
}

export interface ProjectedLoopCardSection {
  _type: 'loopCardSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  legend?: string;
  sourceNote?: string;
  loops?: {
    _key?: string;
    kind?: 'long' | 'short';
    miles?: string;
    throughMiles?: string;
    inShortDistance?: boolean;
  }[];
  aside?: { _key?: string; title?: string; body?: string; confirmed?: boolean }[];
}

export interface ProjectedElevationSection {
  _type: 'elevationSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  intro?: string;
  totalGain?: string;
  race?: {
    gpxUrl?: string;
    elevationProfile?: {
      source?: string;
      miles?: number;
      gainFt?: number;
      lowFt?: number;
      highFt?: number;
      points?: { mile?: number; ft?: number }[];
    } | null;
  } | null;
}

export interface ProjectedSponsorPatchesSection {
  _type: 'sponsorPatchesSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  sponsors?: { _id: string; name?: string; url?: string; logo?: ProjectedImage }[];
}

export interface ProjectedPageHeaderSection {
  _type: 'pageHeaderSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  headlineSecondLine?: string;
  lede?: string;
  image?: ProjectedImage;
}

export interface ProjectedContactSection {
  _type: 'contactSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  subjects?: string[];
  communityNote?: string;
  race?: {
    directorName?: string;
    directorNote?: string;
    facebookUrl?: string;
    venue?: string;
    startArea?: string;
    city?: string;
    region?: string;
    raceDate?: string;
  } | null;
}

export interface ProjectedFaqKioskSection {
  _type: 'faqKioskSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  items?: { _key?: string; question?: string; answer?: string }[];
  unansweredHeading?: string;
  unansweredNote?: string;
  unanswered?: string[];
}

export interface ProjectedTickerSection {
  _type: 'tickerSection';
  _key: string;
  items?: string[];
}

export interface ProjectedParksSection {
  _type: 'parksSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  body?: string;
  image?: ProjectedImage;
  caption?: string;
  showDirector?: boolean;
  race?: {
    parksDonation?: string;
    directorName?: string;
    directorNote?: string;
  } | null;
}

export interface ProjectedDynastiesSection {
  _type: 'dynastiesSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  cta?: ProjectedCtaBlock;
  distances?: { _id: string; name?: string; slug?: string }[];
  results?: ProjectedRaceResult[];
  historical?: ProjectedRecordEntry[];
}

export interface ProjectedGearSection {
  _type: 'gearSection';
  _key: string;
  eyebrow?: string;
  headline?: string;
  items?: { _key?: string; title?: string; body?: string }[];
}

export type PageBuilderBlock =
  | ProjectedHeroSection
  | ProjectedRichTextSection
  | ProjectedImageTextSection
  | ProjectedGallerySection
  | ProjectedQuoteSection
  | ProjectedStatSection
  | ProjectedCtaBandSection
  | ProjectedVideoSection
  | ProjectedSpacerSection
  | ProjectedFounderSection
  | ProjectedServicesGridSection
  | ProjectedTestimonialsSection
  | ProjectedStorySection
  | ProjectedValuesSection
  | ProjectedProcessSection
  | ProjectedServiceAreaSection
  | ProjectedGuaranteeSection
  // U7 new blocks
  | ProjectedFaqSection
  | ProjectedLogoStripSection
  | ProjectedTeamSection
  | ProjectedEmbedSection
  // Church-reverse-port
  | ProjectedDynamicListSection
  // Stone Steps race blocks
  | ProjectedRaceHeroSection
  | ProjectedDistanceTicketsSection
  | ProjectedRecordsBoardSection
  | ProjectedRaceScheduleSection
  | ProjectedCourseFeaturesSection
  | ProjectedLoopCardSection
  | ProjectedElevationSection
  | ProjectedSponsorPatchesSection
  | ProjectedPageHeaderSection
  | ProjectedContactSection
  | ProjectedFaqKioskSection
  | ProjectedTickerSection
  | ProjectedParksSection
  | ProjectedDynastiesSection
  | ProjectedGearSection;
