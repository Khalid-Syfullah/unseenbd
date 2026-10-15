# Phase 18 of 18: Tests, acceptance and release readiness

You are building Unseen BD. Phases 01–17 are done. This is the last phase.

## Read first
- `MASTER_PROMPT.md` §9 and §10 (definition of done)

## Build
1. **End-to-end tests (Playwright)** for: explore filters + map, place page actions, planner sample (exact figures), trip cost, My Bangladesh tick → share link → short link, a game round, upload flow (with an EXIF fixture), sign up → sign in → sync, language and theme switch, offline district.
2. **Acceptance checklist** `web/ACCEPTANCE.md`: go through MASTER_PROMPT §10 item by item with how each was verified.
3. **Production config:** `web/.env.example` complete; `npm run start` serves on `PORT`; health endpoint `/api/health` (DB reachable, version); structured logs; graceful shutdown; the DB file and media paths configurable for a server.
4. **Deploy notes** `web/DEPLOY.md` for a single Ubuntu EC2 instance (arm64) behind nginx with pm2, matching the owner's other sites: build steps, `db:migrate` + `db:seed` on first deploy, media and DB backups, environment variables, nginx config (gzip/brotli, caching for `/_next/static`, `/places`, `/icons`, media), Let's Encrypt. Do not run any deployment.
5. Security review: headers (CSP with only self + Google Identity on login, HSTS, frame-ancestors none, referrer policy, permissions policy with geolocation=self), rate limits, input validation, no secrets in the repo.
6. Update the repo `README.md` "Build status" section.

## Done when
- `npm run check` and `npx playwright test` pass; every item in `ACCEPTANCE.md` is checked.

## Commit
feature(release): add end-to-end tests, acceptance checklist and deploy notes

- Playwright coverage for the main journeys
- MASTER_PROMPT definition-of-done verified item by item
- production config, health check, security headers and EC2 deploy notes
