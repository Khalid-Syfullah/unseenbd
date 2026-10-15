# Gaps against FEATURES.md

Phase 17 walked every feature in `FEATURES.md` against the routes, components and data in this app. Nothing is missing. The items below differ from unseenbd.com on purpose.

- **Privacy page.** There is no separate `/privacy` URL; privacy is a section of `/about` (`/about#privacy`) and the menu and footer link straight to it.
- **Interface languages.** Bengali and English are complete. Chinese, French, German, Italian and Japanese are interface translations only, not in the sitemap (as on unseenbd.com).
- **Unmatched URLs.** A URL that matches no route shows one bilingual 404 (the locale is unknown there); `notFound()` inside a page uses the localised 404.
- **Visual snapshots** (`e2e/`, `npm run test:visual`) are rendered on macOS; regenerate them with `npm run test:visual:update` on another platform.
