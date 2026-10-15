# Phase 05 of 18: Explore, lists, search, near me and bucket list

You are building Unseen BD. Phases 01–04 are done.

## Read first
- `FEATURES.md` §3
- `DESIGN.md` §5.2 (explore) and §4.5 (cards), §4.8 (map)
- `MASTER_PROMPT.md` §5.3

## Build
1. **/explore:** search box, District / Type / Month selects, "only unseen" toggle, all mirrored in the URL (`?q=&district=&kind=&month=&unseen=1&page=`); the Bangladesh map filters by district on click and highlights the selection; "show district names" toggle; hide/show map; paginated place-card grid (24 per page); districts-by-division list at the end. Desktop: sticky map left, results right.
2. **/kind/[kind]** (11) and **/month/[month]** (12, wrap-around seasons) list pages with counts in the title.
3. **/unseen:** places grouped by division with counts.
4. **/best-places?division=** popular destinations with division chips.
5. **/search?q=:** one query across districts, places (bn + en names, accent/case-insensitive, simple Bengali↔Latin transliteration so "sajek" finds "সাজেক"), photos and posts; grouped results; empty and no-query states (no 404).
6. **/near-me:** start-district select or "Use my location" (Geolocation only after the click), type chips, nearest places by haversine distance, "Directions" opens Google Maps in a new tab.
7. **/bucket-list:** every place grouped by type with Want to see / Been there toggles and a ticked counter, stored in localStorage (account sync comes in phase 13 — keep the store behind one module).
8. Metadata (title/description) per page and locale.

## Done when
- `npm run check` passes; filter state survives reload and back/forward; search finds a place by Bengali and English name.

## Commit
feature(explore): add explore, type and month lists, search, near me and bucket list

- URL-synced filters with a clickable district map
- unseen and best-places lists, unified bilingual search
- geolocation-on-demand near-me list and a local bucket list
