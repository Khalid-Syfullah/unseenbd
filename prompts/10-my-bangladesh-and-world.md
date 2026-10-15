# Phase 10 of 18: My Bangladesh and My World

You are building Unseen BD. Phases 01–09 are done.

## Read first
- `FEATURES.md` §5.1–5.2, §5.4–5.7
- `MASTER_PROMPT.md` §5.7
- `DESIGN.md` §4.11, §5.6
- `data/reference.json` (levels)

## Build
1. **Visited store** (`src/lib/visited/`): set of district ids in localStorage, cross-tab sync via the `storage` event, a subscribe/hook API, and a sync adapter interface (account sync is phase 13; leave a no-op adapter). Same pattern for the world map (visited / wish per ISO2).
2. **/my-bangladesh:** progress card (`n / 64`, bar, %, level, next goal), district search, eight division groups of district chips with "whole division", the map (tap toggles, labels), visited list, share panel (optional name; Share / WhatsApp / Facebook / Copy link / **Short link**), challenge-a-friend link, levels ladder with badges (`assets/badges`), passport stamps grid (`assets/stamps`, unvisited at 15 %), "My Bangladesh story" (birth, upbringing, study, work, favourite selects, stored locally), "more to try" links. Leave a clearly marked slot for the card maker (phase 11).
3. **Share links:** `?v=<compact encoding of ids>&n=<name>` opens a read-only view ("Rahim has seen 13 districts") with "Make your own". **Short links:** `POST /api/share` stores only `{ids, name}` → 6-character code; `/s/[code]` redirects to the long link. Rate-limit by IP.
4. **/world:** world map (visited / want to go / clear modes), per-continent counts, country search, all-countries list with toggle buttons, share link, memory pins (country, date, note; local), leave a slot for the image maker.
5. **/challenge?c=…** landing that shows the friend's districts and a CTA.

## Done when
- `npm run check` passes; ticking districts persists across reloads and tabs; share and short links round-trip; screen readers announce pressed state on map districts.

## Commit
feature(my-map): add My Bangladesh, sharing, short links and My World

- local visited store with cross-tab sync and a pluggable account adapter
- progress, levels, passport stamps and the story section
- share and challenge links, short-link service and the world map
