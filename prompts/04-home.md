# Phase 04 of 18: Home page

You are building Unseen BD. Phases 01–03 are done. Use the components from `src/components/ui` — do not create one-off styles.

## Read first
- `FEATURES.md` §2 (the 21 home blocks, in order)
- `DESIGN.md` §5.1 (home wireframe), §3 (imagery)
- `MASTER_PROMPT.md` §5.2

## Build
1. `/[lang]/page.tsx` server-rendered with every block from FEATURES.md §2 in that order: hero (`illustrations/hero-home.svg` as background art, display title, pitch, "free, no trackers" note, CTA buttons, search), dismissible partner banner (configurable in `src/config/site.ts`, can be turned off), directory tiles, owner "add" tiles, "my map" widget (reads visited districts from localStorage on the client; server renders the empty state), latest photos carousel, posts feed, approved visitor suggestions, trending top-10 + more trending, popular destinations with division chips, "how much have you seen" CTA, explainer, type chips, month chips + current-month section with division filter, unseen picks with "good this month", 64 districts by division with visited/unvisited underline, routes quick links, feature cards, FAQ accordion.
2. Community blocks (photos, posts, suggestions, trending) read from the DB and show the DESIGN.md empty state when there is nothing yet.
3. Division and month filters on the home sections work without a full page reload (client islands) and keep the rest server-rendered.
4. FAQ answers are written fresh (6 questions from FEATURES.md §2.21) and also emitted as `FAQPage` JSON-LD; add `WebSite` + `Organization` JSON-LD with the Unseen BD logo.
5. Both locales complete; Bengali numerals on `/`.

## Done when
- `npm run check` passes.
- Home renders at 360 px and 1280 px matching DESIGN.md §5.1, with no layout shift from images (reserved aspect ratios) and no horizontal scroll.

## Commit
feature(home): build the home page

- all 21 home sections in order, server-rendered with client islands for filters and the visited map
- empty states for community blocks, FAQ and site JSON-LD
