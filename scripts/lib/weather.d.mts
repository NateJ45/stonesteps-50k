// Types for scripts/lib/weather.mjs, so src/lib/race-day-due.test.ts can import
// the shared decision rule without a ts directive. The script stays plain JS
// because the workflows run it with bare `node`.

export const LAT: number;
export const LNG: number;
export const TZ: string;
export const ARCHIVE_LAG_DAYS: number;

export interface RaceDayDueInput {
  raceDate?: string | null;
  asOf: string;
  knownYears: number[];
  lagDays?: number;
}

export interface RaceDayDueResult {
  due: { year: number; date: string } | null;
  reason: string;
}

export function raceDayDue(input: RaceDayDueInput): RaceDayDueResult;
export function localDate(iso: string): string | null;
export function addDays(iso: string, n: number): string;

export interface RaceDayWeather {
  year: number;
  date: string;
  high: number;
  low: number;
  startTemp: number | null;
  rainIn: number;
  prevRainIn: number;
  code: number;
}

export function fetchRaceDayWeather(day: { year: number; date: string }): Promise<RaceDayWeather>;
export function describe(w: RaceDayWeather): string;
