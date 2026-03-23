from __future__ import annotations

import csv
import json
from dataclasses import dataclass
from datetime import date, datetime

from uae_defense.scraper import (
    build_post_url,
    collect_media_urls,
    iter_posts_in_range,
    post_to_record,
    write_raw_csv,
)


@dataclass
class SidecarNode:
    display_url: str


@dataclass
class FakePost:
    caption: str | None
    date_utc: datetime
    mediacount: int
    shortcode: str
    typename: str
    url: str
    nodes: list[SidecarNode]

    def get_sidecar_nodes(self):
        return self.nodes


def test_build_post_url_uses_reel_for_graph_video():
    assert build_post_url("abc123", "GraphVideo") == "https://www.instagram.com/reel/abc123/"
    assert build_post_url("abc123", "GraphImage") == "https://www.instagram.com/p/abc123/"


def test_collect_media_urls_prefers_sidecar_nodes():
    post = FakePost(
        caption="caption",
        date_utc=datetime(2026, 3, 23, 12, 0, 0),
        mediacount=2,
        shortcode="code",
        typename="GraphSidecar",
        url="https://cdn.example.com/fallback.jpg",
        nodes=[SidecarNode("https://cdn.example.com/1.jpg"), SidecarNode("https://cdn.example.com/2.jpg")],
    )

    assert collect_media_urls(post) == [
        "https://cdn.example.com/1.jpg",
        "https://cdn.example.com/2.jpg",
    ]


def test_iter_posts_in_range_yields_only_requested_window():
    posts = [
        FakePost(None, datetime(2026, 3, 23, 10, 0, 0), 1, "new", "GraphImage", "u1", []),
        FakePost(None, datetime(2026, 3, 21, 10, 0, 0), 1, "mid", "GraphImage", "u2", []),
        FakePost(None, datetime(2026, 3, 18, 10, 0, 0), 1, "old", "GraphImage", "u3", []),
    ]

    result = list(iter_posts_in_range(posts, date(2026, 3, 20), date(2026, 3, 23)))
    assert [post.shortcode for post in result] == ["new", "mid"]


def test_post_to_record_serializes_media_urls():
    post = FakePost(
        caption="  sample caption  ",
        date_utc=datetime(2026, 3, 23, 12, 34, 56),
        mediacount=1,
        shortcode="abc123",
        typename="GraphImage",
        url="https://cdn.example.com/image.jpg",
        nodes=[],
    )

    record = post_to_record(post)

    assert record.url == "https://www.instagram.com/p/abc123/"
    assert record.captions == "sample caption"
    assert json.loads(record.media_urls) == ["https://cdn.example.com/image.jpg"]


def test_write_raw_csv_writes_expected_headers(tmp_path):
    post = FakePost(
        caption="caption",
        date_utc=datetime(2026, 3, 23, 8, 0, 0),
        mediacount=1,
        shortcode="abc123",
        typename="GraphImage",
        url="https://cdn.example.com/image.jpg",
        nodes=[],
    )
    output_path = tmp_path / "raw.csv"

    count = write_raw_csv([post_to_record(post)], output_path)

    assert count == 1
    with output_path.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))

    assert rows[0]["shortcode"] == "abc123"
