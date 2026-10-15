# Asset generators

Node scripts that build everything in `/assets` from `/data` and the boundary files in `geo/`.

```bash
cd tools/assets
npm install
node maps.mjs      # assets/maps (run first: the others reuse maps/bangladesh.json)
node brand.mjs     # assets/brand, assets/social
node icons.mjs     # assets/icons, illustrations, stamps, badges, card-themes
node covers.mjs    # assets/places (about a minute); add slugs to render a few: node covers.mjs nilgiri-hill,lalbagh-fort
node covers.mjs --list   # show which scene each place gets
node preview.mjs out.png 240 6 file1.svg file2.webp …   # contact sheet for checking
```

| File | Does |
|---|---|
| `lib.mjs` | Palette, HarfBuzz text-to-outline (correct Bengali conjuncts), resvg rendering, seeded random |
| `maps.mjs` | Projects the boundaries (Mercator for Bangladesh, Equal Earth for the world) into SVG + JSON |
| `brand.mjs` | Mark, lockups, favicons, PWA icons, share images, manifest |
| `icons.mjs` | Icon sets, illustrations, passport stamps, level badges, card themes |
| `scene.mjs` | Sky, water, hills, trees, boats and other scene parts |
| `architecture.mjs` | Mosques, temples, stupas, forts, palaces, memorials, bridges |
| `covers.mjs` | Picks a scene per place from its type and name and renders SVG + WebP |

`geo/` holds the simplified boundaries: `bgd-districts.geojson`, `bgd-divisions.geojson` and `bgd-districts-coarse.geojson` from OCHA/BBS COD-AB Bangladesh (CC BY-IGO), and `world-countries.geojson` from Natural Earth (public domain). `fonts/` holds the OFL fonts with their licences.

Everything is seeded by slug, so re-running gives identical output.
