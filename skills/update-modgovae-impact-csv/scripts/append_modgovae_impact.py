#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import re
from datetime import datetime
from pathlib import Path

IMPACT_HEADERS = [
    "Date",
    "Shortcode",
    "URL",
    "Title",
    "Summary",
    "Likes",
    "ballistic_detected",
    "ballistic_intercepted",
    "UAV_detected",
    "UAV_intercepted",
    "ballistic_sea",
    "ballistic_land",
    "UAV_sea",
    "UAV_land",
]

WHITESPACE_RE = re.compile(r"\s+")
BALLISTIC_RE = re.compile(r"(\d+)\s+ballistic missiles?\b", re.IGNORECASE)
UAV_RE = re.compile(r"(\d+)\s+(?:UAVs?|drones?)\b", re.IGNORECASE)
SHORTCODE_RE = re.compile(r"/(?:p|reel)/([A-Za-z0-9_-]+)/?")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Append stats-bearing MOD posts from a raw CSV into the impact CSV."
    )
    parser.add_argument("--impact-csv", required=True, help="Existing impact CSV to update in place.")
    parser.add_argument("--raw-csv", required=True, help="Raw CSV built from MOD post URLs.")
    return parser.parse_args()


def normalize_text(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value.replace("\r", " ").replace("\n", " ")).strip()


def first_sentence(text: str) -> str:
    normalized = normalize_text(text)
    if not normalized:
        return ""
    sentence, _, _ = normalized.partition(".")
    return sentence.strip() or normalized


def parse_daily_counts(caption: str) -> tuple[int, int] | None:
    sentence = first_sentence(caption)
    ballistic_match = BALLISTIC_RE.search(sentence)
    uav_match = UAV_RE.search(sentence)
    if not ballistic_match or not uav_match:
        return None
    return int(ballistic_match.group(1)), int(uav_match.group(1))


def extract_shortcode(url: str) -> str:
    match = SHORTCODE_RE.search(url)
    return match.group(1) if match else url.rstrip("/").rsplit("/", 1)[-1]


def build_title(ballistic_count: int, uav_count: int) -> str:
    return f"UAE air defences engage {ballistic_count} ballistic missiles, {uav_count} UAVs"


def load_impact_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def load_raw_rows(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def sort_key(row: dict[str, str]) -> tuple[datetime, str]:
    return datetime.fromisoformat(row["Date"]), row["URL"]


def main() -> int:
    args = parse_args()
    impact_path = Path(args.impact_csv)
    raw_path = Path(args.raw_csv)

    impact_rows = load_impact_rows(impact_path)
    raw_rows = load_raw_rows(raw_path)

    existing_urls = {row["URL"] for row in impact_rows}
    existing_shortcodes = {row["Shortcode"] for row in impact_rows}

    appended = 0
    skipped_non_stats = 0
    skipped_duplicates = 0

    for raw_row in raw_rows:
        url = normalize_text(raw_row.get("url", ""))
        shortcode = extract_shortcode(url)
        if url in existing_urls or shortcode in existing_shortcodes:
            skipped_duplicates += 1
            continue

        caption = normalize_text(raw_row.get("captions", ""))
        counts = parse_daily_counts(caption)
        if counts is None:
            skipped_non_stats += 1
            continue

        post_date = normalize_text(raw_row.get("post_date", ""))[:10]
        ballistic_count, uav_count = counts

        new_row = {
            "Date": post_date,
            "Shortcode": shortcode,
            "URL": url,
            "Title": build_title(ballistic_count, uav_count),
            "Summary": caption,
            "Likes": "",
            "ballistic_detected": str(ballistic_count),
            "ballistic_intercepted": str(ballistic_count),
            "UAV_detected": str(uav_count),
            "UAV_intercepted": str(uav_count),
            "ballistic_sea": "0",
            "ballistic_land": "0",
            "UAV_sea": "0",
            "UAV_land": "0",
        }
        impact_rows.append(new_row)
        existing_urls.add(url)
        existing_shortcodes.add(shortcode)
        appended += 1

    impact_rows.sort(key=sort_key)

    with impact_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=IMPACT_HEADERS)
        writer.writeheader()
        writer.writerows(impact_rows)

    print(
        f"Appended {appended} row(s); "
        f"skipped {skipped_duplicates} duplicate(s); "
        f"skipped {skipped_non_stats} non-stat post(s)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
