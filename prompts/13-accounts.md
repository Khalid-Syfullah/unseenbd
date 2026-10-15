# Phase 13 of 18: Accounts, profile and sync

You are building Unseen BD. Phases 01–12 are done. Several features have "signed-in" hooks waiting for this phase (save plan, history, visited sync, bucket list sync).

## Read first
- `FEATURES.md` §8
- `MASTER_PROMPT.md` §5.11 and §1 (works logged-out)
- `DESIGN.md` §5.10 (profile)

## Build
1. **Auth:** email + password (argon2id hashes) and **Google Identity Services** sign-in; server sessions in a `sessions` table with an httpOnly, Secure, SameSite=Lax cookie; CSRF token on every mutating request; `/login`, `/register`, `/logout`; rate limits on auth routes; no third-party scripts except Google Identity on the login page. Env vars documented in `web/.env.example` (`GOOGLE_CLIENT_ID`, `SESSION_SECRET`, …).
2. **Sync on sign-in:** merge localStorage visited districts, bucket list, world marks and story into the account (union for sets, last-write-wins with timestamps for single values), then keep syncing through the adapters from phases 05 and 10 (debounced POSTs, retry with backoff, flush on `pagehide`/`visibilitychange`). Sign-out clears the local copies.
3. **Saved trips:** `/api/trips` CRUD; "Save plan" in the planner works; `/trip/[id]` shareable read-only view.
4. **History:** record place views; `/api/me/history` paginated.
5. **/profile:** header (avatar initial, name, @handle, Create post, My listings), pill tabs Summary (visited count, trips, photos, total spend across trips, visited map, plan-next-trip), History, Trips, Photos, My posts, Want to go, Settings (name, handle, language, theme, delete my history, delete my photos, delete account with confirmation). **/u/[handle]** public profile showing only public things.
6. Header shows the avatar when signed in.

## Done when
- `npm run check` passes; signing in after ticking districts while logged out keeps them; two browsers stay in sync; CSRF and auth rate-limit tests pass.

## Commit
feature(accounts): add sign-in, profiles, saved trips and cross-device sync

- email/password and Google sign-in with server sessions and CSRF protection
- merge-on-sign-in sync for visited districts, bucket list, world map and story
- saved trips, view history and the profile with settings and deletion
