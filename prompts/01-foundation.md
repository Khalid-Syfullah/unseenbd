# Phase 01 of 18: Foundation

You are building **Unseen BD**, a Bengali-first travel guide for Bangladesh, described in `MASTER_PROMPT.md` (what to build), `DESIGN.md` (how it looks) and `FEATURES.md` (the full feature list). This is the first phase. The app lives in `web/`. Do not touch `data/`, `assets/`, `tools/` or `prompts/`.

## Read first
- `MASTER_PROMPT.md` §0–3 and §9
- `DESIGN.md` §2 (tokens) and §2.5 (CSS variables)
- `assets/brand/BRAND.md`

## Build
1. Scaffold a **Next.js (App Router) + TypeScript (strict)** app in `web/` with `src/`, Node 22 (`.nvmrc`), npm.
2. **Tailwind CSS v4** with the DESIGN.md tokens: put the CSS variables from §2.5 in `src/app/globals.css` (light, `[data-theme="dark"]`, and the `prefers-color-scheme` fallback with the full dark values), and expose them as Tailwind theme colours, radii, shadows and font families.
3. **Fonts:** load `tools/assets/fonts/DMSerifDisplay-Regular.ttf` and `HindSiliguri-{Regular,SemiBold,Bold}.ttf` with `next/font/local` (copy them into `web/src/fonts/` with their OFL licence files). `--font-display` and `--font-ui` must point at them.
4. **Locales:** Bengali is the default at `/…`, English at `/en/…`. Implement with an `src/app/[lang]/` segment plus `middleware.ts` that rewrites un-prefixed paths to `/bn/…` internally and leaves `/en/…` alone. Interface-only locales `zh fr de it ja` use `/zh/…` etc. and fall back to English content. Set `<html lang>` per locale.
5. **Theme:** cookie `theme=light|dark|system`; an inline no-flash script sets `data-theme` before paint.
6. **Static assets:** `web/scripts/sync-assets.mjs` copies `../assets/{brand,social,icons,illustrations,maps,places,stamps,badges,card-themes}` into `web/public/` (run on `predev` and `prebuild`; add the copied folders to `web/.gitignore`). Serve favicons, `manifest.webmanifest` (from `assets/brand`, icon paths fixed to where you put them) and `apple-touch-icon.png` from the site root.
7. **Quality gates:** ESLint (next + typescript), Prettier, Vitest (+ Testing Library, jsdom). Scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`), and **`check` = lint && typecheck && test && build**. Add one smoke test.
8. A temporary home page per locale that shows the wordmark, a sentence in the right language, a theme toggle and a language link, using the tokens (no hard-coded colours anywhere).
9. `web/README.md`: how to run, the locale scheme, the scripts.

## Done when
- `npm run check` passes in `web/`.
- `/` renders Bengali with Hind Siliguri, `/en` renders English; switching theme has no flash; dark mode follows the system when no cookie.
- Favicons and the manifest load from the root.

## Commit
feature(foundation): set up the Next.js app, tokens, fonts and locales

- Next.js App Router + TypeScript in web/ with Tailwind v4 mapped to the DESIGN.md tokens
- self-hosted DM Serif Display and Hind Siliguri, light/dark theme without flash
- bn at /, en at /en, interface locales, asset sync from /assets
- lint, typecheck, Vitest and a single `npm run check` gate
