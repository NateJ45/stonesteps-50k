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

  return (
    <span>
      {value.toFixed(decimals)}
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
    <div
      ref={ref}
      className="flex flex-wrap justify-center gap-8 md:gap-12"
      aria-label="Studio statistics"
    >
      {stats.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 && (
            <div className="my-2 hidden w-px self-stretch bg-border md:block" aria-hidden="true" />
          )}
          <div className="text-center">
            {/* text-[color:var(--primary)], NOT text-primary. The Tailwind utility
                maps to the @theme brand token, which is one constant for both
                themes; the shadcn --primary is the theme-aware one. These
                numbers sit on paper in light mode and on bark in dark, and the
                one brand rust cannot serve both: it measured 2.84:1 here on
                bark, under the 3:1 large text requires. */}
            <span className="block font-display text-[clamp(2.5rem,6vw,3.5rem)] leading-none font-normal text-[color:var(--primary)]">
              <AnimatedNumber
                target={stat.number}
                suffix={stat.suffix}
                duration={1800}
                run={visible}
              />
            </span>
            <span className="mt-2 block text-[0.6875rem] tracking-eyebrow text-muted-foreground uppercase">
              {stat.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
