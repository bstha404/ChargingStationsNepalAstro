# EV Charging Station Nepal

Map-first directory for finding electric vehicle charging stations across Nepal.

**Live site:** [https://evchargingstationnepal.com](https://evchargingstationnepal.com)

Search by name, city, or address; filter AC/DC plugs; sort by nearby location; and open directions to each station. Every station and city has its own SEO page.

## Features

- Interactive map and station list (Leaflet)
- Search by station name, city, address, or plug type
- AC / DC charger filters
- Nearby sorting via device geolocation (with clear GPS / permission messaging)
- CCS2 and GB/T plug badges
- Light / dark theme
- Mobile-friendly navigation
- SEO pages for every station and city
- Sitemap, robots.txt, Open Graph, and JSON-LD structured data
- FAQ, about, contact, privacy, and terms pages
- Google Analytics (`G-YK9GBJE0NL`)

## Tech stack

- [Astro](https://astro.build) + React islands
- Tailwind CSS v4
- Leaflet / react-leaflet
- Station data in `src/data/EV_Locations.json`

## Requirements

- Node.js `>= 22.12.0`

## Develop

```bash
npm install
npm run dev
```

Or with Bun:

```bash
bun install
bun run dev
```

Background mode (from project docs):

```bash
astro dev --background
astro dev status
astro dev logs
astro dev stop
```

## Build

```bash
npm run build
npm run preview
```

## Routes

| Path | Purpose |
|------|---------|
| `/` | Interactive network explorer (map + list) |
| `/cities/` | City index |
| `/cities/[city]/` | Stations in a city |
| `/stations/` | Full station directory |
| `/stations/[slug]/` | Station detail (SEO) |
| `/faq/` | Frequently asked questions |
| `/about/` | About the project |
| `/contact/` | Suggest a station / get in touch |
| `/privacy/` | Privacy policy |
| `/terms/` | Terms of use |

## Project layout

```
src/
  components/   # Map, network explorer, nav, theme toggle, etc.
  data/         # EV_Locations.json
  layouts/      # Shared page layout (meta, analytics, header/footer)
  lib/          # Station helpers, plugs, location utilities
  pages/        # Astro routes
  styles/       # Global CSS + theme tokens
public/         # Favicons, logo, robots.txt, llms.txt, OG image
```

## Data

Station listings live in `src/data/EV_Locations.json`. Update that file to add or edit stations; rebuild to regenerate static station and city pages.
