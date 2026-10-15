# Phase 11 of 18: Share-card maker

You are building Unseen BD. Phases 01–10 are done. My Bangladesh and My World have a slot for the card maker.

## Read first
- `MASTER_PROMPT.md` §5.7 (card maker bullet)
- `DESIGN.md` §4.11 (card maker)
- `data/reference.json` → `share_card`, `assets/card-themes/themes.json` and previews, `assets/maps/bangladesh.json`, `assets/stamps`, `assets/badges`

## Build
1. A canvas renderer in `src/lib/card/` (no React) that draws a card from `{type, theme, size, visitedIds, name, caption, hometown, labelSize, options, pins, photo}`: types **Map / Level / Passport**, the six themes from `themes.json`, sizes 1.91:1, 4:5, 1:1, 9:16, coloured districts or district photos (use place covers), zoom to hometown, trip pins with dates and notes, the Unseen BD wordmark and a small URL line. Fonts must be loaded before drawing (Bengali text shaped correctly).
2. **Exports:** PNG (download + Web Share with files where supported); **WEBM 3D** — a 6-second animation (map tilting in 3D with districts filling in order) recorded with `MediaRecorder` from the canvas; **360°** — a spinning version. Hide unsupported formats instead of failing.
3. **Post text:** four styles (short, detailed with all district names, stylish, emoji) with hashtags in the page language; textarea + copy.
4. UI per DESIGN.md §4.11, mounted in both slots (My World uses the world map and the same themes).
5. Tests for the renderer's layout maths (sizes, safe areas) and post-text builder.

## Done when
- `npm run check` passes; every type × theme × size renders without overlap at 360 px wide; PNG export works in Chrome and Safari, WEBM where supported.

## Commit
feature(cards): add the share-card maker with PNG and video exports

- canvas renderer for map, level and passport cards in six themes and four sizes
- PNG, 3D WEBM and 360 exports, ready-made post text in four styles
