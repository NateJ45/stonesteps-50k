// Foundation, edit with care
//
// The phone menu, as a trail sign.
//
// It used to be the starter's side drawer: a 380px sheet sliding in from the
// right with a serif tagline, a black CTA and five small links, on the page's
// own ground. Nothing about it was this race. The rest of the site is made of
// objects from the race's world (the header's sign plate, the cream tickets,
// the punch card, the rubber-stamped claim, the mud) and the menu was the one
// piece of chrome that had not been given one. It is now a full-screen board:
// bark stock in BOTH themes, contour lines and a route of prints behind, the
// five destinations set in the display face at the size of the wordmark and
// struck onto the board one at a time with the same stamp the hero uses, the
// rust Register plate underneath, and the claim stamped in the corner.
//
// Still a Radix Dialog under the hood (shadcn Sheet), so focus trapping,
// Escape, scroll locking and the aria wiring are the library's, not ours. It
// must stay client:only="react": Radix's portal hook throws "Invalid hook call"
// under Astro's SSR.
//
// ALWAYS BARK. The board pins its own palette (see `.menu-sheet` in
// globals.css) rather than reading the theme, because it is a physical object,
// like the race clock and the header's plate, and a sign does not turn cream
// when the page does. The values are the dark theme's own, so in dark mode it
// is simply the page; in light mode it is the sign the header plate promised.
//
// Data: the menu itself comes from Site Settings through the Header, the
// Facebook group from the race document, the tagline from Site Settings. All
// optional, with the same defaults the drawer had, so the menu renders cleanly
// before content is wired up.

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { IconBrandFacebook } from '@tabler/icons-react';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import ThemeToggle from './ThemeToggle';
import { externalLinkAttrs } from '@/lib/links';

// ---- Types ------------------------------------------------------------------

interface FlatNavLink {
  kind: 'flat';
  label: string;
  href: string;
}

interface DropdownNavGroup {
  kind: 'dropdown';
  label: string;
  items: { label: string; href: string }[];
}

type NavItem = FlatNavLink | DropdownNavGroup;

interface MobileNavSiteSettings {
  tagline?: string;
  email?: string;
  phone?: string;
  socialInstagram?: string;
  socialFacebook?: string;
}

interface Props {
  links: NavItem[];
  siteSettings?: MobileNavSiteSettings | null;
  /**
   * The header logo's URL, resolved by Header.astro. The island cannot import
   * the asset itself because client:only skips SSR entirely, so the parent
   * resolves it once and passes the string in.
   */
  logoLightUrl?: string;
  logoDarkUrl?: string;
  /**
   * The board's plate button. Header.astro only passes this when the editor
   * has changed it in Site Settings, so an untouched site serializes no extra
   * island props.
   */
  cta?: { show: boolean; label: string; href: string };
  /** The race's Facebook group, from the race document. */
  facebookUrl?: string;
}

/** Built-in plate button, matching the header's own default. */
const DEFAULT_CTA = { show: true, label: 'Book a consultation', href: '/contact' };

// ---- The contours ----------------------------------------------------------
// The same seeded ridge lines Topo.astro draws, in a portrait viewBox so they
// fill a phone screen without the stretch pulling them flat. Computed once at
// module load; ten quadratic paths, no asset.

const TOPO_W = 800;
const TOPO_H = 1400;

function rng(s: number) {
  let x = s * 9301 + 49297;
  return () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  };
}

function contour(offset: number, amp: number, phase: number, freq: number) {
  const steps = 20;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * TOPO_W;
    const t = (i / steps) * Math.PI * 2 * freq + phase;
    pts.push([x, offset + Math.sin(t) * amp + Math.sin(t * 2.3) * (amp * 0.35)]);
  }
  let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    if (i === pts.length - 1) {
      d += ` Q ${px.toFixed(1)},${py.toFixed(1)} ${cx.toFixed(1)},${cy.toFixed(1)}`;
    } else {
      d += ` Q ${px.toFixed(1)},${py.toFixed(1)} ${((px + cx) / 2).toFixed(1)},${((py + cy) / 2).toFixed(1)}`;
    }
  }
  return d;
}

const TOPO_PATHS = (() => {
  const rand = rng(23);
  const lines = 11;
  return Array.from({ length: lines }, (_, i) => {
    const offset = (i / (lines - 1)) * (TOPO_H * 1.15) - TOPO_H * 0.08;
    return contour(offset, 40 + rand() * 90, rand() * Math.PI * 2, 0.7 + rand() * 0.8);
  });
})();

// ---- Component --------------------------------------------------------------

export default function MobileNav({
  links,
  siteSettings,
  logoLightUrl,
  cta = DEFAULT_CTA,
  facebookUrl,
}: Props) {
  const [open, setOpen] = useState(false);
  // The current route, read on the client because this island never renders
  // on the server. It marks the destination the visitor is already on.
  const [path, setPath] = useState('');
  useEffect(() => {
    setPath(window.location.pathname);
  }, [open]);

  const tagline = siteSettings?.tagline ?? '';
  const fb = facebookUrl || siteSettings?.socialFacebook;

  const close = () => setOpen(false);
  const isCurrent = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));

  // Flatten the menu into numbered rows. A dropdown group becomes a small mono
  // heading followed by its children, each a row of its own, so the numbering
  // runs straight down the board.
  let n = 0;
  const rows: (
    { kind: 'link'; label: string; href: string; idx: number } | { kind: 'group'; label: string }
  )[] = [];
  for (const item of links) {
    if (item.kind === 'flat') {
      rows.push({ kind: 'link', label: item.label, href: item.href, idx: ++n });
    } else {
      rows.push({ kind: 'group', label: item.label });
      for (const sub of item.items) {
        rows.push({ kind: 'link', label: sub.label, href: sub.href, idx: ++n });
      }
    }
  }

  return (
    <div className="absolute top-1/2 right-6 -translate-y-1/2 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {/* A small cream plate, like the secondary buttons, rather than a
              bare icon: the header is a sign board and everything mounted on
              it is a plate. */}
          <button type="button" aria-label="Open menu" className="menu-trigger">
            <span className="menu-trigger__bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="menu-trigger__label">Menu</span>
          </button>
        </SheetTrigger>

        {/* `side="top"` so the board DROPS into place rather than sliding in
            from the edge; the height override makes it the whole screen. The
            library's own close button is switched off in favour of the plate
            below, which sits where the trigger was. */}
        <SheetContent
          side="top"
          showCloseButton={false}
          className="menu-sheet gap-0 overflow-y-auto p-0 text-base data-[side=top]:h-dvh data-[side=top]:border-b-0"
        >
          {/* The ground: contour lines and a route of prints, both decorative. */}
          <svg
            className="menu-topo"
            viewBox={`0 0 ${TOPO_W} ${TOPO_H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {TOPO_PATHS.map((d, i) => (
              <path key={i} d={d} />
            ))}
          </svg>
          <div className="menu-mud" aria-hidden="true" />

          <div className="menu-inner">
            <div className="menu-head">
              <SheetTitle className="menu-eyebrow">Menu</SheetTitle>
              {/* The mark, top centre, where the header carries it: the board
                  reads as the header opened up. One file serves both themes
                  because the board is always bark. */}
              {logoLightUrl && (
                <img
                  src={logoLightUrl}
                  alt=""
                  aria-hidden="true"
                  width={108}
                  height={180}
                  className="menu-logo"
                  decoding="async"
                />
              )}
              <SheetClose asChild>
                <button type="button" aria-label="Close menu" className="menu-close">
                  <X size={20} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </SheetClose>
            </div>

            {/* The destinations, struck onto the board one after another. Each
                row carries its index as --wi, which the shared `.stamp-word`
                animation reads for its delay: the same press the hero uses. */}
            <nav aria-label="Primary mobile" className="menu-nav">
              <ol className="menu-list">
                {rows.map((row, i) =>
                  row.kind === 'group' ? (
                    <li
                      key={`g-${row.label}`}
                      className="menu-group stamp-word"
                      style={{ '--wi': i } as React.CSSProperties}
                    >
                      {row.label}
                    </li>
                  ) : (
                    <li
                      key={row.href}
                      className="menu-item stamp-word"
                      style={{ '--wi': i } as React.CSSProperties}
                    >
                      <a
                        href={row.href}
                        onClick={close}
                        {...externalLinkAttrs(row.href)}
                        aria-current={isCurrent(row.href) ? 'page' : undefined}
                        className="menu-link"
                      >
                        <span className="menu-link__idx" aria-hidden="true">
                          {String(row.idx).padStart(2, '0')}
                        </span>
                        <span className="menu-link__label display">{row.label}</span>
                      </a>
                    </li>
                  ),
                )}
              </ol>
            </nav>

            <div className="menu-foot">
              {/* The claim, struck full width across the foot of the board,
                  directly above the one thing to do about it. */}
              {tagline && (
                <p className="claim-stamp menu-stamp">
                  <span className="claim-stamp__line">{tagline}</span>
                </p>
              )}
              {cta.show && (
                <a
                  href={cta.href}
                  onClick={close}
                  {...externalLinkAttrs(cta.href)}
                  className="btn-plate menu-cta"
                >
                  {cta.label}
                  <span className="btn-plate__arrow" aria-hidden="true">
                    &rarr;
                  </span>
                </a>
              )}

              <div className="menu-util">
                <div className="menu-util__row">
                  {fb && (
                    <a
                      href={fb}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Stone Steps Facebook group"
                      className="menu-util__btn"
                    >
                      <IconBrandFacebook size={20} stroke={1.75} aria-hidden="true" />
                    </a>
                  )}
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
