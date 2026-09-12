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
      {suffix && <span className="align-super text-[0.6em] text-secondary">{suffix}</span>}
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
       four on a desktop, and each number owns the line above it. */
    <div
      ref={ref}
      className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4 md:gap-x-12"
      aria-label="Race statistics"
    >
      {stats.map((stat) => (
        <React.Fragment key={stat.label}>
          <div className="border-t-2 border-[color:var(--plate-edge)] pt-4 text-center md:text-left">
            {/* text-[color:var(--primary)], NOT text-primary. The Tailwind utility
                maps to the @theme brand token, which is one constant for both
                themes; the shadcn --primary is the theme-aware one. These
                numbers sit on paper in light mode and on bark in dark, and the
                one brand rust cannot serve both: it measured 2.84:1 here on
                bark, under the 3:1 large text requires. */}
            <span className="block font-display text-[clamp(2.75rem,6.5vw,4rem)] leading-none font-normal text-[color:var(--primary)] tabular-nums">
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
