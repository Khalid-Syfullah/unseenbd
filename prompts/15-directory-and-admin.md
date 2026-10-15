# Phase 15 of 18: Directory, owner listings and admin

You are building Unseen BD. Phases 01–14 are done.

## Read first
- `FEATURES.md` §7 and §6
- `MASTER_PROMPT.md` §5.10 and §5.12
- `DESIGN.md` §5.10 (directory, add listing)
- `data/directory_snapshot.json`, `data/reference.json` → `listing_submission_tiers`

## Build
1. **/stay** (hotels + resorts with area chips), **/restaurants**, **/shopping**: listing cards from the seeded directory plus approved owner listings; detail dialog (category, area, rating, reviews, photo source, "Open in Google Maps"); "added by owners" sections; sponsored items always labelled "বিজ্ঞাপন / Sponsored".
2. **/listings** and **/listing/[id]**: owner listings by type (business, home food, product) with prices, contact buttons (call, WhatsApp, social) and reviews.
3. **/add-listing?kind=…** per DESIGN.md §5.10: type tabs, size tier radio cards (limits from `listing_submission_tiers`), basic info, repeatable price rows, contact, photos (same upload pipeline), honeypot field, daily quota; submits as pending. **/my-listings:** status, edit, delete.
4. **Admin (/admin, role-gated):** queues for photos, posts, comments, suggestions, tips/corrections, listings, listing reviews, reports and leaderboard names (approve / reject / delete, bulk actions), editorial stars for places, daily stats (date range: visits as daily aggregates, uploads, sign-ups). Every admin action is logged. Create the first admin from a CLI script (`npm run admin:create`).
5. Daily aggregate visit counting (no cookies, no IPs stored — increment counters per path per day).

## Done when
- `npm run check` passes; a listing goes pending → approved → visible; non-admins get 404 on `/admin`.

## Commit
feature(directory): add the directory, owner listings and admin moderation

- hotels, resorts, restaurants and malls with sponsored labelling
- owner listing submissions with size tiers, prices and quotas
- role-gated admin queues, editorial stars and privacy-preserving daily stats
