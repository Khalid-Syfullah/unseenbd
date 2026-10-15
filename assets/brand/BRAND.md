# Unseen BD — brand basics

**Mark.** An eye holding a sunset over a river: the red sun of the flag sinking into Bangladesh's rivers, behind a low green hill. It says "unseen" (the eye) and "Bangladesh" (sun, river, green) without using the flag itself.

| File | Use |
|---|---|
| `logo-mark.svg` | App icon / avatar (rounded square) |
| `logo-mark-maskable.svg` | Full-bleed version for Android maskable icons |
| `logo-eye.svg` | The eye alone, for light backgrounds |
| `logo-eye-mono.svg` | One colour (`currentColor`) for stamps, watermarks, loaders |
| `logo-horizontal(-en|-bn)(-dark).svg` | Header lockup; `-en`/`-bn` add the tagline |
| `logo-stacked-(en|bn)(-dark).svg` | Splash screens, about page, print |
| `wordmark(-dark).svg` | Text only |
| `favicon.svg`, `favicon.ico`, `favicon-16/32/48.png` | Browser tab |
| `apple-touch-icon.png` (180), `icon-192/512.png`, `icon-maskable-192/512.png` | iOS and PWA |
| `manifest.webmanifest` | Web app manifest (paths assume icons served from `/icons/`) |
| `../social/og-default-(en|bn)(-dark).png` | 1200×630 share image |
| `../social/cover-1500x500-(en|bn).png`, `avatar-400.png` | Social profiles |

All text in the SVGs is converted to outlines, so they render the same everywhere without fonts.

## Colour

| Token | Hex | Role |
|---|---|---|
| forest | `#0E6B4E` | Primary, visited districts, theme colour |
| leaf | `#1FA06C` | Secondary green, success |
| moss | `#7DBE8E` | Hover on maps |
| sun | `#E2483A` | "BD", sun, highlights (dark mode: `#FF6F5E`) |
| marigold | `#F2A541` | Accent buttons, "want to go" |
| river | `#2E86A8` | Water, routes, links on dark |
| mist | `#CFE1F1` | Light blue surfaces, text on dark |
| clay | `#B9673F` | Earth tones, district silhouettes |
| paper | `#FBF6EC` | Light background |
| sand | `#F1E6D0` | Unvisited land on maps |
| ink | `#10172E` | Text, dark surfaces |
| night | `#0A1024` | Dark background |

Division colours (maps, charts): Rangpur `#E3B04B`, Rajshahi `#D9824B`, Mymensingh `#9A7CC0`, Sylhet `#3FA37F`, Dhaka `#D2584A`, Khulna `#2F8A6A`, Barishal `#3E98C0`, Chattogram `#5B7DBE`.

## Type

- **DM Serif Display** — wordmark and big display headings (Latin).
- **Hind Siliguri** (400/600/700) — all UI and body text, Bengali and Latin in one family.

Both are under the SIL Open Font License; the files and licences are in `tools/assets/fonts/`. Self-host them.

## Tagline

- English: *Explore all 64 districts*
- বাংলা: *৬৪ জেলা ঘুরে দেখুন*
