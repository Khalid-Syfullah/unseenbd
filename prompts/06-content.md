# Phase 06 of 18: Original place and district text

You are building Unseen BD. Phases 01–05 are done. The data has facts but no prose. This phase writes short **original** text for every place and district in Bengali and English.

## Read first
- `data/places.json`, `data/districts.json`, `data/routes_from_dhaka.json`, `data/kinds.json`
- `DESIGN.md` §6 (content style)

## Rules (strict)
- Write from the facts in `data/` only: type, district, division, best months, time needed, distance and fare from Dhaka, famous foods/crafts, nearby places, coordinates. You may add widely known, uncontroversial context (for example that a haor floods in the monsoon), but **do not invent** dates, dimensions, founders, legends, prices or opening hours. If unsure, leave it out.
- Do not copy or paraphrase text from unseenbd.com or any other site.
- Bengali is written natively, not translated word by word. Plain, warm, second person.
- Mark every entry `"reviewed": false` so a human can check it later.

## Build
1. `data/content/places.json`: for each of the 257 places, bn + en: `description` (40–70 words), `how_to_get_there` (25–50 words, from the district and Dhaka route facts), `tips` (2–3 short items), `warnings` (0–2 items, only generic safety relevant to the type, e.g. slippery rocks at waterfalls, tides at beaches, monsoon closures in hill tracts).
2. `data/content/districts.json`: for each of the 64 districts, bn + en: `intro` (40–60 words) and `how_to_reach` (20–40 words).
3. Work in batches of about 30 places so each batch stays consistent; validate JSON after each batch.
4. Extend the seed to load `data/content/*.json` into the bilingual columns; pages already read them through the data layer.
5. A test that every place and district has non-empty bn and en text and that no entry contains the strings "unseenbd.com" or "অদেখা বাংলা".

## Done when
- `npm run check` passes; 257 places and 64 districts have bn + en text; `npm run db:reset` loads it.

## Commit
feature(content): write original place and district text in Bengali and English

- descriptions, directions, tips and warnings for 257 places, intros for 64 districts
- written from the facts in data/, every entry marked for human review
