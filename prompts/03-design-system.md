# Phase 03 of 18: Design system components and maps

You are building Unseen BD. Phases 01–02 are done (app, tokens, data, i18n). Read `web/src` before adding to it.

## Read first
- `DESIGN.md` §2–4 in full — this phase implements §4.
- `assets/icons/`, `assets/maps/bangladesh.json`, `assets/maps/world.json`

## Build
1. **Icons:** an `<Icon name=…>` component that inlines `assets/icons/ui/*.svg`, `kinds/*` and `kinds-badge/*` (build-time import or a generated sprite), sized by prop, `currentColor`.
2. **Components** in `src/components/ui/` exactly as DESIGN.md §4 specifies, using only tokens:
   - App header (4.1) with menu sheet/dropdown, theme switch, language select, login/avatar slot
   - Bottom tab bar (4.2) with active state from the current route
   - Footer (link columns from FEATURES.md §1.6)
   - Buttons (all variants and sizes), icon button, link button
   - Filter chip row (scroll on mobile, wrap on desktop), kind badge, status tags, district chip
   - Cards: place, compact place row, district, route, train row, photo tile, post, listing, stat tile, feature card
   - Input/search, grouped district select (by division), stepper, segmented control, switch, checkbox, radio
   - Pill tabs, pagination (`1 / 6` with locale numerals), accordion, dialog + bottom sheet (focus trap, Esc), toast, skeleton, empty state, leaderboard row
3. **Maps:** `<BangladeshMap>` per §4.8 (paths from `bangladesh.json`, states default/hover/selected/visited/focus, keyboard support, optional labels, tooltip, legend, `onToggle`/`onSelect`), and `<WorldMap>` (visited / wish / none). Both server-render their SVG and hydrate for interaction.
4. **Layout:** `[lang]/layout.tsx` uses the header, tab bar and footer; content padding clears the tab bar; skip link to `main`.
5. **Component gallery:** `/[lang]/design` (noindex, linked nowhere) showing every component and state in light and dark, Bengali and English — this is how the design is reviewed.
6. **Tests:** Testing Library tests for tab bar active state, chip selection, dialog focus trap and map keyboard toggling.

## Done when
- `npm run check` passes.
- `/design` shows every component listed above; nothing uses a hard-coded colour; every interactive element has a visible focus state and ≥44 px target.

## Commit
feature(ui): build the design-system components and interactive maps

- header, menu, bottom tab bar, footer, buttons, chips, cards, form controls, tabs, dialogs, toasts
- Bangladesh and world map components with keyboard support and visited states
- /design gallery for reviewing every component in both themes and languages
