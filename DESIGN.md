# Unseen BD — design system

The visual design for the site in `MASTER_PROMPT.md`. It follows the same **patterns** as unseenbd.com (see `FEATURES.md`): mobile-first pages, a fixed bottom tab bar, card grids, the same pages and the same order of sections. The **look** is Unseen BD's own: its colours, type, components and art (`assets/`). It does not reuse unseenbd.com's stylesheet, logo, photos or visual identity.

Use this file as the single source of truth. When code and this file disagree, change the code.

---

## 1. Principles

1. **Thumb first.** Designed at 360 px wide, then widened. Every tap target is at least 44×44 px. Primary actions sit in the lower half of the screen on mobile.
2. **Warm and editorial.** Paper-coloured backgrounds, a serif display face for big moments, illustrated covers, generous whitespace. Never a grey admin-panel look.
3. **Bengali first.** Layouts are tested with Bengali strings, which run 15–30 % longer than English and need more line height.
4. **Data you can trust.** Fares, times and ratings always sit next to their "as of" date, confidence and source. Numbers use tabular figures.
5. **Calm motion.** Short, purposeful transitions. Everything works with `prefers-reduced-motion`.

---

## 2. Tokens

### 2.1 Colour

Brand palette (from `assets/brand/BRAND.md`): forest `#0E6B4E`, leaf `#1FA06C`, moss `#7DBE8E`, sun `#E2483A`, marigold `#F2A541`, river `#2E86A8`, mist `#CFE1F1`, clay `#B9673F`, paper `#FBF6EC`, sand `#F1E6D0`, ink `#10172E`, night `#0A1024`.

Semantic tokens — components use only these:

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FBF6EC` | `#0A1024` | Page background |
| `--bg-raised` | `#FFFFFF` | `#121A36` | Cards, sheets, header |
| `--bg-sunken` | `#F4EBDA` | `#070B1A` | Inputs, wells, table stripes |
| `--surface-2` | `#F1E6D0` | `#1C2747` | Chips, segmented controls |
| `--border` | `#E7DCC6` | `#24305A` | Hairlines, card borders |
| `--border-strong` | `#D6C7A9` | `#34437A` | Input borders, dividers |
| `--text` | `#10172E` | `#F4EEE2` | Body text |
| `--text-muted` | `#5B6475` | `#AEB8CC` | Secondary text, meta |
| `--text-subtle` | `#8A8F9C` | `#7C87A3` | Placeholders, captions |
| `--primary` | `#0E6B4E` | `#2FA57A` | Primary buttons, links in UI, selected states |
| `--primary-hover` | `#0B5A41` | `#3CB98A` | Hover / pressed |
| `--on-primary` | `#FFFFFF` | `#06140F` | Text on primary |
| `--primary-wash` | `#E3F1EA` | `#12352B` | Selected chip, active tab background |
| `--accent` | `#F2A541` | `#F2A541` | Accent buttons ("Colour my map"), highlights |
| `--on-accent` | `#2B1D05` | `#2B1D05` | Text on accent |
| `--accent-wash` | `#FDF0D9` | `#3A2A12` | Accent backgrounds, sponsored tag |
| `--sun` | `#E2483A` | `#FF6F5E` | Brand red, "BD", live/new dots |
| `--danger` | `#C93A2D` | `#FF7A6B` | Errors, wrong answers, destructive |
| `--success` | `#1FA06C` | `#3CC48A` | Correct answers, success toasts |
| `--info` | `#2E86A8` | `#5FB3D3` | Info notes, routes, water |
| `--focus` | `#2E86A8` | `#8CCBE4` | Focus ring |
| `--map-land` | `#F1E6D0` | `#1C2747` | Unvisited districts |
| `--map-border` | `#FFFFFF` | `#0A1024` | District borders |
| `--map-hover` | `#7DBE8E` | `#2C6E58` | Hovered district |
| `--map-visited` | `#0E6B4E` | `#2FA57A` | Visited district / country |
| `--map-wish` | `#F2A541` | `#F2A541` | Want-to-go country |
| `--overlay` | `rgba(16,23,46,.48)` | `rgba(0,0,0,.6)` | Behind dialogs and sheets |

Division colours (map legends, charts, stamps): rangpur `#E3B04B`, rajshahi `#D9824B`, mymensingh `#9A7CC0`, sylhet `#3FA37F`, dhaka `#D2584A`, khulna `#2F8A6A`, barishal `#3E98C0`, chattogram `#5B7DBE`.

Place-type colours (badges, markers): beach `#E9A23B`, island `#22A39A`, hill `#3E8E5E`, waterfall `#2F86B8`, forest `#2F7A3F`, river `#2D74A6`, tea `#5BA34A`, heritage `#B5653C`, spiritual `#8C62B5`, city `#5A6AA8`, village `#C2873A`.

Contrast: every text/background pair above meets WCAG AA (4.5:1 for body, 3:1 for large text and UI borders). Never put body text on `--accent` other than `--on-accent`.

### 2.2 Typography

| Role | Family | Notes |
|---|---|---|
| Display | **DM Serif Display**, Georgia, serif | Latin only: hero titles, big numbers (`13 / 64`), wordmark |
| UI and body | **Hind Siliguri**, "Noto Sans Bengali", system-ui, sans-serif | Bengali and Latin, weights 400 / 600 / 700 |
| Numbers | Hind Siliguri with `font-variant-numeric: tabular-nums` | Fares, times, counts, scores |

Self-host the fonts from `tools/assets/fonts/` (OFL) as WOFF2 with `font-display: swap`. Subset Bengali + Latin.

Scale (rem, root 16 px). Line heights are for English; add **+0.1** for Bengali (`:lang(bn)`).

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| `--fs-hero` | 3.5rem / 1.05 → 5.5rem / 1.0 at ≥1024 | Display | Home hero title |
| `--fs-display` | 2.5rem / 1.1 → 3.5rem / 1.05 | Display | Big numbers, page heroes |
| `--fs-h1` | 1.875rem / 1.25 → 2.25rem / 1.2 | 700 | Page titles |
| `--fs-h2` | 1.5rem / 1.3 → 1.75rem / 1.25 | 700 | Section titles |
| `--fs-h3` | 1.25rem / 1.35 | 600 | Card titles |
| `--fs-lg` | 1.125rem / 1.55 | 400 | Lead paragraphs |
| `--fs-base` | 1rem / 1.6 | 400 | Body |
| `--fs-sm` | 0.875rem / 1.5 | 400 / 600 | Meta, chips, buttons small |
| `--fs-xs` | 0.75rem / 1.4 | 600 | Labels, badges, legends |

Rules: no letter-spacing and no all-caps on Bengali; all-caps Latin labels only at `--fs-xs` with `+0.06em` tracking; max line length 68ch for prose; headings never wrap to more than 3 lines on mobile (shorten the copy instead).

### 2.3 Space, size, shape

- **Spacing scale** (4 px base): `--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 20 · `--s-6` 24 · `--s-8` 32 · `--s-10` 40 · `--s-12` 48 · `--s-16` 64 · `--s-20` 80 · `--s-24` 96.
- **Section rhythm:** 48 px between home sections on mobile, 80 px on desktop; 16 px between a section title and its content; 12 px between cards.
- **Radii:** `--r-xs` 6 (tags) · `--r-sm` 10 (inputs) · `--r-md` 14 (buttons) · `--r-lg` 20 (cards) · `--r-xl` 28 (sheets, hero cards) · `--r-pill` 999 (chips, tab pill).
- **Borders:** 1 px `--border`; inputs 1 px `--border-strong`; selected 2 px `--primary`.
- **Shadows (light):** `--sh-1` `0 1px 2px rgba(16,23,46,.06)` · `--sh-2` `0 4px 14px rgba(16,23,46,.08)` · `--sh-3` `0 12px 32px rgba(16,23,46,.14)`. In dark mode use borders instead of shadows except for dialogs (`0 12px 32px rgba(0,0,0,.5)`).
- **Breakpoints:** `sm` 480 · `md` 768 · `lg` 1024 · `xl` 1280.
- **Container:** max 1200 px; gutters 16 px (<768), 24 px (≥768), 32 px (≥1024).
- **Header:** 56 px mobile, 64 px desktop, sticky, `--bg-raised` at 92 % with backdrop blur, bottom hairline after 8 px of scroll.
- **Bottom tab bar:** 64 px + `env(safe-area-inset-bottom)`, always visible, `--bg-raised`, top hairline. Page content gets matching bottom padding.
- **Z-index:** header 40 · tab bar 40 · dropdown 50 · sheet/dialog 60 · toast 80.
- **Touch targets:** ≥ 44×44 px; spacing between adjacent targets ≥ 8 px.

### 2.4 Motion

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 120 ms | Hover, press, chip toggle |
| `--dur-2` | 200 ms | Dropdowns, tabs, card lift |
| `--dur-3` | 320 ms | Sheets, dialogs, page sections fading in |
| `--ease` | `cubic-bezier(.2,.7,.2,1)` | Default |
| `--ease-emph` | `cubic-bezier(.3,0,0,1)` | Sheets and dialogs entering |

Cards lift 2 px with `--sh-2` on hover (pointer devices only). Map districts transition `fill` over `--dur-1`. Quiz feedback uses a 200 ms colour change plus an icon, never shake. With `prefers-reduced-motion: reduce`, set durations to 0 and disable carousels' auto-scroll.

### 2.5 CSS variables (drop into `globals.css`)

```css
:root {
  --bg:#FBF6EC; --bg-raised:#FFFFFF; --bg-sunken:#F4EBDA; --surface-2:#F1E6D0;
  --border:#E7DCC6; --border-strong:#D6C7A9;
  --text:#10172E; --text-muted:#5B6475; --text-subtle:#8A8F9C;
  --primary:#0E6B4E; --primary-hover:#0B5A41; --on-primary:#FFFFFF; --primary-wash:#E3F1EA;
  --accent:#F2A541; --on-accent:#2B1D05; --accent-wash:#FDF0D9;
  --sun:#E2483A; --danger:#C93A2D; --success:#1FA06C; --info:#2E86A8; --focus:#2E86A8;
  --map-land:#F1E6D0; --map-border:#FFFFFF; --map-hover:#7DBE8E; --map-visited:#0E6B4E; --map-wish:#F2A541;
  --overlay:rgba(16,23,46,.48);
  --font-display:"DM Serif Display", Georgia, serif;
  --font-ui:"Hind Siliguri", "Noto Sans Bengali", system-ui, sans-serif;
  --r-xs:6px; --r-sm:10px; --r-md:14px; --r-lg:20px; --r-xl:28px; --r-pill:999px;
  --sh-1:0 1px 2px rgba(16,23,46,.06); --sh-2:0 4px 14px rgba(16,23,46,.08); --sh-3:0 12px 32px rgba(16,23,46,.14);
  --dur-1:120ms; --dur-2:200ms; --dur-3:320ms; --ease:cubic-bezier(.2,.7,.2,1); --ease-emph:cubic-bezier(.3,0,0,1);
  --header-h:56px; --tabbar-h:64px;
  color-scheme: light;
}
@media (min-width:1024px){ :root{ --header-h:64px; } }
:root[data-theme="dark"] {
  --bg:#0A1024; --bg-raised:#121A36; --bg-sunken:#070B1A; --surface-2:#1C2747;
  --border:#24305A; --border-strong:#34437A;
  --text:#F4EEE2; --text-muted:#AEB8CC; --text-subtle:#7C87A3;
  --primary:#2FA57A; --primary-hover:#3CB98A; --on-primary:#06140F; --primary-wash:#12352B;
  --accent-wash:#3A2A12; --sun:#FF6F5E; --danger:#FF7A6B; --success:#3CC48A; --info:#5FB3D3; --focus:#8CCBE4;
  --map-land:#1C2747; --map-border:#0A1024; --map-hover:#2C6E58; --map-visited:#2FA57A;
  --overlay:rgba(0,0,0,.6); --sh-1:none; --sh-2:none;
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* same values as [data-theme="dark"] */ } }
html { background:var(--bg); color:var(--text); font-family:var(--font-ui); }
:lang(bn) { line-height:1.7; letter-spacing:0; }
.num { font-variant-numeric: tabular-nums; }
:focus-visible { outline:3px solid var(--focus); outline-offset:2px; border-radius:var(--r-sm); }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { animation-duration:0s!important; transition-duration:0s!important; scroll-behavior:auto!important; } }
```

Map the same tokens into Tailwind (`theme.extend.colors` → `bg`, `raised`, `primary`, …; `borderRadius`; `boxShadow`; `fontFamily.display/ui`) so utilities and components share one source.

---

## 3. Imagery and icons

- **Place images:** `assets/places/w640/{slug}.webp` on cards, `w1200` on place pages, 3:2, `object-fit: cover`, radius `--r-lg` on cards. Always reserve the box (`aspect-ratio: 3/2`) to avoid layout shift.
- **Real photos (optional, phase 16):** 170 places have a Wikimedia Commons photo listed in `data/places.json` → `image_credit` (photographer, licence, source page). Download those originals from Commons, never from unseenbd.com, and show the credit line under the image: "Photo: {by} · {license} · Wikimedia Commons". Places without one keep the illustrated cover.
- **Community photos:** shown in a masonry grid with uploader display name and district; always behind moderation.
- **Icons:** `assets/icons/ui/*` (24 px grid, 2 px stroke, `currentColor`); place types `assets/icons/kinds/*`, coloured badges `kinds-badge/*`, map pins `markers/*`. Icon + label in navigation; icon-only buttons need an `aria-label`.
- **Illustrations:** `assets/illustrations/*` for heroes and empty states; never more than one illustration per screen.
- **Maps:** `assets/maps/bangladesh.json` / `world.json` for interactive maps (render paths in React), the SVG files for static use.

---

## 4. Components

Each component lists anatomy → sizes → states. All interactive components have hover (pointer only), active, focus-visible and disabled states.

### 4.1 App header
`[logo-mark 32] [wordmark (≥360)] ……… [Facebook] [theme] [language ▾] [Login | avatar] [☰]`
- Height `--header-h`, padding-inline = gutter. Wordmark is `logo-horizontal(-dark).svg` at 28 px tall; below 360 px show only the mark.
- Theme switch: 40×40 icon button, sun/moon icon, `role="switch"`, remembers choice in a cookie.
- Language: compact select with the current language name; changing it keeps the same path (`/x` ↔ `/en/x`).
- Login: secondary button (pill). Signed in: 36 px avatar with initial on `--accent`.
- Menu (☰) opens a right **sheet** (≥768: dropdown panel 360 px wide) with two-column link list and section dividers.

### 4.2 Bottom tab bar
Five equal items: Home · My Bangladesh · Explore · Planner · Gallery (`ui/home`, `my-map`, `explore`, `planner`, `gallery`).
- Item: icon 24 + label `--fs-xs` 600, stacked, min-width 64.
- Active: icon and label `--primary`, 3 px pill indicator above the icon (`--primary`, 24×3, radius pill), `aria-current="page"`.
- Inactive: `--text-muted`. Visible on every page and every breakpoint (desktop keeps it, centred with max-width 560 px, `--r-xl` top corners).

### 4.3 Buttons
| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| Primary | `--primary` | `--on-primary` | — | One main action per view |
| Accent | `--accent` | `--on-accent` | — | Hero / gamified CTAs ("Colour my map") |
| Secondary | `--bg-raised` | `--text` | `--border-strong` | Second actions |
| Ghost | transparent | `--primary` | — | Tertiary, inline |
| Danger | `--danger` | `#fff` | — | Delete, report confirm |
| Icon | transparent → `--surface-2` on hover | `--text` | — | 40×40, icon 20 |

Sizes: `sm` 36 px high, `--fs-sm`, padding 12; `md` 44 px, `--fs-base` 600, padding 18; `lg` 52 px, `--fs-lg` 600, padding 24. Radius `--r-md`; full-width on mobile when it is the main action. Loading state: spinner replaces the leading icon, label stays.

### 4.4 Chips and tags
- **Filter chip:** 36 px high, pill, `--surface-2`, `--fs-sm` 600; selected = `--primary-wash` fill + `--primary` text + 1.5 px `--primary` border; optional leading icon (place-type icon 16). Horizontal scroll row on mobile with 16 px edge padding and fade masks; wraps on ≥768.
- **Kind badge:** 24 px, radius `--r-xs`, place-type colour at 14 % fill, text in the full colour, icon 14 + label.
- **Status tags:** "Sponsored/বিজ্ঞাপন" (`--accent-wash` / `--on-accent`), "Good this month" (`--primary-wash` / `--primary`), "New" dot (`--sun`).
- **District chip (My Bangladesh):** 36 px pill; unvisited = `--surface-2`; visited = `--primary` fill, `--on-primary` text, leading ✓.

### 4.5 Cards
All cards: `--bg-raised`, 1 px `--border`, radius `--r-lg`, `--sh-1`; hover lift (pointer). Whole card is one link; inner buttons stop propagation.

| Card | Anatomy |
|---|---|
| **Place card** | 3:2 image (kind badge top-left, "Good this month" top-right) → title `--fs-h3` → `District · Type` `--fs-sm` muted → 2-line intro (line-clamp) → footer row: calendar icon + best months; optional ♥ / ▲ / ★ counts |
| **Compact place row** | 72×72 image, title, meta, distance or rank number at left (trending list) |
| **District card** | Locator map (`maps/districts/{slug}.svg`) 1:1 at left/top, name bn + en, place count, "famous for" first two items |
| **Route card** | `Dhaka → {district}` title, km · hours · from ৳fare, train count chip, arrow |
| **Train row** | Name + number, `from → to`, dep–arr in large tabular numbers, off-day tag |
| **Photo tile** | Image with 1 px inner border, district caption on gradient at the bottom, ♥ count |
| **Post card** | Avatar 36 + name + date, text (clamp 6 lines, "more"), photos grid (1/2/3+), action row: 👍 count · ★ x/10 · Share · Comments (n) |
| **Listing card** | Image with "Photo source" caption, category tag, ★ rating + reviews, name, area, "View details →" (opens dialog) |
| **Stat tile** | Label `--fs-sm` muted, value `--fs-display` serif (or `--fs-h1` for currency), optional delta/subtitle |
| **Feature card** | Icon in 44 px tinted circle, title, one sentence, arrow; used for the home "everything in one place" block |

Grids: 1 column <480 · 2 columns ≥480 · 3 columns ≥768 · 4 columns ≥1280 (place cards stop at 3 on pages with a sidebar). Gap 12 (mobile) / 20 (desktop).

### 4.6 Form controls
- **Input / search:** 48 px high, `--bg-sunken`, 1 px `--border-strong`, radius `--r-sm`, leading icon 20, clear button when filled; focus ring `--focus`. Search submits on Enter and has an attached primary button on wide screens.
- **Select:** native `<select>` styled like input with chevron; long lists (64 districts) grouped by division with `<optgroup>`.
- **Stepper:** `[−] value [+]`, 44 px buttons, value in tabular numbers, min/max enforced.
- **Segmented control:** (budget level, card type) 44 px, `--surface-2` track, selected segment `--bg-raised` + `--sh-1` + `--primary` text; helper text under it updates with the selection.
- **Toggle switch:** 44×26 track; on = `--primary`.
- **Checkbox / radio:** 20 px, radius 6 / round, checked `--primary`.

### 4.7 Navigation & feedback
- **Tabs (pill tabs):** row of pills (Game hub, Profile): 40 px, selected = `--text` fill / `--bg` text (light) or `--primary` (dark). Scrolls horizontally on mobile.
- **Pagination:** `[← Previous]  1 / 6  [Next →]` centred; numbers tabular; Bengali numerals in `bn`.
- **Accordion (FAQ):** 56 px rows, question 600, chevron rotates 180°, one open at a time optional.
- **Dialog / sheet:** mobile = bottom sheet with 4×36 grab handle, radius `--r-xl` top, max-height 90vh; desktop = centred dialog 560 px. Close button top-right; focus trapped; `Esc` closes.
- **Toast:** bottom, above the tab bar, `--text` fill / `--bg` text, 4 s, one at a time.
- **Skeletons:** `--surface-2` blocks with a 1.2 s shimmer (off with reduced motion).
- **Empty states:** illustration ≤ 200 px, one sentence, one action.
- **Leaderboard row:** rank (🥇🥈🥉 for top 3, else number), avatar initial, name, mode label, score `n / 20` tabular, right-aligned.

### 4.8 Map component
- Renders `bangladesh.json` paths in an SVG with `viewBox="0 0 600 760"`; scales to its container (max 520 px wide on mobile, 640 on desktop).
- District states: default `--map-land`; hover `--map-hover`; selected 2 px `--primary` stroke + `--primary-wash` fill; visited `--map-visited`; focus-visible = 3 px `--focus` stroke. Borders `--map-border` 0.8 px, division borders 1.4 px `--text` at 35 %.
- Every district path is a button (`role="button"`, `tabindex=0`, `aria-pressed` for visited, `aria-label="{name}, {division}"`); arrow keys move between neighbours in list order.
- Optional label layer (toggle "Show district names"); legend chips below (Visited / Not yet / Division colours).
- Tooltip on hover/focus: name bn + en, place count.
- World map: same rules with `world.json`, states visited / want-to-go (`--map-wish`) / none.

### 4.9 Planner components
- **Form panel:** start district select, destination multi-add (chips with ✕, "+ Add destination" select), toggles (shortest order, return), travellers stepper, budget segmented control with helper line, "Sample: Dhaka → Cox's Bazar" ghost button.
- **Summary tiles:** 4 stat tiles in a 2×2 (mobile) / 1×4 (desktop) grid: Days · Total km · Total cost · Per person; then [Save plan] primary + [Print / PDF] secondary.
- **Route map:** Bangladesh map with numbered pins (32 px circles, `--primary`, white number) and a dashed `--sun` path between them.
- **Day card:** header "Day n" chip + date-less; rows: *leg* (bus icon, `A → B`, `≈ km · h · ৳ per person`) and *sight* (kind badge, name, `District · ≈ h`); footer "Sleep in {district}" with bed icon; last day "Trip ends".
- **Cost table:** two columns (Category · ৳), zebra `--bg-sunken`, total row bold with top border, per-person row; note in `--fs-sm` muted.

### 4.10 Quiz & game components
- **Game card:** `--bg-raised`, radius `--r-xl`, padding 24; header row: mode label left, `Round n/20 · ✓ x · ✗ y · points` right (tabular).
- **Question:** `--fs-h2` centred; optional silhouette image 240 px (`maps/silhouettes/{slug}.svg`).
- **Answer option:** 56 px, full-width on mobile / 2×2 grid ≥480, `--bg-raised` + 1.5 px `--border-strong`, radius `--r-md`. States: selected → `--primary` border; correct → `--success` fill 14 % + ✓ icon; wrong → `--danger` fill 14 % + ✗ icon; others dimmed to 60 %. Never colour alone — always icon + text.
- **Memory card:** 3:4, back = forest with eye mono mark, front = district or division name; flip 320 ms 3D (fade with reduced motion); matched pair gets a ✓ badge.
- **Distance duel list:** four 56 px rows with drag handle ↕ and tap-to-order numbers 1–4; result shows true order with km.
- **Result screen:** big score `x / 20` in display serif, level/rank line, [Play again] accent, [Challenge a friend] secondary, leaderboard name entry (optional).

### 4.11 My Bangladesh components
- **Progress card:** `13 / 64` in `--fs-display` serif, progress bar (8 px, `--primary` on `--surface-2`, radius pill), `% seen`, level title, "Next goal: 25 districts".
- **Division list:** title "Rajshahi 5/8" + "Whole division" ghost button, then district chips (4.4).
- **Share panel:** name input, buttons Share / WhatsApp / Facebook / Copy link / Short link, privacy note in `--fs-sm` muted.
- **Card maker:** preview canvas left (desktop) / top (mobile) with a checkerboard frame; controls panel in labelled rows: Type, Theme (6 swatches 32 px with names), Size, Photo, Caption, Hometown, Names, toggles, Trip pins (district/date/note + Add); export row PNG · WEBM 3D · 360°; post text style select + textarea + Copy.
- **Level ladder:** 5 rows with badge (`assets/badges/*`), title, threshold; reached rows get ✓.
- **Passport:** grid of stamps (`assets/stamps/{slug}.svg`) 96 px, unvisited stamps at 15 % opacity.

---

## 5. Screens (wireframes)

Mobile at 360 px, desktop at 1280 px. `▭` = image, `[ ]` = button, `( )` = chip, `═` = section break. Section order follows `FEATURES.md`.

### 5.1 Home
```
MOBILE                                   DESKTOP
┌──────────────────────────────┐        ┌──────────────────────────────────────────────────────────────┐
│◉ Unseen BD        f ☾ বাং [K]☰│        │◉ Unseen BD                               f ☾ বাংলা▾ [Login] ☰ │
├──────────────────────────────┤        ├──────────────────────────────────────────────────────────────┤
│ hero-home illustration bg    │        │ hero-home illustration (full-bleed, 560 high)                 │
│ small kicker                 │        │  kicker                                   ┌─ My map ─────────┐│
│ Unseen                       │        │  Unseen Bangladesh  (display serif 88)    │ mini map         ││
│ Bangladesh   (serif 56)      │        │  pitch paragraph                          │ 51 still unseen  ││
│ pitch (2–3 lines)            │        │  [Colour my map][Plan next trip]          │ ▮▮▮▯▯▯ [Colour →]││
│ [Colour my map ──────────]   │        │  [Play quiz][Write a post][Add photo]     └──────────────────┘│
│ [Plan next][Play quiz]       │        │  ┌ search ─────────────────────────────[Search]┐              │
│ [Write post][Add photo]      │        ├──────────────────────────────────────────────────────────────┤
│ ┌ search ────────────── 🔍 ┐ │        │ partner banner (dismissable)                                  │
├──────────────────────────────┤        │ [Hotels] [Resorts] [Where to eat] [+Add biz][+Home food][+Prod]│
│ partner banner        ✕      │        ═══════════════════════════════════════════════════════════════
│ ▭Hotels ▭Resorts ▭Eat        │        │ Latest traveller photos                       See all →       │
│ +Add biz +Home food +Product │        │ ▭ ▭ ▭ ▭ ▭ ▭ ▭ ▭  (carousel, arrows)                          │
═══════════════════════════════         │ Traveller posts            [Create post]                      │
│ My map card (map + progress) │        │ ┌post┐┌post┐┌post┐┌post┐   ← 1 / 6 →                         │
│ Latest photos  →  ▭▭▭ (swipe)│        │ Visitor-sent places & foods (approved) ┌card┐×5               │
│ Posts (1 per row) 1/6        │        │ Trending this season: top-10 list | more trending list 1/10   │
│ Visitor suggestions (swipe)  │        │ Popular destinations ( All )( Rangpur )…  place-card grid 3×3 │
│ Trending top 10 (rows)       │        │ "How much have you seen?" CTA band (accent wash)              │
│ Popular: (chips) + cards 1col│        │ What is Unseen BD? + About →                                  │
│ How-much-seen CTA            │        │ Mood chips (11 types) · Month chips (12)                      │
│ Type chips · Month chips     │        │ Good in October: (division chips) grid 3×3 → See all          │
│ Good this month: cards       │        │ Off the beaten path: 5 cards with "Good this month"           │
│ Unseen picks: cards          │        │ 64 districts by division (8 columns of links)                 │
│ 64 districts (wrapped links) │        │ Routes: 8 quick links + Train timetable                       │
│ Routes quick links           │        │ Everything in one place: 6 feature cards (3×2)                │
│ Feature cards (1 col)        │        │ FAQ accordion (max 760 wide, centred)                         │
│ FAQ accordion                │        ├──────────────────────────────────────────────────────────────┤
│ Footer                       │        │ Footer: 5 link columns + divisions + top players + credit     │
├──────────────────────────────┤        ├──────────────────────────────────────────────────────────────┤
│ ⌂  ▦  ◎  ⇢  ▣   (tab bar)    │        │            ⌂ Home  ▦ My BD  ◎ Explore  ⇢ Planner  ▣ Gallery  │
└──────────────────────────────┘        └──────────────────────────────────────────────────────────────┘
```

### 5.2 Explore
```
┌ Places to visit in Bangladesh (h1) + one-line intro ┐
┌ search ──────────────────────────────────────────┐
[District ▾] [Type ▾]        (2 columns on mobile)
[Month ▾]    [Search]
( Only unseen )   [Hide map]
┌ map (labels toggle) ─────┐  desktop: map 40 % left sticky, results 60 % right
│ click district = filter  │
└──────────────────────────┘
Results: place cards (1 / 2 / 3 col) · Pagination
═ Districts by division (8 groups of links)
```

### 5.3 Place page
```
Breadcrumb: Explore / Division / District
▭ hero image 3:2 (mobile full-bleed, desktop 1200×800 in a 2-col layout)
credit line
(Kind badge)  Title (h1)  District · Division
[♡ Want to go] [Share] [▲ Trending · 10] [✎ Experience/warning]
Quick facts strip: 📅 best months · ⏱ time needed · 🚌 from Dhaka km / ৳  (stat chips)
── What you'll see (prose)
── How to get there (prose) + link to route page
── Editor's note: Warnings (danger-tinted callout) · Other info list
── Nearby essentials: 7 buttons (hotels, food, worship, hospital, police, ATM, toilets) → Maps
── Compare with nearby · Listen (▶ speech) · One-day trip · Checklist · Accessibility
── Embed this map (code box + Copy)
── Opening, fares and emergency
── Traveller photos (grid) [Add photo]
── More in this district (4 cards)
── Stay & eat in this district (listing cards or empty state)
[Send a tip or correction]
Desktop: right sidebar (sticky) with mini locator map, quick facts, actions.
```

### 5.4 District page
```
Breadcrumb · "{District} district: N places to visit" (h1) · Division
[Share] [✓ I've been here] [⇩ Keep offline]        locator map (right on desktop, top on mobile)
Famous for: (chip)(chip)(chip)(chip)
How to get there from Dhaka: card (bus · train · launch · flight) → route page
N places: place cards grid
Photos of {district} (masonry, 6) → gallery filter
Local businesses, home food & products (listing cards / empty)
Nearby districts: district chips
```

### 5.5 Trip planner
```
MOBILE (stacked)                       DESKTOP (2 columns: form 380 px sticky | results)
Trip planner (h1) + intro              ┌ form ───────────┐  ┌ tiles: Days | km | ৳ | per person ┐
┌ form card ──────────────┐            │ Start  [Dhaka ▾]│  [Save plan] [Print/PDF]
│ Start district          │            │ Destinations    │  ┌ route map ┐  ┌ Day 1 card ┐
│ Destinations (+ add)    │            │ (Cox ✕)(+ add)  │  │ 1 → 2 → 3 │  │ leg / sights│
│ ☑ shortest  ☑ return    │            │ ☑ shortest ☑ ret│  └───────────┘  │ sleep in … │
│ Travellers [−] 2 [+]    │            │ [−] 2 [+]       │                 ├ Day 2 card ┤
│ (Thrifty|Moderate|Plush)│            │ (T|M|P) helper  │                 ├ Day 3 card ┤
│ helper line             │            │ [Sample trip]   │  cost table (category · ৳, total, per person)
└─────────────────────────┘            └─────────────────┘  note
Empty: illustration + "Add a destination" + [Sample: Dhaka → Cox's Bazar]
Results: tiles 2×2 → buttons → map → day cards → cost table
```

### 5.6 My Bangladesh
```
My Bangladesh 🇧🇩 (h1) + intro
┌ progress card: 13 / 64 · bar · 20 % · level · next goal ┐
Pick your districts  13/64   ┌ search districts ┐
Rangpur 0/8  [Whole division]  (chip)(chip)(chip)…
… 8 division groups …
Map: "Colour the districts you've visited" (tap toggles)  · visited list
Share your Bangladesh: [name] [Share][WhatsApp][Facebook][Copy][Short link] · privacy note
Make your card: preview | controls (desktop side by side, mobile stacked)
Levels ladder · Passport stamps grid · My Bangladesh story (5 selects) · More to try (Quiz, Bucket list, World)
```

### 5.7 Game hub
```
kicker chip "New every day · five-round record"
Bangladesh Game Hub (h1 centred) + intro
(🧠 Ten-question sprint)(📸 Photo clue)(🧩 Memory pairs)(📏 Distance duel)   ← pill tabs
┌ game card (today's round) ───────────────────────────┐
│ mode label                    Round 1/20 · ✓0 ✗0 · 0 │
│ question / silhouette / cards / ordering list         │
│ options (2×2)                                        │
└───────────────────────────────────────────────────────┘
🏆 Top players · {game}  (100 players)  rows…  [Leaderboard card] [Copy/share link]
More to try: 3 feature cards (Famous foods quiz, My map, Bucket list)
```

### 5.8 Gallery
```
Photo gallery (h1) + intro                                   [Add photo]
┌ search area/place ───────────┐ [District ▾] [Search]
Desktop: map 300 px left (sticky) · masonry 3 cols right      Mobile: masonry 2 cols, map hidden behind "Map" toggle
"66 photos" count · tiles · pagination
```

### 5.9 Routes, route page, trains, train page
```
/routes: h1 + intro · [From ▾] [To ▾] [Show ways] · "Dhaka to 63 districts" grouped by division → route cards (2 col)
/route:  h1 "{A} to {B}" · summary tiles (road km · bus hours · from ৳) ·
         Bus card (terminals list, arrives at, fare chart table, AC/non-AC ranges, operators chips, as-of + confidence + sources)
         Trains card (train rows) · Launch card · Flight card · Places at {B} (cards) · Booking links
/trains: h1 + intro · filter (station/district) · train rows (sticky header on desktop table view)
/train:  h1 "{name} ({no})" · from → to · dep–arr · off day · stop timeline (vertical, times right) ·
         fare matrix table (classes × segment) · timetable ref · sources · [Return train →]
```

### 5.10 Other pages
- **Safety:** emergency number cards (big tabular numbers, tap-to-call), share-my-location card, tips list with icons, packing lists as five checklists.
- **Foreign tour:** 13 numbered country cards (region label, country, cities) → links to World and Planner.
- **Stay / Restaurants / Shopping:** area chip row → listing cards grid → "Added by owners" section → owner CTAs.
- **Add listing:** stepper-style single page: Type tabs → Size cards (radio cards) → Basic info → Prices (repeatable rows) → Contact → Photos (drop zone with count) → Submit.
- **Profile:** header (avatar, name, handle, [Create post], [My listings]) → pill tabs (Summary, History, Trips, Photos, My posts, Want to go, Settings) → Summary = 4 stat tiles + map + "plan next trip" card.
- **404:** `not-found` illustration, message, [Explore] [Home] [My Bangladesh], 64 district links.

---

## 6. Content and formatting

- Bengali pages use Bengali numerals (০–৯) everywhere, including prices (৳১,৯৩০), times (সকাল ৭:০০) and pagination; English pages use Western numerals.
- Currency: `৳` prefix, thousands separators (`৳22,200`); ranges with an en dash (`৳980–1,050`).
- Times: 12-hour with time-of-day word in Bengali (ভোর, সকাল, দুপুর, বিকাল, সন্ধ্যা, রাত); `7:00 am` in English.
- Months as names, seasons as ranges (`Nov – Mar`), wrapping across the year.
- Dates: `14 October 2026` / `১৪ অক্টোবর, ২০২৬`.
- Microcopy is short and warm; one sentence intros; buttons are verbs.

## 7. Accessibility checklist

- Landmarks: `header`, `nav` (menu and tab bar labelled differently), `main`, `footer`.
- One `h1` per page; headings in order.
- Every image has `alt` (place name + "illustration" for covers); decorative images `alt=""`.
- Colour is never the only signal (quiz answers, map states, tags carry icons/text).
- Focus visible everywhere; dialogs trap focus; `Esc` closes; skip link to `main`.
- `lang` attribute per page (`bn` / `en`); mixed-language strings wrapped in `<span lang>`.
- Text resizes to 200 % without horizontal scroll; tap targets ≥ 44 px.
