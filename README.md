# UAE Air Defense Dashboard

Interactive React dashboard for visualizing UAE air defense incident metrics from ministry post data. The app ingests a CSV dataset, aggregates values by date, and renders daily/cumulative performance charts for ballistic missiles and UAV threats.

## Features

- Automatic loading of the latest local CSV from `data/`
- CSV upload support for ad-hoc analysis in the browser
- Aggregation by date (including multi-post days)
- Daily and cumulative metric views
- Summary KPIs for detected, intercepted, sea impact, land impact, and effective neutralization rate
- Ballistic and UAV trend charts with per-day detail cards

## Tech Stack

- React 19
- Vite
- Tailwind CSS
- Lucide React (icons)

## Project Structure

```text
.
├── data/                     # Source CSV datasets
├── public/
├── src/
│   ├── App.jsx               # Main dashboard logic and UI
│   ├── main.jsx              # React entry point
│   ├── index.css
│   └── App.css
├── index.html
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+

### Install

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Data Format

The dashboard expects CSV rows with these columns:

```text
Date,Shortcode,URL,Title,Summary,Likes,ballistic_detected,ballistic_intercepted,UAV_detected,UAV_intercepted,ballistic_sea,ballistic_land,UAV_sea,UAV_land
```

Notes:

- `Date` is required and used as the grouping key.
- Numeric fields are parsed as integers. Empty/missing numeric values are treated as `0`.
- If multiple rows share the same date, likes are summed and defense counts are consolidated in the dashboard.

## Local Dataset Selection

At startup, the app loads CSV files from `data/` and picks the lexicographically latest filename. Use date-versioned names to control default dataset selection, for example:

- `modgovae_posts_feb28_to_mar10_2026_impact.csv`
- `modgovae_posts_feb28_to_mar23_2026_impact.csv`
- `modgovae_posts_mar11_to_mar20_2026_impact.csv`

## Deploy (GitHub Pages)

This repo includes deployment scripts for GitHub Pages:

```bash
npm run deploy
```

This runs `predeploy` (build) and publishes `dist/` via `gh-pages`.

Configured site URL:

- https://naufalso.github.io/uae-air-defense

## License

No license file is currently defined in this repository.
