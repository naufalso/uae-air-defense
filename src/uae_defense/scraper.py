from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Iterable, Iterator, Protocol

import instaloader

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


class InstagramPost(Protocol):
    caption: str | None
    date_utc: datetime
    mediacount: int
    shortcode: str
    typename: str
    url: str

    def get_sidecar_nodes(self) -> Iterable[object]: ...


@dataclass(slots=True, frozen=True)
class RawInstagramRecord:
    post_date: str
    url: str
    captions: str
    image_url: str
    status: str = "pending"
    shortcode: str = ""
    post_type: str = ""
    media_count: int = 1
    media_urls: str = ""

    def to_row(self) -> dict[str, str]:
        return {
            "post_date": self.post_date,
            "url": self.url,
            "captions": self.captions,
            "image_url": self.image_url,
            "status": self.status,
            "shortcode": self.shortcode,
            "post_type": self.post_type,
            "media_count": str(self.media_count),
            "media_urls": self.media_urls,
        }


def make_loader() -> instaloader.Instaloader:
    return instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        save_metadata=False,
        compress_json=False,
    )


def build_post_url(shortcode: str, post_type: str) -> str:
    prefix = "reel" if post_type == "GraphVideo" else "p"
    return f"https://www.instagram.com/{prefix}/{shortcode}/"


def collect_media_urls(post: InstagramPost) -> list[str]:
    if post.typename == "GraphSidecar":
        urls: list[str] = []
        for node in post.get_sidecar_nodes():
            display_url = getattr(node, "display_url", "")
            if display_url:
                urls.append(str(display_url))
        return urls or [post.url]
    return [post.url]


def post_to_record(post: InstagramPost) -> RawInstagramRecord:
    media_urls = collect_media_urls(post)
    image_url = media_urls[0] if media_urls else ""
    post_date = post.date_utc.replace(microsecond=0).isoformat() + "Z"
    return RawInstagramRecord(
        post_date=post_date,
        url=build_post_url(post.shortcode, post.typename),
        captions=(post.caption or "").strip(),
        image_url=image_url,
        shortcode=post.shortcode,
        post_type=post.typename,
        media_count=post.mediacount,
        media_urls=json.dumps(media_urls, ensure_ascii=False),
    )


def iter_posts_in_range(
    posts: Iterable[InstagramPost],
    start_date: date,
    end_date: date,
) -> Iterator[InstagramPost]:
    start_at = datetime.combine(start_date, time.min)
    end_exclusive = datetime.combine(end_date + timedelta(days=1), time.min)
    for post in posts:
        if post.date_utc < start_at:
            break
        if start_at <= post.date_utc < end_exclusive:
            yield post


def scrape_profile(
    username: str,
    start_date: date,
    end_date: date,
    loader: instaloader.Instaloader | None = None,
) -> list[RawInstagramRecord]:
    active_loader = loader or make_loader()
    profile = instaloader.Profile.from_username(active_loader.context, username)
    return [
        post_to_record(post)
        for post in iter_posts_in_range(profile.get_posts(), start_date, end_date)
    ]


def write_raw_csv(records: Iterable[RawInstagramRecord], output_path: Path) -> int:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=RAW_HEADERS)
        writer.writeheader()
        for record in records:
            writer.writerow(record.to_row())
            count += 1
    return count


def scrape_profile_to_csv(
    username: str,
    start_date: date,
    end_date: date,
    output_path: Path,
) -> int:
    return write_raw_csv(scrape_profile(username, start_date, end_date), output_path)
