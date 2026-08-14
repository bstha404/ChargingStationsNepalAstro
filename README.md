# EV Charging Station Nepal

Astro website for finding EV charging stations across Nepal.

## Features

- Interactive map + station list (ported from GadiCharge NetworkPage)
- Search by name, city, address, plug type
- AC / DC plug filters
- Nearby sorting via geolocation
- SEO pages for every station and city
- Sitemap + JSON-LD structured data

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Interactive network explorer |
| `/cities/` | City index |
| `/cities/[city]/` | City station list |
| `/stations/` | Full station directory |
| `/stations/[slug]/` | Station detail (SEO) |

Station data lives in `src/data/EV_Locations.json`.
