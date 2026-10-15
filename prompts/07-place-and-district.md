# Phase 07 of 18: Place and district pages

You are building Unseen BD. Phases 01–06 are done (including the bilingual text).

## Read first
- `FEATURES.md` §3.2–3.3
- `DESIGN.md` §5.3–5.4
- `MASTER_PROMPT.md` §5.3 (place and district bullets)

## Build
1. **/place/[slug]** (257, statically generated per locale): breadcrumb, cover (`w1200`, or the real photo once phase 16 adds it) with credit line, kind badge, title, district · division; actions Want to go (bucket-list store), Share (Web Share API → copy link), Add to trending (count; wired to the API in phase 14 — show the button disabled until then), Write an experience or warning (opens the tips form, phase 14); quick-facts strip; sections: what you'll see, how to get there (+ link to `/route/{district}-to-dhaka` or the Dhaka route), editor's note (warnings callout + other info), nearby essentials (7 Google Maps search buttons around the coordinates), compare with nearby places, **listen** (Web Speech API in the page language, hidden if unsupported), one-day nearby trip (2–3 nearby places), pre-trip checklist by type, accessibility notes, **embed this map** (iframe snippet + copy), opening/fees/emergency box, traveller photos, more in this district, stay & eat in this district (listings or empty state), send a tip/correction. Desktop sticky sidebar with locator map and actions.
2. **/district/[slug]** (64): title with place count, division, locator map, Share / I've been here (visited store) / Keep offline (cache via service worker in phase 16 — wire the button to a no-op with a toast until then), famous-for chips, how to get there from Dhaka (bus, train, launch, flight summary from routes data), places grid, photos, local listings, nearby districts (by centroid distance).
3. `generateMetadata` with titles in the pattern from MASTER_PROMPT §7, OpenGraph image = the cover, `TouristAttraction` + `GeoCoordinates` + `BreadcrumbList` JSON-LD on place pages.
4. Record a view in the user's history when signed in (no-op until phase 13 — call one function).

## Done when
- `npm run check` passes; all 257 × 2 place pages and 64 × 2 district pages build; Lighthouse accessibility ≥ 95 on one place page.

## Commit
feature(places): add place and district pages

- full place guide with actions, essentials, listen, embed and nearby sections
- district guide with famous-for chips, how-to-reach and nearby districts
- metadata and structured data for both
