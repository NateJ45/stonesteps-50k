// scripts/check-live-links.mjs
//
// Checks every EXTERNAL link the website carries, by reading them out of the
// dataset rather than out of the source. Run weekly by
// .github/workflows/link-health.yml, or by hand:
//
//   node scripts/check-live-links.mjs
//   node scripts/check-live-links.mjs --verbose
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
//
// `npm run check:links` walks the BUILT SITE and only ever sees internal
// routes; it is explicitly configured to skip external hosts, because a link
// checker that fails the build every time a third party has a bad minute is a
// link checker everyone learns to ignore.
//
// But this site leans on other people's URLs more than most: the RunSignUp
// registration page and results page, and the Facebook group, are how a runner
// actually signs up and finds out what is happening. If RunSignUp reorganises a
// URL, the Register button, the footer and the ticket CTAs all point at a 404
// and nothing here would notice. The race would find out from a runner.
//
// So this runs on its own schedule, away from the build, and is allowed to be
// noisy: a red weekly run mails the owner and nothing is blocked.
//
// NO TOKEN. The dataset is public (see public-data-policy.json), so this reads
// it over the plain query API and can run anywhere without a secret.
// ---------------------------------------------------------------------------

const PROJECT_ID = process.env.PUBLIC_SANITY_PROJECT_ID ?? '7iynvqq6';
const DATASET = process.env.PUBLIC_SANITY_DATASET ?? 'production';
const VERBOSE = process.argv.includes('--verbose');
const TIMEOUT_MS = 15000;

/** Everything in the dataset that can hold an outside URL. */
const QUERY = `{
  "race": *[_type == "race"][0]{ registerUrl, resultsUrl, facebookUrl, gpxUrl },
  "nav": *[_type == "siteSettings"][0].headerNav[]{ label, externalUrl, href },
  "footer": *[_type == "siteSettings"][0].footerColumns[].links[]{ label, href },
  "ctas": *[defined(pageBuilder)].pageBuilder[]{
    "label": coalesce(cta.label, primaryCta.label, secondaryCta.label),
    "url": coalesce(cta.externalUrl, primaryCta.externalUrl, secondaryCta.externalUrl)
  },
  "sponsors": *[_type == "sponsor" && defined(url)]{ name, url }
}`;

async function readDataset() {
  const url =
    `https://${PROJECT_ID}.api.sanity.io/v2026-05-01/data/query/${DATASET}` +
    `?query=${encodeURIComponent(QUERY)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const { result } = await res.json();
  return result;
}

/** Only absolute http(s) links leave this site; everything else is internal. */
function isExternal(u) {
  return typeof u === 'string' && /^https?:\/\//i.test(u);
}

function collect(data) {
  const found = new Map(); // url -> Set of labels, so one URL is checked once
  const add = (label, url) => {
    if (!isExternal(url)) return;
    const key = url.trim();
    if (!found.has(key)) found.set(key, new Set());
    found.get(key).add(label || '(no label)');
  };

  const r = data.race ?? {};
  add('Register button', r.registerUrl);
  add('Full results link', r.resultsUrl);
  add('Facebook group', r.facebookUrl);
  add('Course GPX', r.gpxUrl);
  for (const n of data.nav ?? []) add(`Header: ${n.label}`, n.externalUrl ?? n.href);
  for (const f of data.footer ?? []) add(`Footer: ${f.label}`, f.href);
  for (const c of data.ctas ?? []) add(`Button: ${c.label}`, c.url);
  for (const s of data.sponsors ?? []) add(`Sponsor: ${s.name}`, s.url);
  return found;
}

/**
 * HEAD first, then GET on anything that looks like a method objection.
 *
 * Plenty of sites answer HEAD with 403/405 while serving GET perfectly well,
 * and reporting those as broken is how a checker earns its reputation for
 * crying wolf. A redirect is a pass: it resolved to something.
 */
async function probe(url) {
  const attempt = async (method) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          // Some hosts serve a bot wall to a default fetch agent. This is a
          // real browser string because the question is "does a visitor get a
          // page", not "does a script".
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
          accept: 'text/html,*/*',
        },
      });
      return { status: res.status, ok: res.ok };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const head = await attempt('HEAD');
    if (head.ok) return head;
    if ([403, 405, 404, 501].includes(head.status)) return await attempt('GET');
    return head;
  } catch (err) {
    try {
      return await attempt('GET');
    } catch (err2) {
      return { status: 0, ok: false, error: String(err2.message || err.message || err) };
    }
  }
}

async function main() {
  const data = await readDataset();
  const targets = collect(data);
  if (targets.size === 0) {
    console.log('No external links found in the dataset. Nothing to check.');
    return;
  }

  console.log(`Checking ${targets.size} external links from ${PROJECT_ID}/${DATASET}\n`);
  const failures = [];
  const unverified = [];

  // Sequential on purpose: a handful of links, and hammering someone else's
  // server in parallel to check they are up is poor manners.
  for (const [url, labels] of targets) {
    const res = await probe(url);
    const where = [...labels].join(', ');
    const detail = res.error ? String(res.error) : `HTTP ${res.status}`;

    if (res.ok) {
      if (VERBOSE) console.log(`  ok   ${res.status}  ${url}  (${where})`);
      continue;
    }

    // A DEAD LINK AND A REFUSED ONE ARE NOT THE SAME THING, and conflating them
    // is how a checker teaches people to ignore it. 404 or 410 means the page
    // is gone. No status at all means the host did not answer. Anything else,
    // typically a 400/403/429 bot wall, means the server answered and declined
    // to talk to a script; Facebook does exactly this on group URLs, which a
    // browser opens perfectly well. Those are reported and do NOT fail the run.
    if (res.status === 404 || res.status === 410 || res.status === 0) {
      console.log(`  GONE ${detail}  ${url}`);
      console.log(`       used by: ${where}`);
      failures.push({ url, detail, where });
    } else {
      console.log(`  ??   ${detail}  ${url}`);
      console.log(`       used by: ${where}  (server answered but refused a script)`);
      unverified.push({ url, detail, where });
    }
  }

  console.log('');
  if (unverified.length > 0) {
    console.log(
      `${unverified.length} link${unverified.length === 1 ? '' : 's'} could not be checked ` +
        'automatically (the host refuses scripted requests). Open them by hand now and then.',
    );
  }
  if (failures.length === 0) {
    console.log(`No broken links. ${targets.size} checked.`);
    return;
  }
  console.log(`${failures.length} of ${targets.size} external links are GONE.`);
  console.log('These are links a runner would click. Fix them in the Studio, or ask the owner.');
  process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
