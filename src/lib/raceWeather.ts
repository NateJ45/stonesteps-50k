// Safe to edit by hand
//
// The race-day weather summary: pure functions over src/data/raceDayWeather.json
// so the sentence on the course page is COMPUTED from the record, never typed.
// A typed sentence is right the day it is written and wrong the year after.
//
// Unit-tested in raceWeather.test.ts.

export interface RaceDay {
  year: number;
  date: string;
  high: number;
  low: number;
  /** Temperature at the 8 am start; null when the archive had no hourly row. */
  startTemp: number | null;
  /** Rain on the day, inches. */
  rainIn: number;
  /** Rain the day before, inches: wet leaves on the steps. */
  prevRainIn: number;
  /** WMO weather code for the day. */
  code: number;
}

/** Rain worth mentioning. Below this ERA5 is reporting a trace, not weather. */
export const WET_THRESHOLD_IN = 0.05;

export const wasWet = (d: RaceDay) => d.rainIn >= WET_THRESHOLD_IN;
export const wasWetUnderfoot = (d: RaceDay) => wasWet(d) || d.prevRainIn >= WET_THRESHOLD_IN;

/** One word for a WMO code, in the site's voice. */
export function conditionLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if (code <= 48) return 'Fog';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow showers';
  return 'Storms';
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

/** A temperature as its decade, in words: 41 -> "low 40s", 55 -> "mid-50s", 68 -> "high 60s". */
export function decadeWords(t: number): string {
  const tens = Math.floor(t / 10) * 10;
  const rem = t - tens;
  const band = rem < 4 ? 'low' : rem < 7 ? 'mid' : 'high';
  return `${band}${band === 'mid' ? '-' : ' '}${tens}s`;
}

export interface WeatherSummary {
  count: number;
  firstYear: number;
  lastYear: number;
  /** Median temperature at the start. */
  typicalStart: number;
  /** Median daily high. */
  typicalHigh: number;
  coldestStart: RaceDay;
  warmestHigh: RaceDay;
  wetDays: number;
  wetUnderfootDays: number;
}

export function summarise(days: RaceDay[]): WeatherSummary | null {
  const list = days.filter((d) => Number.isFinite(d.high) && Number.isFinite(d.low));
  if (!list.length) return null;
  const starts = list.map((d) => d.startTemp ?? d.low);
  return {
    count: list.length,
    firstYear: Math.min(...list.map((d) => d.year)),
    lastYear: Math.max(...list.map((d) => d.year)),
    typicalStart: median(starts),
    typicalHigh: median(list.map((d) => d.high)),
    coldestStart: list.reduce((a, b) => ((b.startTemp ?? b.low) < (a.startTemp ?? a.low) ? b : a)),
    warmestHigh: list.reduce((a, b) => (b.high > a.high ? b : a)),
    wetDays: list.filter(wasWet).length,
    wetUnderfootDays: list.filter(wasWetUnderfoot).length,
  };
}

/** The sentence above the strip. Plain, specific, no hedging. */
export function summarySentence(s: WeatherSummary): string {
  const rain =
    s.wetDays === 0
      ? `It has not rained on race day in any of the ${s.count} years on record`
      : `Rain on ${s.wetDays} of ${s.count} race days`;
  const underfoot =
    s.wetUnderfootDays > s.wetDays
      ? `, and wet ground from the night before on ${s.wetUnderfootDays - s.wetDays} more`
      : '';
  return (
    `Typical race day: about ${s.typicalStart}°F at the 8 am start, ${decadeWords(s.typicalHigh)} by the afternoon. ` +
    `${rain}${underfoot}. Coldest start ${s.coldestStart.startTemp ?? s.coldestStart.low}°F (${s.coldestStart.year}), ` +
    `warmest afternoon ${s.warmestHigh.high}°F (${s.warmestHigh.year}).`
  );
}

/** Scale for the strip: a shared floor and ceiling, rounded out to the nearest 10. */
export function tempScale(days: RaceDay[]): { min: number; max: number } {
  const lows = days.map((d) => Math.min(d.low, d.startTemp ?? d.low));
  const highs = days.map((d) => d.high);
  return {
    min: Math.floor((Math.min(...lows) - 2) / 10) * 10,
    max: Math.ceil((Math.max(...highs) + 2) / 10) * 10,
  };
}
