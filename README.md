# unseenbd.com — feature list, data and master prompt

A teardown of [Unseen Bangladesh / অদেখা বাংলাদেশ](https://unseenbd.com), a free 64-district travel guide, map and trip planner for Bangladesh — captured on **15 October 2026**.

| File | What it is |
|---|---|
| [`FEATURES.md`](FEATURES.md) | Every feature, page by page, as observed in the browser (bn and en) |
| [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | A single prompt for an AI coding agent to build a site with the same feature set, including data model, planner/cost algorithms, API surface, SEO and acceptance tests |
| [`data/`](data) | Structured data extracted from all 1,294 sitemap pages (bn + en) |
| [`scripts/extract.py`](scripts/extract.py) | Re-runs the extraction from a crawl |

## Data at a glance

| Dataset | Records | Notes |
|---|---|---|
| `divisions.json` | 8 | bn/en names, district ids |
| `districts.json` | 64 | bn/en names, division, centroid lat/lng, famous foods & crafts (bn/en), places, Dhaka distance/fare/trains |
| `places.json` / `places.csv` | 257 | bn/en names, district, type, popular (130) / unseen (127), best months, visit hours, lat/lng (253), editorial stars, photo credit + licence (170), nearby places, Dhaka summary |
| `kinds.json` | 11 | type labels + ordered place lists |
| `months.json` | 12 | places in season per month |
| `routes_from_dhaka.json` | 63 | road km, bus hours, cheapest bus fare, direct trains |
| `routes.json` | 150 | bus (terminals, fare chart, AC/non-AC ranges, operators), trains, launches (18), flights (51), each with as-of dates, confidence and sources |
| `trains.json` | 120 | intercity trains with 1,664 stops and per-class segment fares |
| `curation.json` | — | 24 popular, 127 unseen, trending snapshot (votes/likes/comments) |
| `directory_snapshot.json` | 23 | hotels, resorts, restaurants, malls with rating and review count |
| `reference.json` | — | languages, budget levels, levels, card maker options, game/quiz rules, emergency numbers, foreign-tour countries, booking links, listing tiers |
| `community_summary.json` | — | aggregate counts only |
| `site_pages.json` | 1,297 | every crawled page with title and h1 |
| `stats.json` | — | totals |

## What was left out, on purpose

- **The site's own writing and photos.** Place descriptions, "how to get there" text, district intros, route notes and warnings are the site's original content, so this public repo stores only facts (names, ids, coordinates, seasons, fares, timetables, counts) plus photo credits. `MASTER_PROMPT.md` asks the builder to write fresh copy.
- **People.** Names, handles and photos of community members (posts, photos, leaderboards) are not stored — only totals.
- **Account data.** Nothing from any signed-in view was recorded.

## How it was collected

1. Walked through each feature in a browser, in Bengali and English.
2. Downloaded every URL in `sitemap.xml` (bn and en) at a gentle rate, honouring `robots.txt` (no `/api/` calls, no account pages). Each page embeds its data as JSON in `<script id="ob-data">`, which `scripts/extract.py` turns into the files above.
3. A few lists that render only in the browser (hotels, restaurants, malls, foreign-tour countries, emergency numbers) were copied from the rendered page into `directory_snapshot.json` and `reference.json`.

To re-run: save each sitemap URL as `<path with / replaced by __>.html` (home = `_root.html`) into a folder, download the site's `districts-*.js` asset, then

```bash
python3 -I scripts/extract.py <pages_dir> <districts-chunk.js> data
```

Fares, timetables and ratings change; check the `as_of` dates and sources before relying on them.
