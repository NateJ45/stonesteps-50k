import React, { useEffect, useRef, useState } from 'react';

interface StatItem {
  number: number;
  suffix?: string;
  label: string;
}

interface Props {
  stats: StatItem[];
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function AnimatedNumber({
  target,
  suffix,
  duration,
  run,
}: {
  target: number;
  suffix?: string;
  duration: number;
  run: boolean;
}) {
  // A target with a decimal keeps it. The counter used to round to whole
  // numbers, which quietly turned the 50K's measured 30.8 mile course into
  // "31" and put the stats band into open disagreement with the distance
  // tickets, which carry the same figure from the same timing sheets. A stat
  // that rounds away the interesting part of a number is worse than no stat.
  const decimals = Number.isInteger(target) ? 0 : 1;
  const factor = 10 ** decimals;
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const hasStarted = useRef(false);
  const reduceMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  useEffect(() => {
    if (!run) return;
    if (reduceMotion) {
      setValue(target);
      return;
    }
    if (hasStarted.current) return;
    hasStarted.current = true;

    const animate = (time: number) => {
      if (!startTimeRef.current) startTimeRef.current = time;
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(Math.round(easeOutQuart(progress) * target * factor) / factor);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [run, target, duration, reduceMotion, factor]);

  /* GROUPED, because the rest of the site writes 10,726 ft and a figure table
     that says 10724 looks like a different number rather than the same one
     mid-count. toLocaleString does the separator; the min/max fraction digits
     keep 30.8 at one decimal and 10,726 at none, which is what `decimals`
     already worked out from whether the target is a whole number. */
  return (
    <span>
      {value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {/* THE UNIT IS THE SECOND INK (2026-09-17). It was `text-secondary`, the
          forest green, which is the one hue in this palette that does no work
          anywhere else in the typography: every other small mark that ranks
          under a figure on this site (the feature numerals, the blaze, the
          accent word in a heading) is set in `--heading-accent`. Rust on the
          cream page, gold on the bark page, chosen against the ground in both,
          so FT and MI now read as a second pass of ink under the number rather
          than as a third colour nobody introduced on purpose. */}
      {suffix && <span className="text-heading-accent align-super text-[0.6em]">{suffix}</span>}
    </span>
  );
}

export default function StatsCounter({ stats }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    /* A TABLE OF FIGURES, NOT A ROW OF BADGES. Centred numbers separated by
       vertical hairlines is the default treatment on every small business site,
       and it reads as a widget dropped into the page. Ranging them left under a
       rule each turns them into what they actually are: four measurements of
       the same race, set the way a broadsheet sets data. It also lets the
       labels wrap without knocking the numbers out of alignment, which the
       centred version could not do.

       The rule is per figure rather than one line across the row, so the
       reading order is unambiguous at every breakpoint: two columns on a phone,
       four on a desktop, and each number owns the line above it.

       THE RULE IS THE TICKETS' TEAR LINE NOW (2026-09-17). It was 2px of
       `--plate-edge`, which is the literal black a plate's border is cut in,
       and on the bark page that put a near-invisible black hairline over a
       near-black ground: the one figure-table detail that vanished in half the
       site's themes. A dashed rule is already this site's idiom for a line
       something is meant to come apart along, and the tickets a screen above
       wear the same one. It is drawn in `.stat-figure` in globals.css so the
       weight and the colour are decided against the page rather than by a
       token borrowed from an object. */
    <div
      ref={ref}
      className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-12"
      aria-label="Race statistics"
    >
      {stats.map((stat) => (
        <React.Fragment key={stat.label}>
          <div className="stat-figure pt-4 text-center md:text-left">
            {/* `display`, NOT `font-display` (2026-09-17), and the class carries
                more than the face. It hands the numeral `--display-shadow`,
                which is the site's offset rule expressed as a token: nothing on
                the cream page, where the lettering is the darker of the two and
                an offset thickens the letterforms into misregistered printing;
                the hard offset on bark, where it is the lighter one and the
                offset is a real shadow. The archive year on /results made the
                same call the same day and its note in globals.css has the long
                version.

                AND THE NUMERAL IS THE PAGE INK NOW, not `--primary`. The rust
                was here to keep the band on brand and it is what made it read
                as a widget: four rust numerals in a row is the stat-counter
                every small business template ships. The colour moves to the
                unit instead, where it ranks a small mark under a big one, which
                is the job the second ink does everywhere else on this site. The
                ink measures about 15:1 on both grounds, so the 3:1 large-text
                floor the old rust value had to be tuned to (see git history for
                the 2.84:1 measurement that forced #b8462f) is no longer a
                constraint on this band at all. */}
            <span className="display block text-[clamp(3.25rem,8vw,5rem)] text-foreground tabular-nums">
              <AnimatedNumber
                target={stat.number}
                suffix={stat.suffix}
                duration={1800}
                run={visible}
              />
            </span>
            <span className="mx-auto mt-3 block max-w-[22ch] text-[0.6875rem] leading-snug tracking-eyebrow text-muted-foreground uppercase md:mx-0">
              {stat.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
