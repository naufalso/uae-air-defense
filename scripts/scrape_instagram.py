#!/usr/bin/env python3
from __future__ import annotations

import argparse
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from uae_defense.scraper import scrape_profile_to_csv  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape Instagram posts into a raw CSV file.")
    parser.add_argument("--username", default="modgovae")
    parser.add_argument("--start-date", default="2026-02-28")
    parser.add_argument("--end-date", default="2026-03-10")
    parser.add_argument(
        "--output",
        default="data/raw_modgovae_2026-02-28_2026-03-10.csv",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    count = scrape_profile_to_csv(
        username=args.username,
        start_date=date.fromisoformat(args.start_date),
        end_date=date.fromisoformat(args.end_date),
        output_path=Path(args.output),
    )
    print(f"Wrote {count} rows to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
