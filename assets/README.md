# Unseen BD — assets

1,123 original files for building the site described in [`../MASTER_PROMPT.md`](../MASTER_PROMPT.md). Everything here was generated from code in [`../tools/assets`](../tools/assets), so it can be changed and rebuilt. Text inside SVGs is converted to outlines, so the files look the same without fonts installed.

## Brand — `brand/`, `social/`

The Unseen BD mark (an eye holding a red sun setting over a river), lockups in English and Bengali, light and dark, plus every icon size a web app needs. Colours, fonts and usage are in [`brand/BRAND.md`](brand/BRAND.md).

- `brand/logo-mark.svg`, `logo-mark-maskable.svg`, `logo-eye.svg`, `logo-eye-mono.svg`
- `brand/logo-horizontal(-en|-bn)(-dark).svg`, `logo-stacked-(en|bn)(-dark).svg`, `wordmark(-dark).svg`
- `brand/favicon.svg`, `favicon.ico`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192/512.png`, `icon-maskable-192/512.png`, `manifest.webmanifest`
- `social/og-default-(en|bn)(-dark).png` (1200×630), `cover-1500x500-(en|bn).png`, `avatar-400.png`

## Maps — `maps/`

| File | What it is |
|---|---|
| `bangladesh-districts.svg` | 64 clickable districts: `<path id="d-{slug}" class="district" data-id data-slug data-division>` with a `<title>`, plus division borders. Add the class `visited` (or `aria-pressed="true"`) to colour a district |
| `bangladesh-districts-labelled-(en|bn).svg` | Same, with district names |
| `bangladesh-divisions(-labelled-en|-labelled-bn).svg` | 8 divisions in their division colours |
| `bangladesh.json` | Path data, label points and bounding boxes for every district and division, for drawing the map in React/Canvas |
| `bangladesh-outline.svg` | Country silhouette |
| `districts/{slug}.svg` (64) | Locator map: the district highlighted inside its division |
| `silhouettes/{slug}.svg` (64) | One district alone, centred, for the "photo clue" game |
| `world-countries.svg`, `world.json` | 241 shapes (204 countries) with ISO codes, continent, English and Bengali names, Equal Earth projection; classes `visited` and `wish` for the "My world" map |

District slugs and ids match `data/districts.json`.

## Icons — `icons/`

- `kinds/` (11) — place-type line icons: beach, island, hill, waterfall, forest, river & haor, tea, heritage, religious site, city & park, village.
- `kinds-badge/` (11) and `markers/` (11) — the same in coloured circles and map pins.
- `ui/` (55) — navigation and interface icons (home, my map, explore, planner, gallery, world, search, like, vote, rating, share, bus, train, launch, flight, stay, food, cost, safety, passport and more). All 24×24, 2px stroke, `currentColor`.
- `games/` (7) — the four games and three quizzes.

## Illustrations — `illustrations/`

`hero-home`, `game-hub`, `planner`, `upload`, `safety`, `empty-map`, `not-found`.

## Gamification — `stamps/`, `badges/`, `card-themes/`

- `stamps/{slug}.svg` (64) — a passport stamp per district: Bengali and English names, district shape, number, tinted by division.
- `badges/level-1-explorer … level-5-legend.svg` — levels at 10, 25, 40, 50 and 64 districts.
- `card-themes/themes.json` + six previews (Dusk, Dawn, Jamdani, Padma, Earth, Mist) for the share-card maker.

## Place covers — `places/`

One illustrated cover for each of the 257 places, 1200×800 (3:2):

- `svg/{slug}.svg` — vector source
- `w1200/{slug}.webp` and `w640/{slug}.webp` — ready to serve
- `index.json` — for each place, the scene, variant and light (`day`, `dawn`, `golden`, `mist`, `dusk`, `monsoon`)

Each cover is drawn from the place's type and name: 76 variants, including sultanate and modern mosques, the Sixty Dome Mosque's rows of domes, terracotta shikhara, nabaratna and jor-bangla temples, Buddhist zedis and kyangs, forts, terraced viharas, zamindar palaces of different sizes, colonial kuthis, memorials, haors, water-lily beels, stony rivers under the hills, tea gardens, swamp and mangrove forests, waterfalls, beaches, islands and village fields. The light follows the place's best season. These are stylised illustrations, not depictions of the exact buildings; swap in real photos later by keeping the same file names.

## Sources and licences

- District and division boundaries: OCHA / Bangladesh Bureau of Statistics COD-AB (CC BY-IGO), simplified. Credit "Boundaries: BBS, OCHA" where the maps are shown.
- World map: Natural Earth 1:50m (public domain).
- Fonts used for outlines: DM Serif Display and Hind Siliguri (SIL Open Font License, files in `tools/assets/fonts/`).
- Everything else in this folder is original to this repository.
