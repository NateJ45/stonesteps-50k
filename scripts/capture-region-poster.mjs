// =============================================================================
// capture-region-poster.mjs - bake the still of the wider area for /contact
// =============================================================================
// The "coming from out of town" band on /contact used to show a SCREENSHOT OF
// GOOGLE MAPS, uploaded to the CMS. It is the picture that answers "where is
// this relative to where I would sleep", and it was the one image on a site
// that draws its own terrain map of the course which was not ours. Somebody
// else's map, somebody else's type, somebody else's colours, in the middle of a
// page of ours.
//
// So it is the same map, pulled back until Mt. Airy Forest, downtown
// Cincinnati and the CVG airport are all in the frame, with the three of them
// pinned in the map's own marker style. Flat, not pitched: at this range the
// picture is about distance and direction, and the hills are a different
// picture (see the course poster, which is pitched into them on purpose).
//
// IT IS A WRAPPER, NOT A SECOND PIPELINE. Everything hard here - waiting for
// tiles AND terrain to land, hiding the interactive chrome, the ladder of
// widths, the reserved-box JSON - lives in capture-map-poster.mjs and is easy
// to get subtly wrong twice. This file sets three environment variables and
// hands over. Anything set on the command line still wins, so the camera can be
// auditioned without editing anything:
//
//   npm run build
//   npm run map-region
//   POSTER_CAMERA="z=11.1&dy=0.01" npm run map-region
//
// The camera's committed default lives with the composition it belongs to, in
// CourseMapLibre.tsx's poster block, for the same reason the course poster's
// does: the poster is THIS map at THIS camera, not a second rendering that
// quietly disagrees with it.
//
// THE FRAME IS 4:3 rather than the course poster's 8:5. This one sits in half a
// band on /contact, beside four lines of text, and a wide letterbox in a half
// column is a slot. The three pins span about 0.14 of latitude and 0.16 of
// longitude, so latitude is what sets the zoom at this shape.
// =============================================================================

process.env.POSTER_NAME ??= 'region-poster';
process.env.POSTER_SIZE ??= '1000x750';
// Appended rather than assigned, so an audition camera passed in from the
// command line survives and simply lands after the region flag.
process.env.POSTER_CAMERA = ['region=1', process.env.POSTER_CAMERA].filter(Boolean).join('&');

await import('./capture-map-poster.mjs');
