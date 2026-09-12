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
