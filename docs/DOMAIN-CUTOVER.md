# Pointing stonesteps50k.com at the new site

Written 2026-09-15, in answer to David's question: is standing up a new website
40 days before race day risky?

The short version: the risk is not the website, it is the DNS edit. The website
itself is read-only as far as runners are concerned, so an outage cannot cost
the race a registration. A careless DNS edit, on the other hand, could take down
the race's EMAIL, which is the one thing on this domain that would actually
hurt. Everything below is about protecting that.

---

## 1. Why the site itself is low-risk

**Registration never touches this site.** Every entry goes through RunSignUp
(`race.registerUrl` in Sanity, rendered as an outbound link). The site links
out; it does not take entries, hold a cart, or process a card. If the site were
down for a full day, registration would keep running and the only cost is that
people cannot read the course description.

**Nothing else on the site gathers data,** with one exception: the contact form
(`src/pages/api/contact.ts`). See section 3, because it is the one piece that
needs finishing before cutover.

**Results, schedule, course, history are all published content.** Worst case for
a rendering bug is that a page reads wrong, which is a ten-minute fix and a
rebuild, not a lost runner.

**The old site stays online.** Pointing a domain does not delete anything. The
previous host keeps serving until its own account is closed, so rollback is a
DNS edit, not a restore.

---

## 2. What DOES carry risk: the records around it

`stonesteps50k.com` is on **GoDaddy DNS** (`ns13/ns14.domaincontrol.com`) and
its **mail is on Microsoft 365**. That means the zone holds records that have
nothing to do with the website and must not be touched:

| Record type                                                | What it is for              | Action                             |
| ---------------------------------------------------------- | --------------------------- | ---------------------------------- |
| `MX`                                                       | Microsoft 365 mail delivery | **Do not touch**                   |
| `TXT` (SPF, DKIM, DMARC)                                   | Mail authentication         | **Do not touch**                   |
| `CNAME autodiscover`, `CNAME enterpriseregistration`, etc. | M365 service records        | **Do not touch**                   |
| `A` / `CNAME` for `@` and `www`                            | The website                 | These are the only two that change |

Deleting an MX or SPF record while "cleaning up" the zone silently breaks the
race's email, and nobody notices until a runner's question never arrives. Before
editing anything, **export or screenshot the full zone file** so the previous
state is recoverable exactly.

---

## 3. Finish the contact form first

This is the only inbound path on the site, and today it is not fully wired.
`wrangler.jsonc` has the D1 and email bindings commented out, with the reason
inline: Cloudflare Email Service needs Cloudflare DNS, and this domain is on
GoDaddy with mail on M365, so both Cloudflare mail paths are out.

The supported path for this domain is Web3Forms:

1. `npx wrangler d1 create stonesteps-contact`
2. Paste the id into `wrangler.jsonc`, uncomment the `d1_databases` block
3. `npx wrangler d1 migrations apply stonesteps-contact --remote`
4. `npx wrangler secret put WEB3FORMS_KEY`

The endpoint stores the submission in D1 first and notifies second, on purpose,
so a message survives a failed or spam-filtered send. Test it by submitting a
real message and confirming both the row and the email arrive, on the
`workers.dev` URL, before the domain moves.

---

## 4. The cutover, in order

1. **Lower the TTL** on the existing `@` and `www` records to 600 seconds, and
   wait at least the length of the OLD TTL (often 1 hour, sometimes 24) before
   step 4. This is the step people skip, and it is the one that makes rollback
   fast instead of a day-long wait.
2. **Export the zone file** from GoDaddy. Screenshot it too.
3. **Add the custom domain** in Cloudflare (Workers, then the `stonesteps-50k`
   Worker, then Domains & Routes). Cloudflare will tell you exactly which record
   value to use.
4. **Edit only the `@` and `www` records** at GoDaddy to the value Cloudflare
   gave. Leave every other record alone.
5. **Watch it land.** `dig stonesteps50k.com` and `dig www.stonesteps50k.com`
   until they answer with the new value, then load the site in a browser that
   has never seen it.
6. **Send a test email to the race address** and confirm it arrives. This is the
   check that proves the mail records survived.
7. **Turn on the uptime check**: set the `SITE_URL` repo variable to
   `https://www.stonesteps50k.com` and uncomment the `schedule:` block in
   `.github/workflows/uptime.yml`.
8. **Update `src/data/site.ts`** if the canonical host changes (apex vs `www`),
   then redeploy so canonical tags, sitemap and RSS all agree.

---

## 5. Rollback

Put the old `@` and `www` values back from the exported zone file. With the TTL
already at 600 seconds from step 1, the internet forgets the new answer within
about ten minutes. Nothing else needs undoing, because nothing else changed.

---

## 6. Timing

Do the cutover on a **weekday morning**, not the week of the race and not on a
Friday. That leaves a full business day with GoDaddy and Cloudflare support
reachable, and several weeks of ordinary traffic before race day to surface
anything the checklist missed.

The two dates to avoid are race week itself and the days right after
registration closes, when traffic peaks. Everything else in the next 40 days is
fine.
