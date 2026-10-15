# Phase 17 of 18: Design and accessibility polish

You are building Unseen BD. Phases 01–16 are done. This phase reviews every screen against `DESIGN.md` and fixes what drifted.

## Read first
- `DESIGN.md` in full
- `FEATURES.md` (to confirm nothing is missing)

## Build
1. Walk every route in both locales at 360, 768 and 1280 px, light and dark. For each screen compare with DESIGN.md §5 and fix spacing, type sizes, radii, colours, grid columns, empty states and loading skeletons. Remove any hard-coded colour or font.
2. Bengali typography: line heights, no tracking, no all-caps, numerals everywhere on `/`, long-string overflow (test with the longest district and place names).
3. Accessibility pass against DESIGN.md §7: landmarks, heading order, alt text, focus order and visibility, dialogs, map keyboard support, colour contrast in both themes, 200 % zoom, reduced motion.
4. Motion pass: durations and easing from the tokens, no animation that blocks input.
5. Check every feature in `FEATURES.md` exists; list anything missing in `web/GAPS.md` and build it if it is small.
6. Add Playwright visual snapshots for home, explore, a place page, planner (sample), My Bangladesh, play and gallery at 360 and 1280 px.

## Done when
- `npm run check` passes; the snapshots are committed; `web/GAPS.md` is empty or lists only deliberate omissions.

## Commit
feature(polish): align every screen with the design system and fix accessibility

- spacing, type, colour and grid fixes across all routes and both themes
- Bengali typography and accessibility pass, visual snapshots for key screens
