// Foundation, edit with care
// The page-builder block library. Each block is a reusable section that editors
// can add, reorder, and remove on any page. Every block renders through a
// site component in src/components/sections/, so anything built here matches
// the rest of the site automatically.
//
// The SectionRenderer (src/components/SectionRenderer.astro) owns the alternating
// background cadence and dividers, so reordering can never break the rhythm.
// That is why no block has a "background color" field: the renderer decides.
//
// SECTION_TYPES (exported at the bottom) is the single source of truth for which
// blocks a page-builder array accepts. Use it everywhere a pageBuilder array is
// defined so every builder offers the same library.

import { defineType, defineField, defineArrayMember, type ArrayOptions } from 'sanity';
import { raceSectionSchemas } from './raceSections';
import { BlockElementIcon } from '@sanity/icons/BlockElement';
import { ImageIcon } from '@sanity/icons/Image';
import { ImagesIcon } from '@sanity/icons/Images';
import { BulbOutlineIcon } from '@sanity/icons/BulbOutline';
import { StarIcon } from '@sanity/icons/Star';
import { ComponentIcon } from '@sanity/icons/Component';
import { RemoveIcon } from '@sanity/icons/Remove';
import { PlayIcon } from '@sanity/icons/Play';
import { ThLargeIcon } from '@sanity/icons/ThLarge';
import { EarthGlobeIcon } from '@sanity/icons/EarthGlobe';
import { CodeBlockIcon } from '@sanity/icons/CodeBlock';
import { SyncIcon } from '@sanity/icons/Sync';
import { columnsField, headingAccentField, hideWhenRich, richTwin } from './_appearanceFields';
import { sideOptions } from '../../lib/layout-variants';

// Shared image field with required alt text (accessibility + SEO).
const imageWithAlt = (name = 'image', title = 'Image') =>
  defineField({
    name,
    title,
    type: 'image',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt text',
        type: 'string',
        description: 'Describe the photo in a few words, for screen readers and search engines.',
        validation: (R) => R.required(),
      }),
    ],
  });

// Short rich-text body: paragraphs, bold/italic, links, simple headings/lists.
const proseBody = (name = 'body', title = 'Text') =>
  defineField({
    name,
    title,
    type: 'array',
    of: [
      defineArrayMember({
        type: 'block',
        styles: [
          { title: 'Normal', value: 'normal' },
          { title: 'Heading', value: 'h2' },
          { title: 'Subheading', value: 'h3' },
          { title: 'Quote', value: 'blockquote' },
        ],
        lists: [
          { title: 'Bullet', value: 'bullet' },
          { title: 'Numbered', value: 'number' },
        ],
        marks: {
          decorators: [
            { title: 'Bold', value: 'strong' },
            { title: 'Italic', value: 'em' },
          ],
          annotations: [
            {
              name: 'link',
              type: 'object',
              title: 'Link',
              fields: [
                defineField({
                  name: 'href',
                  title: 'URL',
                  type: 'url',
                  validation: (R) => R.uri({ allowRelative: true }),
                }),
              ],
            },
          ],
        },
      }),
    ],
  });

// ── 1. Hero ──────────────────────────────────────────────────────────────────
export const heroSection = defineType({
  name: 'heroSection',
  title: 'Hero (big page opener)',
  type: 'object',
  icon: ComponentIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (small line above)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description:
        'One word from the headline to render in the script font. Must be a whole word from it (capitals do not matter). Leave blank to skip.',
    }),
    defineField({ name: 'subhead', title: 'Subhead', type: 'text', rows: 2 }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
    defineField({ name: 'primaryCta', title: 'Main button', type: 'ctaBlock' }),
    defineField({ name: 'secondaryCta', title: 'Second button (optional)', type: 'ctaBlock' }),
    defineField({
      name: 'size',
      title: 'Height',
      type: 'string',
      initialValue: 'short',
      options: {
        list: [
          { title: 'Tall', value: 'tall' },
          { title: 'Short', value: 'short' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({ title: title || 'Hero', subtitle: 'Hero', media }),
  },
});

// ── 2. Rich text ───────────────────────────────────────────────────────────--
export const richTextSection = defineType({
  name: 'richTextSection',
  title: 'Text block',
  type: 'object',
  icon: BlockElementIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description:
        'One word from the heading to render in the script font. Must be a whole word from it (capitals do not matter).',
    }),
    headingAccentField(),
    proseBody('body', 'Text'),
    defineField({
      name: 'width',
      title: 'Width',
      type: 'string',
      initialValue: 'normal',
      options: {
        list: [
          { title: 'Normal', value: 'normal' },
          { title: 'Narrow (easier reading)', value: 'narrow' },
        ],
        layout: 'radio',
      },
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: {
        list: [
          { title: 'Left', value: 'left' },
          { title: 'Centered', value: 'center' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'heading', body: 'body' },
    prepare: ({ title }) => ({ title: title || 'Text block', subtitle: 'Text' }),
  },
});

// ── 3. Image + text ──────────────────────────────────────────────────────────
export const imageTextSection = defineType({
  name: 'imageTextSection',
  title: 'Image + text (side by side)',
  type: 'object',
  icon: ImageIcon,
  fields: [
    imageWithAlt('image', 'Image'),
    defineField({
      name: 'imageSide',
      title: 'Which side is the image on?',
      type: 'string',
      initialValue: 'left',
      // Wording only. The stored values and the default are unchanged; the
      // labels come from the shared registry so both halves of a media pair
      // read the same way. See src/lib/layout-variants.ts.
      options: { list: sideOptions('Image'), layout: 'radio' },
    }),
    defineField({
      name: 'cutout',
      title: 'The image is a cut-out',
      type: 'boolean',
      initialValue: false,
      // It drops the frame, the rounded corners and the colour wash, so the subject
      // stands on the page instead of sitting in a box with an invisible rectangle
      // around it.
      description:
        'On for a subject on a transparent background, like a person cut out of their ' +
        'photo. Leave off for an ordinary photograph.',
    }),
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'heading', title: 'Heading', type: 'string' }),
    proseBody('body', 'Text'),
    defineField({ name: 'cta', title: 'Button (optional)', type: 'ctaBlock' }),
  ],
  preview: {
    select: { title: 'heading', media: 'image' },
    prepare: ({ title, media }) => ({
      title: title || 'Image + text',
      subtitle: 'Image + text',
      media,
    }),
  },
});

// ── 4. Gallery ───────────────────────────────────────────────────────────────
export const gallerySection = defineType({
  name: 'gallerySection',
  title: 'Photo gallery (grid)',
  type: 'object',
  icon: ImagesIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'images',
      title: 'Photos',
      type: 'array',
      validation: (R) => R.min(1),
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (R) => R.required(),
            }),
            defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
          ],
        }),
      ],
    }),
    columnsField('gallerySection'),
  ],
  preview: {
    select: { images: 'images', heading: 'heading' },
    prepare: ({ images, heading }) => ({
      title: heading || 'Photo gallery',
      subtitle: `Gallery${Array.isArray(images) ? ` (${images.length})` : ''}`,
      media: Array.isArray(images) && images[0] ? images[0] : ImagesIcon,
    }),
  },
});

// ── 5. Quote ─────────────────────────────────────────────────────────────────
export const quoteSection = defineType({
  name: 'quoteSection',
  title: 'Quote / testimonial',
  type: 'object',
  icon: StarIcon,
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 3,
      validation: (R) => R.required(),
    }),
    defineField({ name: 'attribution', title: 'Who said it', type: 'string' }),
    defineField({
      name: 'detail',
      title: 'Their detail (optional)',
      type: 'string',
      description: 'Context that adds credibility. Example: "Location" or "Project type".',
    }),
  ],
  preview: {
    select: { title: 'quote', subtitle: 'attribution' },
    prepare: ({ title, subtitle }) => ({
      title: title ? `"${title.slice(0, 50)}"` : 'Quote',
      subtitle: subtitle || 'Quote',
    }),
  },
});

// ── 6. Stat row ──────────────────────────────────────────────────────────────
export const statSection = defineType({
  name: 'statSection',
  title: 'Numbers row (stats)',
  type: 'object',
  icon: ThLargeIcon,
  fields: [
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({
      name: 'stats',
      title: 'Numbers',
      type: 'array',
      validation: (R) => R.max(4),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'statItem',
          fields: [
            // A NUMBER ABOUT THE RACE SHOULD COME FROM THE RACE. Typed figures
            // on this site have drifted from the data six times; the sixth was
            // this very band saying 6,500 ft and a 23rd edition under a hero
            // saying about 4,700 feet and a 24th year. Pick a source and the
            // figure is derived at render time from the measured elevation
            // profile or the course file, and cannot disagree with the rest of
            // the site. The label stays yours either way.
            //
            // THIS LIST IS MIRRORED in STAT_SOURCES in src/lib/stat-sources.ts,
            // and src/lib/stat-sources.test.ts parses this file and fails if the
            // two ever disagree. It is a logic-driving dropdown, so `source` is
            // in NON_STEGA_FIELDS in src/lib/cms-preview.ts (CLAUDE.md 8b).
            defineField({
              name: 'source',
              title: 'Where the number comes from',
              type: 'string',
              initialValue: 'manual',
              options: {
                list: [
                  { value: 'manual', title: 'Typed by hand' },
                  { value: 'elevationGain', title: 'Elevation gain (from the measured profile)' },
                  { value: 'courseDistance', title: '50K course distance (from the course file)' },
                  { value: 'loops', title: 'Number of loops (from the course file)' },
                  { value: 'edition', title: 'Edition number (from The Race)' },
                ],
                layout: 'dropdown',
              },
            }),
            defineField({
              name: 'number',
              title: 'Number',
              type: 'number',
              description: 'Only used when the source above is "Typed by hand".',
              // Hidden, not removed, when the figure is derived: the stored
              // value is the last hand-typed one and deleting it on every save
              // would make switching back to manual a retype.
              hidden: ({ parent }) => Boolean(parent?.source) && parent.source !== 'manual',
              // Required only where it is the figure. A required-and-hidden
              // field is a document that cannot be published and an editor who
              // cannot see why.
              validation: (R) =>
                R.custom((value, context) => {
                  const parent = context.parent as { source?: string } | undefined;
                  const derived = Boolean(parent?.source) && parent?.source !== 'manual';
                  if (derived) return true;
                  return typeof value === 'number' ? true : 'Required';
                }),
            }),
            defineField({
              name: 'suffix',
              title: 'Suffix (optional)',
              type: 'string',
              description: 'Optional suffix after the number. Examples: "+", "%", "yrs".',
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (R) => R.required(),
            }),
          ],
          // A PREVIEW TITLE MUST BE A STRING. Selected straight from `number`
          // this handed Sanity a real number, and Sanity lowercases the title
          // when it indexes an item for search, so opening Numbers Row threw
          // "TypeError: toLowerCase is not a function" and the whole field
          // rendered as a red Unhandled Runtime Error instead of a list
          // (2026-09-12). `prepare` is what makes the value a string, and it
          // can show the suffix too, so the row reads "10,726 ft" rather than
          // "10726".
          preview: {
            select: { number: 'number', suffix: 'suffix', label: 'label', source: 'source' },
            prepare: ({ number, suffix, label, source }) => {
              // A derived item's stored number is stale by design, so the list
              // must not print it as though it were the figure. It says where
              // the figure comes from instead.
              const derived = source && source !== 'manual';
              return {
                title: derived
                  ? 'From the data'
                  : typeof number === 'number'
                    ? `${number.toLocaleString('en-US')}${suffix ?? ''}`
                    : 'No number yet',
                subtitle: label,
              };
            },
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: 'Numbers row' }) },
});

// ── 7. CTA band ──────────────────────────────────────────────────────────────
export const ctaBandSection = defineType({
  name: 'ctaBandSection',
  title: 'Call-to-action band',
  type: 'object',
  icon: BulbOutlineIcon,
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      validation: (R) => R.required(),
    }),
    defineField({
      name: 'scriptAccent',
      title: 'Handwritten accent word (optional)',
      type: 'string',
      description:
        'One word from the headline to render in the script font. Must be a whole word from it (capitals do not matter).',
    }),
    headingAccentField(),
    defineField({
      name: 'subhead',
      title: 'Subhead',
      type: 'text',
      rows: 2,
      hidden: hideWhenRich('subheadRich'),
    }),
    richTwin('subheadRich', 'Subhead'),
    defineField({ name: 'cta', title: 'Button', type: 'ctaBlock' }),
    imageWithAlt('backgroundImage', 'Background photo (optional)'),
  ],
  preview: {
    select: { title: 'headline', media: 'backgroundImage' },
    prepare: ({ title, media }) => ({
      title: title || 'Call to action',
      subtitle: 'CTA band',
      media,
    }),
  },
});

// ── 8. Video ─────────────────────────────────────────────────────────────────
export const videoSection = defineType({
  name: 'videoSection',
  title: 'Video',
  type: 'object',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'url',
      title: 'Video link (YouTube or Vimeo)',
      type: 'url',
      validation: (R) => R.required().uri({ scheme: ['http', 'https'] }),
      description: 'Paste the share link from YouTube or Vimeo.',
    }),
    defineField({ name: 'heading', title: 'Heading (optional)', type: 'string' }),
    defineField({ name: 'caption', title: 'Caption (optional)', type: 'string' }),
  ],
  preview: {
    select: { title: 'heading', url: 'url' },
    prepare: ({ title, url }) => ({ title: title || 'Video', subtitle: url || 'Video' }),
  },
});

// ── 9. Spacer / divider ──────────────────────────────────────────────────────
export const spacerSection = defineType({
  name: 'spacerSection',
  title: 'Spacer / divider',
  type: 'object',
  icon: RemoveIcon,
  fields: [
    defineField({
      name: 'variant',
      title: 'Style',
      type: 'string',
      initialValue: 'ornament',
      options: {
        list: [
          { title: 'Accent ornament', value: 'ornament' },
          { title: 'Plain line', value: 'line' },
          { title: 'Just space (invisible)', value: 'space' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: { prepare: () => ({ title: 'Spacer / divider' }) },
});

// ── 10. Logo strip ──────────────────────────────────────────────────────────
// A row or grid of client/partner logos. SELF_CONTAINED — manages its own surface.
export const logoStripSection = defineType({
  name: 'logoStripSection',
  title: 'Logo strip (trusted by / as seen in)',
  type: 'object',
  icon: EarthGlobeIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow (optional)',
      type: 'string',
      description: 'Examples: "Trusted by" or "As seen in".',
    }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({
      name: 'logos',
      title: 'Logos',
      type: 'array',
      validation: (R) => R.min(2).max(12),
      description: 'Add between 2 and 12 logos. Each needs an alt text for screen readers.',
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description: 'Company or outlet name, for screen readers and search engines.',
              validation: (R) => R.required(),
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'row',
      options: {
        list: [
          { title: 'Row (single line, scrollable on small screens)', value: 'row' },
          { title: 'Grid (wraps across rows)', value: 'grid' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { logos: 'logos', eyebrow: 'eyebrow', headline: 'headline' },
    prepare: ({ logos, eyebrow, headline }) => ({
      title: headline || eyebrow || 'Logo strip',
      subtitle: `Logo strip${Array.isArray(logos) ? ` (${logos.length})` : ''}`,
      media: Array.isArray(logos) && logos[0] ? logos[0] : EarthGlobeIcon,
    }),
  },
});

// ── 11. Embed section ───────────────────────────────────────────────────────
// Sandboxed iframe embed. Accepts either a URL (Calendly, Cal.com, Tally, etc.)
// or raw embed code from a trusted provider. SELF_CONTAINED — manages its own surface.
//
// SECURITY NOTE: embedCode is rendered as-is on the live site. Only paste code
// from providers you trust. The same trust model applies here as for any content
// in the CMS.
export const embedSection = defineType({
  name: 'embedSection',
  title: 'Embed (form, scheduler, or widget)',
  type: 'object',
  icon: CodeBlockIcon,
  description: 'Only paste embed code from providers you trust. It renders as-is on the live site.',
  fields: [
    defineField({ name: 'eyebrow', title: 'Eyebrow (optional)', type: 'string' }),
    defineField({ name: 'headline', title: 'Headline (optional)', type: 'string' }),
    defineField({ name: 'subhead', title: 'Subhead (optional)', type: 'text', rows: 2 }),
    defineField({
      name: 'embedUrl',
      title: 'Embed URL',
      type: 'url',
      description:
        'Use for providers that embed via URL: Calendly, Cal.com, Tally, Google Forms. Paste the full URL.',
      validation: (R) => R.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'embedCode',
      title: 'Embed code (raw iframe)',
      type: 'text',
      rows: 4,
      description:
        'Use for providers that give a raw iframe snippet. Only paste from providers you trust.',
      validation: (R) =>
        R.custom((value, context) => {
          const doc = context.document as Record<string, unknown> | undefined;
          if (value && doc?.embedUrl) {
            return 'Fill in either Embed URL or Embed code, not both.';
          }
          return true;
        }),
    }),
    defineField({
      name: 'heightHint',
      title: 'Height',
      type: 'string',
      initialValue: 'medium',
      options: {
        list: [
          { title: 'Short (around 400px)', value: 'short' },
          { title: 'Medium (around 640px)', value: 'medium' },
          { title: 'Tall (around 900px)', value: 'tall' },
        ],
        layout: 'radio',
      },
    }),
  ],
  preview: {
    select: { title: 'headline', eyebrow: 'eyebrow', url: 'embedUrl' },
    prepare: ({ title, eyebrow, url }) => ({
      title: title || eyebrow || 'Embed',
      subtitle: url ? `Embed: ${url.slice(0, 50)}` : 'Embed (code snippet)',
    }),
  },
});

// ── Synced section (the authoring kit, PORTS.md card 109) ────────────────────
// "Edit once, everywhere." A synced section holds no words of its own: it points
// at a saved section (a `sectionPreset` document), and the page shows whatever
// that saved section holds today. Change the saved section, publish it, and every
// page using it changes on the next rebuild. A plain copy (the "Add a copy"
// button in the pattern picker) is the opposite: it never changes again.
//
// Rendering: the GROQ projection resolves the reference into a `sections`
// array (src/lib/queries.ts) and SectionRenderer expands it in place
// (expandSyncedSections in src/lib/authoring.ts), so the alternating-surface
// cadence runs across the expanded list exactly as if the sections were typed in.
// Like every block, it carries no colour or surface field (rule 9).
//
// Deliberately NOT in pageSectionSchemas, so a saved section can never hold a
// synced section: that is what makes a loop (A shows B shows A) impossible.
export const syncedSection = defineType({
  name: 'syncedSection',
  title: 'Synced section',
  type: 'object',
  icon: SyncIcon,
  description:
    'Shows a saved section. Edit the saved section once and every page using it changes.',
  fields: [
    defineField({
      name: 'preset',
      title: 'Saved section to show',
      type: 'reference',
      to: [{ type: 'sectionPreset' }],
      description:
        'Pick a saved section. To change what it says, open it under Pages, Saved sections, and publish: every page using it updates together.',
    }),
  ],
  preview: {
    select: { title: 'preset.title', sections: 'preset.section' },
    prepare: ({ title, sections }) => {
      const count = Array.isArray(sections) ? sections.length : 0;
      return {
        title: title ? `Synced: ${title}` : 'Synced: nothing picked yet',
        subtitle: title
          ? `${count === 1 ? '1 section' : `${count} sections`}. Edit the saved section to change every page using it.`
          : 'Pick a saved section to show here.',
      };
    },
  },
});

// ── Exports ──────────────────────────────────────────────────────────────────

// All section schema objects, to register in the schema index.
export const pageSectionSchemas = [
  // The race's own blocks. Kept in raceSections.ts so the general library
  // stays portable back to the starter, but registered here so they join
  // SECTION_TYPES and appear in every page builder.
  ...raceSectionSchemas,
  heroSection,
  richTextSection,
  imageTextSection,
  gallerySection,
  quoteSection,
  statSection,
  ctaBandSection,
  videoSection,
  spacerSection,
  logoStripSection,
  embedSection,
];

// The race's blocks and the general ones, on their own. A saved section
// accepts these but NOT a synced section; see syncedSection above.
export const LIBRARY_SECTION_TYPES = pageSectionSchemas.map((s) => ({ type: s.name }));

// The list a pageBuilder array uses for `of`. Single source of truth so every
// builder offers the same blocks: the library plus the synced section.
export const SECTION_TYPES = [...LIBRARY_SECTION_TYPES, { type: syncedSection.name }];

/**
 * Where the insert menu's grid view finds a picture of each block type (the
 * authoring kit, card 109). The pictures are shot from /styleguide/sections/ by
 * `npm run thumbnails` into public/section-thumbnails/ and served by the site
 * itself, which is the Studio's own origin. A type without a picture falls back
 * to its icon, so nothing breaks.
 */
export const sectionThumbnailUrl = (type: string): string | undefined =>
  type === 'syncedSection' ? undefined : `/section-thumbnails/${type}.jpg`;

// =============================================================================
// The grouped, searchable insert menu (2026-08-28, PORTS.md card 17)
// =============================================================================
// Every pageBuilder array shares one insert-menu configuration, so "add a
// section" reads the same everywhere: a search box, and blocks sorted into four
// plain-language groups instead of one long alphabetical list.
//
// This matters most OUTSIDE the Studio form. With the preview stack installed,
// the Presentation overlay opens this same menu IN THE CANVAS when an editor
// uses a section's insert-before/insert-after control, so the grouping is what
// an editor sees while looking at the page.
//
// `filter: true` turns on the search box. Groups list type names; a group whose
// types are all absent from a given array simply does not appear, which is what
// lets one config serve the curated per-page lists in richSections.ts. Any type
// not named in a group falls under "All".
export const SECTION_INSERT_MENU: ArrayOptions['insertMenu'] = {
  filter: true,
  // Grid first, so the picker opens on pictures of the race's own blocks; the
  // list view stays one click away and keeps the search box (card 109).
  views: [{ name: 'grid', previewImageUrl: sectionThumbnailUrl }, { name: 'list' }],
  groups: [
    {
      name: 'race',
      title: 'The race',
      of: [
        'raceHeroSection',
        'pageHeaderSection',
        'contactSection',
        'faqKioskSection',
        'distanceTicketsSection',
        'recordsBoardSection',
        'raceScheduleSection',
        'courseFeaturesSection',
        'loopCardSection',
        'elevationSection',
        'courseMapSection',
        'coursePosterSection',
        'raceWeatherSection',
        'sponsorPatchesSection',
        'tickerSection',
        'parksSection',
        'communitySection',
        'dynastiesSection',
        'gearSection',
        'photoBandSection',
      ],
    },
    {
      name: 'basics',
      title: 'Words and pictures',
      of: ['heroSection', 'richTextSection', 'imageTextSection', 'ctaBandSection', 'spacerSection'],
    },
    {
      name: 'proof',
      title: 'Quotes and numbers',
      of: ['quoteSection', 'statSection', 'logoStripSection'],
    },
    {
      name: 'media',
      title: 'Photos and video',
      of: ['gallerySection', 'videoSection', 'embedSection'],
    },
    {
      // The authoring kit (card 109). A saved section can also go in as a COPY
      // from the "Insert a saved section" button under the sections list.
      name: 'saved',
      title: 'Saved and synced',
      of: ['syncedSection'],
    },
    // Stone Steps (2026-10-18): the starter's business blocks (services grid,
    // process, story, values, founder, team, service area, testimonials,
    // guarantee, FAQ list, dynamic list) are no longer offered. They fill from
    // collections this race does not keep, and none is on any page. Their
    // types stay registered (the section-field tests read them).
  ],
};

/** The `options` block every pageBuilder array should carry. */
export const sectionArrayOptions: ArrayOptions = { insertMenu: SECTION_INSERT_MENU };

// Reusable "extra sections" field for pages that keep their own structure but
// want an append zone for library blocks. The consuming schema must declare an
// `extra` field group. SectionRenderer renders the array; self-contained blocks
// manage their own surface so no extra page context is needed.
export const additionalSectionsField = defineField({
  name: 'additionalSections',
  title: 'Extra sections',
  type: 'array',
  group: 'extra',
  description:
    'Optional. Add blocks from the library to the bottom of this page (a banner, a gallery, a call to action). Leave empty to keep the page exactly as it is.',
  of: SECTION_TYPES,
  options: sectionArrayOptions,
});
