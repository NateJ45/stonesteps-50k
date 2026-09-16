# Course map: what each source can give us

2026-09-16. An audit of the four sources available to the course map, what each
one uniquely holds, and what can legally and accurately be taken from it.

The short version: **OpenStreetMap is the only source we can take geometry from,
the Parks map is worth taking TEXT from, the old race map is worth taking one
question to Dave from, and Google is worth taking nothing from.**

---

## 1. What the map already has

| File                  | Contents                                                |
| --------------------- | ------------------------------------------------------- |
| `course-geo.json`     | 7 loops as 3D LineStrings, plus The Oval as a point     |
| `course-profile.json` | 972 vertices: lon, lat, elevation, mile, gradient, loop |
| `course-grade.json`   | 971 segments carrying a smoothed gradient               |
| `course-miles.json`   | 27 mile markers                                         |
| `course-map.json`     | Loop summary, 18 trails used with percentages, bounds   |

Rendered: USGS imagery, AWS Terrain DEM, the course (flat and gradient
colourings), mile markers, The Oval, a scrub cursor. 29.64 miles, 532 to 901 ft,
gradients from -22.9% to +38.4%.

---

## 2. Cincinnati Parks, "Mt. Airy Forest East Section", 2017

We have permission to use this. It is a vector PDF, 1,992 drawings, **and it
carries a hidden OCR text layer** (`HiddenHorzOCR`), so its labels extract
cleanly. An earlier note in this repo said the text was garbled; that was wrong
and came from reading the wrong stream.

### Worth taking: the official trail lengths

Not derivable from anything else we hold, and they are the park's own figures.

| Trail                 | Parks | OSM measured |                       |
| --------------------- | ----- | ------------ | --------------------- |
| Colerain Trail (A)    | 0.74  | 0.74         | exact                 |
| Blue Spruce (J)       | 0.78  | 0.78         | exact                 |
| Twin Bridge Trail (G) | 0.25  | 0.25         | 2%                    |
| Furnas Trail (F)      | 1.46  | 1.41         | 3%                    |
| Red Oak Trail (C)     | 0.82  | 0.87         | 6%                    |
| Cedar Trail (L)       | 0.37  | 0.35         | 7%                    |
| Ponderosa Trail (B)   | 3.76  | 3.37         | 10%                   |
| Beechwood Trail (H)   | 1.15  | 1.03         | 11%                   |
| Lingo Trail (K)       | 1.41  | 0.82         | truncated by our bbox |
| Quarry Trail (D)      | 2.48  | 0.65         | truncated by our bbox |
| Diehl Ridge Trail     | 1.81  | absent       | outside our bbox      |

THE AGREEMENT IS THE POINT. Seven of the eight trails that sit wholly inside our
extract match the park's own published lengths to within 11%, and two are exact.
That is independent corroboration of both sources, and it is the reason the
trail attribution on the page can be trusted.

### Worth taking: the label vocabulary

Legend categories the park uses, which are the right words for our own markers:
Park Property, Buildings, Picnic Areas, Trailhead, Bridge/Boardwalk, Trail
Marker, Steps, Stream. Plus named features: Arboretum Center, Everybody's
Treehouse, Oak Ridge Lodge, Stone Steps, The 'Nati Disc Golf.

### NOT worth taking: any geometry, and the trail-marker positions

The map shows numbered trail-marker posts (1 to 29) and it cannot be
georeferenced. Best fit against the real track is **112 ft median, 453 ft at the
90th percentile**, tried three ways, with the scale parameter drifting to the
edge of its search range. Mt. Airy's trails are closer together than that. Any
position transferred from this sheet would be confidently wrong.

---

## 3. Google Maps

**Nothing can be taken.** Google Maps Platform Terms of Service section 3.2.3
prohibits exporting, extracting or scraping Google Maps content for use outside
Google's own services. That covers geometry, place data, imagery and Street View
panoramas. It applies regardless of how the data is obtained.

What IS permitted, and what it would cost:

| Option                            | Reality                                                                                                                                               |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Link out to Google directions     | Free, already done from the race's own listing                                                                                                        |
| Embed a Google map or Street View | Allowed only inside a Google-rendered surface, via a keyed API, billed past the free tier, and a third-party script on a page that currently has none |

The only genuinely interesting thing Google holds that we do not is Street View
and user photo spheres on the trails. Embedding one at The Oval is possible and
is the only Google option worth even considering; it buys one photograph at the
cost of a key, a bill and a dependency.

---

## 4. The old race map (Cincinnati Park Board 1998, with the route drawn on)

Currently on `/course` as an image. Its base is the 1998 park sheet; the route,
arrows and labels are the race's own overlay.

### Worth taking: one question, and confirmation

- **Direction-of-travel arrows** on both loops. The GPX already encodes
  direction, so this is corroboration rather than new information, but it is
  corroboration from the race itself.
- **Numbered waypoints**: 1 to 5 on the red long loop, 1 to 3 on the blue short
  loop. Nothing else we hold explains what these are. Aid points? Marshal
  positions? Segment splits? **This is a question for Dave**, and it is the single
  most interesting unknown on the sheet.
- **"Stone Steps" and "The Oval"** called out with pointers, which confirms both
  against OSM's `Area 19, Stone Steps` and `Area 13, Oval`.
- It draws the **pre-COVID route**. Dave has said his GPX carries the reroute on
  the small loop, so this sheet is the only picture of the older line. Only
  qualitatively: the same registration failure applies.

### NOT worth taking: geometry

Same measurement as above. This is the sheet the earlier reconstruction attempt
failed on.

---

## 5. OpenStreetMap: what we are NOT yet using

This is the largest unclaimed pile, it is already fetched, and it is licensed
for use with attribution, which the page already carries.

### 19 point features sit within 160 ft of the course

| Mile | Feature                               |
| ---- | ------------------------------------- |
| 0.0  | Area 13, Oval (the start, 67 ft off)  |
| 0.3  | picnic area                           |
| 4.5  | Area 24                               |
| 5.7  | **toilets**, drinking water           |
| 6.8  | picnic area                           |
| 8.5  | **toilets**                           |
| 13.8 | picnic area                           |
| 15.4 | Braam Gazebo (shelter)                |
| 15.9 | **toilets**                           |
| 16.8 | picnic area                           |
| 19.6 | Area 23                               |
| 22.0 | Area 3 Pine Ridge, **drinking water** |
| 23.9 | Area 1                                |
| 24.7 | **drinking water**                    |
| 24.9 | Area 10 Rail Fence, drinking water    |

Toilets at miles 5.7, 8.5 and 15.9 and water at 5.7, 22.0, 24.7 and 24.9 is
exactly the information a runner wants and the site does not currently state
anywhere.

### Named landmarks OSM holds that the paper maps also name

Oak Ridge Lodge, Pine Ridge Lodge (The 'Nati Disc Golf), Meyer Lake, Braam
Gazebo, Area 19 Stone Steps, Area 13 Oval. 199 named features in total inside
the course bbox.

### NOT worth using: the numbered marker posts

OSM has 13 of them with real coordinates, and **every one is between 2,100 and
3,700 ft from the course**. They are in the Arboretum and Diehl Ridge side of
the park. The race does not pass them.

---

## Recommendations, ranked

|     | Change                                                                       | Source                        | Value                                          |
| --- | ---------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------- |
| 1   | Toilets, water and shelters as course markers, labelled by mile              | OSM                           | High, and nothing else on the site says it     |
| 2   | Official trail lengths beside the percentages in "What you run on"           | Parks                         | High, trivial, and it is the park's own figure |
| 3   | Named landmarks as map labels: The Oval, Stone Steps, the lodges, Meyer Lake | OSM                           | Medium-high                                    |
| 4   | Direction-of-travel arrows along the route                                   | GPX, confirmed by the old map | Medium                                         |
| 5   | Ask Dave what the numbered waypoints on the old map are                      | Old map                       | Unknown, costs one email                       |

Not worth doing: georeferencing either paper map, the trail-marker posts, and
anything at all from Google.
