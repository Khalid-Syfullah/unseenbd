# Phase 12 of 18: Games, quizzes and leaderboards

You are building Unseen BD. Phases 01–11 are done.

## Read first
- `FEATURES.md` §5.8–5.11
- `MASTER_PROMPT.md` §5.8
- `DESIGN.md` §4.10, §5.7
- `data/reference.json` → `games`, `quizzes`; `data/districts.json` (divisions, famous_for); `assets/maps/silhouettes`, `assets/icons/games`, `assets/illustrations/game-hub.svg`

## Build
1. **Daily seed:** a deterministic generator (date + game) so everyone gets the same rounds each day; question builders in `src/lib/games/` (pure, tested).
2. **/play** with pill tabs: Ten-question sprint (district → division, 20 questions, challenge link), Photo clue (silhouette → district, 20 rounds, 4 options, +1/−1), Memory pairs (4 districts + 4 divisions, 30 s timer from first flip, daily layout, move counter), Distance duel (order 4 districts nearest → farthest from a target by centroid distance, 20 rounds). Personal best (five-round record) in localStorage.
3. **/quiz/bangladesh**, **/quiz/famous** (food/product → district from `famous_for`), **/quiz/personality** (6 picks among 4 place types → result with suggested places).
4. **Leaderboards:** `POST /api/leaderboard` accepts `{game, date, name, answers}`; the server **re-scores** the answers against the daily seed (never trusts a client score); entries need admin approval before the name shows (phase 15 adds the admin screen; store `approved=false`). `GET /api/leaderboard?game=` returns the top 100 approved. Rate-limit and validate names (length, profanity list).
5. Leaderboard card (canvas, reuse phase 11 renderer helpers) and share link.
6. Result screens per DESIGN.md §4.10; answers never rely on colour alone.

## Done when
- `npm run check` passes; seeded rounds are identical for the same date; a tampered score is rejected by the API test.

## Commit
feature(games): add the game hub, quizzes and verified leaderboards

- four daily games and three quizzes from deterministic seeds
- server-side re-scoring, moderated names, leaderboard cards
