// The shared "is this actually confirmed?" flag.
//
// WHY THIS EXISTS. The design mockup carried a hand-placed <Provisional>
// component wherever a value had been invented rather than sourced. That works
// exactly once: it relies on a developer remembering to delete the marker on
// the day the real value arrives, and nothing fails if they forget. The failure
// mode is a race site quietly publishing a made-up start time as fact.
//
// Making it a FIELD inverts that. Content defaults to unconfirmed and announces
// itself in the UI until someone ticks the box in the Studio, so the burden sits
// with the person who actually knows the answer, and the marker cannot be left
// behind by accident. Anything unconfirmed is also excluded from the JSON-LD, so
// Google is never told a provisional time.
//
// Foundation, edit with care. This one generalises to every project in the
// fleet and is a candidate for PORTS.md.

import { defineField } from 'sanity';

/**
 * A `confirmed` boolean, defaulting to false.
 *
 * @param description Editor-facing guidance naming who confirms this document.
 */
export function confirmedField(description: string) {
  return defineField({
    name: 'confirmed',
    title: 'Confirmed by the race director',
    type: 'boolean',
    initialValue: false,
    description,
    // Config, not prose. Keep the Canvas AI out of it.
    options: { canvasApp: { exclude: true } },
  });
}
