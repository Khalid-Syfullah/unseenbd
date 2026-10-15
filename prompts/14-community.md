# Phase 14 of 18: Photos, posts, suggestions and trending

You are building Unseen BD. Phases 01–13 are done.

## Read first
- `FEATURES.md` §6
- `MASTER_PROMPT.md` §5.9
- `DESIGN.md` §4.5 (photo tile, post card), §5.8 (gallery)

## Build
1. **Upload (/upload):** open to everyone; name, optional private email, up to 3 photos per batch (≤5 MB each), district, optional place (autocomplete). Resize and **re-encode in the browser** (canvas → WebP/JPEG, max 2000 px) so EXIF/GPS never leaves the device; create a thumbnail too. Server validates type and size again, stores files under `web/storage/media/` (configurable path, served by a route with long cache), status `pending`. Quota: 2 batches per day per IP with a "N more today" counter (`/api/photos/quota`).
2. **/gallery:** masonry grid of approved public photos, search by area/place/district, district select, map filter, pagination, "Add photo". **/photo/[id]:** image, district/place, uploader display name, like, comments (≤100 chars), report dialog.
3. **Posts:** signed-in users create posts (text, emoji picker, up to 4 photos through the same pipeline); feed on home and profile; likes, ★ rating (1–10), share, comments; edit/delete own.
4. **Suggestions:** "add a place from your area" and "add a famous food or product" forms → `suggestions` (pending); approved ones appear on home with likes/votes.
5. **Trending:** one vote per user (or device id when logged out) per place per season; seasonal ranking used by the home block; trend comments.
6. **Tips & corrections:** form on place/district pages → `guide_suggestions` (private).
7. Turn on the place-page buttons left disabled in phase 07.
8. Every user-generated item is `pending` until approved (admin screens in phase 15). Escape all user text; no HTML.

## Done when
- `npm run check` passes; an uploaded JPEG with GPS EXIF arrives on the server without EXIF (test); quotas and validation are enforced server-side.

## Commit
feature(community): add photo uploads, gallery, posts, suggestions and trending

- in-browser re-encoding so location data never leaves the device
- moderated photos, posts, comments, reports and visitor suggestions
- seasonal trending votes and private tips and corrections
