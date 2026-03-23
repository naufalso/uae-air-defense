from __future__ import annotations

from uae_defense.url_ingest import (
    extract_caption,
    extract_meta_map,
    load_entries,
    normalize_instagram_post_url,
)


def test_extract_caption_removes_instagram_prefix_and_control_chars():
    description = 'modgovae on Instagram: "Caption text here"\u200f'
    assert extract_caption(description) == "Caption text here"


def test_extract_meta_map_reads_meta_content():
    html = """
    <html><head>
      <meta property="og:description" content="Example description" />
      <meta property="og:image" content="https://example.com/image.jpg" />
    </head></html>
    """

    result = extract_meta_map(html)

    assert result["og:description"] == "Example description"
    assert result["og:image"] == "https://example.com/image.jpg"


def test_load_entries_skips_comments_and_blank_lines(tmp_path):
    input_path = tmp_path / "entries.txt"
    input_path.write_text(
        "# comment\n\n2026-03-11 https://www.instagram.com/p/abc123/\n",
        encoding="utf-8",
    )

    assert load_entries(input_path) == [("2026-03-11", "https://www.instagram.com/p/abc123/")]


def test_normalize_instagram_post_url_strips_query_string():
    url = "https://www.instagram.com/p/abc123/?img_index=1"
    assert normalize_instagram_post_url(url) == "https://www.instagram.com/p/abc123/"
