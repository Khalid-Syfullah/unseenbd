# Phase 08 of 18: Routes and trains

You are building Unseen BD. Phases 01–07 are done.

## Read first
- `FEATURES.md` §4.3–4.6
- `DESIGN.md` §5.9 and §4.5 (route card, train row)
- `data/routes.json`, `data/routes_from_dhaka.json`, `data/trains.json`, `data/reference.json` (booking links)

## Build
1. **/routes:** From/To district selects + "Show ways" → navigates to the route page (or, when no route page exists, a computed page with road distance from the planner's distance function and any direct trains found in `trains.json` stops); Dhaka → 63 districts grouped by division as route cards.
2. **/route/[slug]** (150 + computed fallback): summary tiles, bus card (terminals, arrival stand, government fare chart, AC and non-AC ranges, operators with AC chips), trains card (train rows both ways), launch card (status, vessels, fares by deck/cabin), flight card (airports, airlines, minutes, frequency), places at the destination, booking links. Every block shows its `as of` date, a confidence chip and the source links.
3. **/trains:** 120 intercity trains with name (number), from → to, departure–arrival in locale time format, weekly off day; filter by station or district; sortable by departure.
4. **/train/[slug]:** vertical stop timeline with arrival/departure and elapsed time, fare matrix (classes × segment, tabular numbers), timetable reference, sources, link to the return train, e-ticket link.
5. Metadata + `BreadcrumbList` JSON-LD.

## Done when
- `npm run check` passes; all route and train pages build in both locales; a computed route works for a pair with no route page.

## Commit
feature(routes): add routes, route pages, train list and train pages

- bus, train, launch and flight details with as-of dates, confidence and sources
- 120 train timetables with stops and fare matrices
