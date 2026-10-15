# unseenbd.com — feature list, data and master prompt

A teardown of [Unseen Bangladesh / অদেখা বাংলাদেশ](https://unseenbd.com), a free 64-district travel guide, map and trip planner for Bangladesh — captured on **15 October 2026**.

| File | What it is |
|---|---|
| [`FEATURES.md`](FEATURES.md) | Every feature, page by page, as observed in the browser (bn and en) |
| [`MASTER_PROMPT.md`](MASTER_PROMPT.md) | A single prompt for an AI coding agent to build a site with the same feature set, including data model, planner/cost algorithms, API surface, SEO and acceptance tests |
| [`DESIGN.md`](DESIGN.md) | The Unseen BD design system: colour, type, spacing and motion tokens, CSS variables, every component, and wireframes of the main screens |
| [`prompts/`](prompts) | The build split into 18 numbered phases, plus `models.conf` (which model builds each phase) |
| [`.claude/skills/build-unseenbd/`](.claude/skills/build-unseenbd) | The `/build-unseenbd` skill that runs the phases one by one, checks, commits and pushes, and can redo any phase |
| [`data/`](data) | Structured data extracted from all 1,294 sitemap pages (bn + en) |
| [`assets/`](assets) | 1,123 original assets for the **Unseen BD** build: brand and app icons, district/division/world maps, icon sets, illustrations, passport stamps, level badges, card themes and an illustrated cover for each of the 257 places ([index](assets/README.md)) |
| [`scripts/extract.py`](scripts/extract.py) | Re-runs the extraction from a crawl |
| [`tools/assets/`](tools/assets) | The generators that build `assets/` |

## Build it

Open the repo in Claude Code and run:

| Command | Does |
|---|---|
| `/build-unseenbd` | Runs every unfinished phase in order, one at a time |
| `/build-unseenbd next` | Runs the next phase, then stops |
| `/build-unseenbd status` | Shows progress and the model for each phase |
| `/build-unseenbd 7` | Runs phase 7 now, out of order |
| `/build-unseenbd redo 7` | Rebuilds phase 7 (also `redo 7 9 12`) |
| `/build-unseenbd from 7` | Rebuilds phase 7 and everything after it |
| `/build-unseenbd reset 7` | Marks phase 7 unfinished without running it |

Each phase is built by a fresh subagent on the model in `prompts/models.conf` (Opus for the architecture-heavy phases, Sonnet for the rest). The skill then runs `npm run check` in `web/`, gives the builder up to two rounds to fix failures, commits with the phase's message (`feature(scope): title` + description) and pushes. Progress is kept in `.build/` and also works from a terminal: `bash .claude/skills/build-unseenbd/scripts/phase.sh status`.

| # | Phase | # | Phase |
|---|---|---|---|
| 01 | Foundation | 10 | My Bangladesh and My World |
| 02 | Data, seed, i18n and formatters | 11 | Share-card maker |
| 03 | Design system components and maps | 12 | Games, quizzes and leaderboards |
| 04 | Home page | 13 | Accounts, profile and sync |
| 05 | Explore, lists, search, near me, bucket list | 14 | Photos, posts, suggestions and trending |
| 06 | Original place and district text | 15 | Directory, owner listings and admin |
| 07 | Place and district pages | 16 | Real photos, info pages, PWA and SEO |
| 08 | Routes and trains | 17 | Design and accessibility polish |
| 09 | Trip planner and trip cost calculator | 18 | Tests, acceptance and release readiness |

## Build status

**All 18 phases are built.** The app in [`web/`](web) is ready to release.

| Gate | Result |
| --- | --- |
| `npm run check` (lint, typecheck, 558 unit and integration tests, production build) | passing |
| `npx playwright test` (22 end-to-end journeys and 20 visual snapshots at 360 and 1280 px) | passing |
| [`MASTER_PROMPT.md` §10](MASTER_PROMPT.md#10-definition-of-done) definition of done | all 6 items verified; see [`web/ACCEPTANCE.md`](web/ACCEPTANCE.md) |
| Security review (CSP, HSTS, framing, referrer and permissions policies, rate limits, input validation, secrets) | done; findings and fixes are in [`web/ACCEPTANCE.md`](web/ACCEPTANCE.md#security-review) |
| Deployment | not deployed. [`web/DEPLOY.md`](web/DEPLOY.md) covers one Ubuntu arm64 EC2 instance with nginx, pm2 and Let's Encrypt |

Still open:

- Lighthouse has to be run against the deployed site.
- Run `npm run photos` on the server to fetch the Commons place photos.
- The place and district text is marked `reviewed: false` until a person has checked it.

Progress per phase is kept in `.build/`. Run `bash .claude/skills/build-unseenbd/scripts/phase.sh status` to see it.

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
