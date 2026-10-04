// Foundation, edit with care
//
// GET /api/forecast?date=YYYY-MM-DD: the race-day forecast, fetched from
// Open-Meteo on the Worker and cached for an hour, so a visitor's browser never
// talks to a third party and the site makes at most one upstream call an hour
// per date. Open-Meteo is free and keyless; its forecast reaches 16 days.
//
// The date is validated to today..today+15 (race-week use needs 7), which also
// bounds the cache to sixteen keys. Anything unexpected is a quiet 502: the
// page shows its history-based pack list when this has nothing to say.
//
// Coordinates are The Oval's, shared with scripts/lib/weather.mjs (the archive
// that bakes the strip). Pure parsing and wording: src/lib/forecast.ts.

import type { APIRoute } from 'astro';
import {
  forecastAdvice,
  forecastSentence,
  parseForecast,
  type Forecast,
  type OpenMeteoForecast,
} from '@/lib/forecast';

export const prerender = false;

const LAT = 39.172758;
const LNG = -84.568807;
const TZ = 'America/New_York';
const TTL = 3600;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': status === 200 ? `public, max-age=${TTL}` : 'no-store',
    },
  });

/** Today's date in the race's timezone, as YYYY-MM-DD. */
const todayInRaceTz = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());

const dayNumber = (iso: string) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);

export const GET: APIRoute = async ({ url }) => {
  const date = url.searchParams.get('date') ?? '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return json({ error: 'bad date' }, 400);
  }
  const ahead = dayNumber(date) - dayNumber(todayInRaceTz());
  if (ahead < 0 || ahead > 15) return json({ error: 'out of range' }, 400);

  // The Workers cache, keyed by date. Absent in some local runtimes: carry on.
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default;
  const key = new Request(`https://forecast.internal/${date}`);
  try {
    const hit = await cache?.match(key);
    if (hit) return hit;
  } catch {
    /* no cache available: fall through to a live fetch */
  }

  const upstream =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}` +
    `&start_date=${date}&end_date=${date}` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code` +
    `&hourly=temperature_2m&temperature_unit=fahrenheit&precipitation_unit=inch` +
    `&timezone=${encodeURIComponent(TZ)}`;

  let forecast: Forecast | null;
  try {
    const res = await fetch(upstream, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return json({ error: 'upstream' }, 502);
    forecast = parseForecast((await res.json()) as OpenMeteoForecast, date);
  } catch {
    return json({ error: 'upstream' }, 502);
  }
  if (!forecast) return json({ error: 'no forecast yet' }, 502);

  const response = json({
    ...forecast,
    summary: forecastSentence(forecast),
    advice: forecastAdvice(forecast),
    fetchedAt: new Date().toISOString(),
  });
  try {
    await cache?.put(key, response.clone());
  } catch {
    /* a failed cache write only costs the next visitor a fetch */
  }
  return response;
};
