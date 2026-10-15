# Phase 02 of 18: Data, seed, i18n and formatters

You are building Unseen BD (see `MASTER_PROMPT.md`, `DESIGN.md`). Phase 01 created the Next.js app in `web/`. Read its code first.

## Read first
- `MASTER_PROMPT.md` §4 (data model) and §6 (API surface)
- `DESIGN.md` §6 (content and formatting)
- `data/*.json` (every file), `assets/places/index.json`, `assets/maps/bangladesh.json` (shape only)

## Build
1. **Database:** Drizzle ORM + `better-sqlite3`, file `web/data/unseenbd.sqlite` (gitignored), migrations in `web/drizzle/`. Keep the schema Postgres-compatible (no SQLite-only types). Tables from MASTER_PROMPT §4: divisions, districts, places (with nullable bn/en `description`, `how_to_get_there`, `warnings`, `tips`, `accessibility`, `entry_fee`, `opening_hours`, plus `cover`, `photo` and `image_credit` JSON), kinds, months (or derive), routes (structured JSON columns), routes_from_dhaka, trains (stops and fares as child tables or JSON), curation, directory, and all user-generated tables (empty).
2. **Seed:** `npm run db:seed` builds the DB from `data/*.json` and `assets/places/index.json` (cover paths). Idempotent; runs in a few seconds. `npm run db:reset` = drop + migrate + seed.
3. **Data access layer** in `src/server/data/`: typed functions used by pages and API routes — `listPlaces({district, kind, month, unseen, q, page})`, `getPlace(slug, lang)`, `getDistrict(slug, lang)`, `listDistrictsByDivision(lang)`, `getRoute(slug, lang)`, `listRoutesFromDhaka()`, `listTrains(lang)`, `getTrain(slug, lang)`, `placesInMonth(m)`, `placesByKind(k)`, `nearby(lat,lng,limit,kind)`. Bilingual fields resolve by `lang` with English fallback.
4. **Season logic:** `inSeason(best_from, best_to, month)` handles wrap-around (e.g. 11→3). Unit-test all edge cases.
5. **i18n:** message catalogs `src/i18n/{bn,en,zh,fr,de,it,ja}.json` (zh/fr/de/it/ja can start as copies of en with the nav and common UI translated); a `t()` helper for server and client; district/division/kind/month names come from data, not catalogs. Write all UI copy fresh and short.
6. **Formatters** (`src/lib/format.ts`) with tests: Bengali numerals, `৳` currency with grouping, ranges with en dash, 12-hour time with Bengali time-of-day words (ভোর/সকাল/দুপুর/বিকাল/সন্ধ্যা/রাত), month ranges, dates `১৪ অক্টোবর, ২০২৬`, durations (`সাড়ে ১০ ঘণ্টা` / `10.5 hours`), distances.
7. **Read-only API routes** for the public endpoints in MASTER_PROMPT §6 that these functions cover (JSON, `?lang=`), with `Cache-Control` for static data.

## Done when
- `npm run check` passes; `npm run db:reset` loads 8 divisions, 64 districts, 257 places, 150 routes, 63 Dhaka summaries, 120 trains (add a test that asserts these counts).
- Formatter and season tests cover Bengali and English outputs.

## Commit
feature(data): add the database, seed, data access, i18n and formatters

- Drizzle + SQLite schema for content and user tables, idempotent seed from data/
- typed data-access functions and read-only JSON API routes
- message catalogs for 7 locales, Bengali-aware number, money, time and date formatters
- season wrap-around logic with tests
