# Phase 09 of 18: Trip planner and trip cost calculator

You are building Unseen BD. Phases 01–08 are done.

## Read first
- `MASTER_PROMPT.md` §5.4 and §5.5 — implement the model **exactly**, including the acceptance figures
- `DESIGN.md` §4.9 and §5.5
- `data/districts.json` (centroids), `data/reference.json` (budget levels)

## Build
1. **Pure engine** `src/lib/planner/` (no React): leg distance (haversine × road factor 1.3, 1.45 for Bandarban/Khagrachhari/Rangamati, +8 km, round to 5, min 10; prefer real `road_km` from routes when present), leg hours, ordering (brute force ≤7, else nearest-neighbour + 2-opt, with/without return), default sights, day packing (9-hour days, sight = hours + 0.5), costs by level (low/mid/high constants from §5.4), rooms ⌈people/2⌉, misc 8 % → 50, total → 100. Also the calculator from §5.5.
2. **Unit tests** that reproduce: Dhaka → Cox's Bazar, 2 people, mid, return → 3 days, 840 km, leg fare ৳1,930, transport 7,720, stay 6,000, food 5,400, local 1,400, misc 1,650, total ৳22,200 (৳11,100 pp); calculator 2 people, 2 nights, mid, round trip → ৳25,200. Plus ordering and day-packing edge cases.
3. **/plan** UI per DESIGN.md §5.5: form, sample button, summary tiles, route map with numbered pins and dashed path, day cards, cost table, note; state in the URL (`?from=1&to=19,14&people=2&level=mid&ret=1&order=1`) so plans are shareable; **Print / PDF** with a print stylesheet; **Save plan** posts to `/api/trips` when signed in (phase 13 wires accounts — show "sign in to save" until then).
4. **/trip-cost** UI per FEATURES.md §4.2 with "Add to trip plan" → `/plan?add=<district>`.

## Done when
- `npm run check` passes with the acceptance tests; the sample plan renders the same numbers in the UI in both locales (Bengali numerals on `/`).

## Commit
feature(planner): add the trip planner and trip cost calculator

- pure planning engine with route ordering, day packing and the three budget levels
- acceptance tests for the Dhaka to Cox's Bazar figures
- shareable URL state, print view and save hook
