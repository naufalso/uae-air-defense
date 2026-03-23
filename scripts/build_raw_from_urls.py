#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import time
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

import requests

RAW_HEADERS = [
    "post_date",
    "url",
    "captions",
    "image_url",
    "status",
    "shortcode",
    "post_type",
    "media_count",
    "media_urls",
]

META_TAG_RE = re.compile(r"<meta\s+([^>]+?)\s*/?>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'([A-Za-z_:.-]+)="(.*?)"', re.DOTALL)
CONTROL_CHARS_RE = re.compile(r"[\u2066-\u2069\u200e\u200f]")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build raw Instagram CSV from a date/url list.")
    parser.add_argument("--input", required=True, help="Text file with one '<YYYY-MM-DD> <url>' entry per line.")
    parser.add_argument("--output", required=True, help="Destination CSV path.")
    parser.add_argument("--sleep-seconds", type=float, default=0.2)
    return parser.parse_args()


def extract_caption(description: str) -> str:
    marker = ': "'
    pos = description.find(marker)
    caption = description[pos + len(marker) :] if pos != -1 else description
    if caption.endswith('"'):
        caption = caption[:-1]
    return CONTROL_CHARS_RE.sub("", caption).strip()


def extract_meta_map(html: str) -> dict[str, str]:
    metas: dict[str, str] = {}
    for raw_attrs in META_TAG_RE.findall(html):
        attrs = {key.lower(): unescape(value) for key, value in ATTR_RE.findall(raw_attrs)}
        meta_key = attrs.get("property") or attrs.get("name")
        content = attrs.get("content", "")
        if meta_key and content and meta_key not in metas:
            metas[meta_key] = content
    return metas


def load_entries(path: Path) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        day, url = stripped.split(" ", 1)
        entries.append((day, url))
    return entries


def normalize_instagram_post_url(url: str) -> str:
    parsed = urlparse(url)
    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) >= 2 and parts[-2] in {"p", "reel"}:
        kind = parts[-2]
        shortcode = parts[-1]
        return f"https://www.instagram.com/{kind}/{shortcode}/"
    return url


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    records: list[dict[str, str | int]] = []
    entries = load_entries(input_path)

    for idx, (day, url) in enumerate(entries, start=1):
        request_url = normalize_instagram_post_url(url)
        response = session.get(request_url, timeout=30)
        response.raise_for_status()

        metas = extract_meta_map(response.text)
        description = metas.get("og:description") or metas.get("description", "")
        image_url = metas.get("og:image", "")
        final_url = metas.get("og:url", request_url)

        records.append(
            {
                "post_date": f"{day}T00:00:00Z",
                "url": final_url,
                "captions": extract_caption(description),
                "image_url": image_url,
                "status": "pending",
                "shortcode": final_url.rstrip("/").split("/")[-1],
                "post_type": "GraphImage",
                "media_count": 1,
                "media_urls": json.dumps([image_url] if image_url else [], ensure_ascii=False),
            }
        )

        if idx % 10 == 0:
            print(f"fetched {idx}/{len(entries)}", flush=True)
        time.sleep(args.sleep_seconds)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_HEADERS)
        writer.writeheader()
        writer.writerows(records)

    print(f"Wrote {len(records)} rows to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
