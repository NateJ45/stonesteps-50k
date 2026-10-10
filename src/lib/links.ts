// Safe to edit by hand
//
// Attributes for a link that leaves the site. Every anchor that MIGHT carry an
// external href spreads this in, so "external links open in a new tab" is one
// rule in one place rather than a convention each component remembers or
// forgets. Internal paths, mailto: and tel: get nothing back, so the spread is
// harmless everywhere.
//
// CtaLink and PortableText already had their own version of this test; they
// keep it, because theirs also honours an editor's explicit openInNewTab.

export function externalLinkAttrs(href?: string | null) {
  if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return {};
  return { target: '_blank', rel: 'noopener noreferrer' } as const;
}

/**
 * Give an internal page path its trailing slash (`/course` -> `/course/`).
 * The site builds with `trailingSlash: 'always'`, canonicals and the sitemap
 * use the slash form, and Cloudflare answers the bare form with a redirect, so
 * every internal link is written with the slash. Anything that is not a plain
 * internal page path comes back untouched: external and protocol-relative URLs,
 * `#anchors`, `mailto:`/`tel:`, and files with an extension (`/sitemap.xml`).
 * A `?query` or `#hash` keeps the slash before it (`/results?x` -> `/results/?x`).
 * Safe to call on a value that already ends in a slash.
 */
export function withSlash<T extends string | null | undefined>(href: T): T {
  if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) return href;
  const cut = href.search(/[?#]/);
  const path = cut === -1 ? href : href.slice(0, cut);
  const rest = cut === -1 ? '' : href.slice(cut);
  if (path.endsWith('/') || /\.[a-z0-9]+$/i.test(path.split('/').pop() ?? '')) return href;
  return `${path}/${rest}` as T;
}
