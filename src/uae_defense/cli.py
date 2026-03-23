from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from uae_defense.scraper import scrape_profile_to_csv
from uae_defense.url_ingest import build_raw_csv_from_url_file


def _scrape_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Scrape Instagram posts into a raw CSV file.")
    parser.add_argument("--username", default="modgovae")
    parser.add_argument("--start-date", default="2026-02-28")
    parser.add_argument("--end-date", default="2026-03-10")
    parser.add_argument("--output", default="data/raw_modgovae_2026-02-28_2026-03-10.csv")
    return parser


def scrape_instagram_main() -> int:
    args = _scrape_parser().parse_args()
    count = scrape_profile_to_csv(
        username=args.username,
        start_date=date.fromisoformat(args.start_date),
        end_date=date.fromisoformat(args.end_date),
        output_path=Path(args.output),
    )
    print(f"Wrote {count} rows to {args.output}")
    return 0


def _url_ingest_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Build raw Instagram CSV from a date/url list.")
    parser.add_argument("--input", required=True, help="Text file with one '<YYYY-MM-DD> <url>' entry per line.")
    parser.add_argument("--output", required=True, help="Destination CSV path.")
    parser.add_argument("--sleep-seconds", type=float, default=0.2)
    return parser


def build_raw_from_urls_main() -> int:
    args = _url_ingest_parser().parse_args()
    count = build_raw_csv_from_url_file(
        input_path=Path(args.input),
        output_path=Path(args.output),
        sleep_seconds=args.sleep_seconds,
    )
    print(f"Wrote {count} rows to {args.output}")
    return 0
