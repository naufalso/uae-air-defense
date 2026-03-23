from __future__ import annotations

import json
import re
import time
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

import requests

from uae_defense.scraper import RawInstagramRecord, write_raw_csv

META_TAG_RE = re.compile(r"<meta\s+([^>]+?)\s*/?>", re.IGNORECASE | re.DOTALL)
ATTR_RE = re.compile(r'([A-Za-z_:.-]+)="(.*?)"', re.DOTALL)
CONTROL_CHARS_RE = re.compile(r"[\u2066-\u2069\u200e\u200f]")


def extract_caption(description: str) -> str:
    marker = ': "'
    pos = description.find(marker)
    caption = description[pos + len(marker) :] if pos != -1 else description
    caption = CONTROL_CHARS_RE.sub("", caption).strip()
    if caption.endswith('"'):
        caption = caption[:-1]
    return caption.strip()


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


def make_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )
    return session


def fetch_raw_record(session: requests.Session, day: str, url: str) -> RawInstagramRecord:
    request_url = normalize_instagram_post_url(url)
    response = session.get(request_url, timeout=30)
    response.raise_for_status()

    metas = extract_meta_map(response.text)
    description = metas.get("og:description") or metas.get("description", "")
    image_url = metas.get("og:image", "")
    final_url = metas.get("og:url", request_url)

    return RawInstagramRecord(
        post_date=f"{day}T00:00:00Z",
        url=final_url,
        captions=extract_caption(description),
        image_url=image_url,
        status="pending",
        shortcode=final_url.rstrip("/").split("/")[-1],
        post_type="GraphImage",
        media_count=1,
        media_urls=json.dumps([image_url] if image_url else [], ensure_ascii=False),
    )


def build_raw_csv_from_url_file(
    input_path: Path,
    output_path: Path,
    sleep_seconds: float = 0.2,
    session: requests.Session | None = None,
) -> int:
    entries = load_entries(input_path)
    active_session = session or make_session()

    records: list[RawInstagramRecord] = []
    for idx, (day, url) in enumerate(entries, start=1):
        records.append(fetch_raw_record(active_session, day, url))
        if idx % 10 == 0:
            print(f"fetched {idx}/{len(entries)}", flush=True)
        time.sleep(sleep_seconds)

    return write_raw_csv(records, output_path)
