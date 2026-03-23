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
- Python 3.11+
- `uv` for Python dependency management and CLI execution
- Instaloader and Requests for raw Instagram data collection

## Project Structure

```text
.
├── data/                     # Curated dashboard CSVs and generated raw artifacts
├── public/
├── scripts/                  # Thin wrappers around packaged Python CLIs
├── src/
│   ├── App.jsx               # Dashboard shell and page-level React state
│   ├── lib/
│   │   └── dashboardData.js  # CSV parsing, date normalization, aggregation helpers
│   ├── main.jsx              # React entry point
│   └── uae_defense/          # Python scraping and URL-ingest package
├── tests/                    # Python tests for pipeline utilities
├── index.html
├── package.json
└── pyproject.toml
```

## Getting Started

### Prerequisites

- Node.js 20+ (recommended)
- npm 10+

### Install

```bash
npm install
uv sync --group dev
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
uv run ruff check
```

## Test

```bash
uv run pytest
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

## Python Pipeline

The Python side generates raw Instagram records that can later be transformed into the curated `_impact.csv` files consumed by the dashboard.

Packaged CLI entrypoints:

```bash
uv run uae-scrape-instagram --username modgovae --start-date 2026-03-11 --end-date 2026-03-23 --output data/raw_modgovae_2026-03-11_2026-03-23.csv
uv run uae-build-raw-from-urls --input data/modgovae_urls_2026-03-11_2026-03-23.txt --output data/raw_modgovae_2026-03-11_2026-03-23.csv
```

The fallback `uae-build-raw-from-urls` flow infers raw post metadata from public HTML and should be treated as lower-confidence than the direct scraping path.

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
