---
name: update-modgovae-impact-csv
description: Update the MOD UAE impact CSV from the last recorded date up to today. Use when asked to refresh the dashboard dataset, append newer MOD Instagram defence-stat posts, rebuild raw CSV data from recent post URLs, or verify the web app loads the updated impact file.
---

# Update MOD Impact CSV

Use this skill to extend the impact dataset in `data/*_impact.csv` from its last recorded `Date` through today.

## Files this skill uses

- Impact CSV: `data/modgovae_posts_impact.csv` or the latest `data/*_impact.csv`
- URL list: `data/modgovae_urls_<start>_<end>.txt`
- Raw CSV builder: `scripts/build_raw_from_urls.py`
- Impact appender: `skills/update-modgovae-impact-csv/scripts/append_modgovae_impact.py`

## Workflow

1. Find the target impact CSV and read the max `Date`.
2. Set:
   - `start_date = max(Date) + 1 day`
   - `end_date = today`
3. If `start_date > end_date`, stop. The CSV is already current.
4. Use Playwright browser automation on `https://www.instagram.com/modgovae/` to collect recent post URLs and their visible dates until you cover the full date window.
5. Save the discovered posts to `data/modgovae_urls_<start>_<end>.txt` using one line per post:

```text
YYYY-MM-DD https://www.instagram.com/p/SHORTCODE/
```

6. Build a raw CSV from that URL list:

```bash
uv run python scripts/build_raw_from_urls.py \
  --input data/modgovae_urls_<start>_<end>.txt \
  --output data/raw_modgovae_<start>_<end>.csv
```

7. Append only statistics-bearing posts into the impact CSV:

```bash
uv run python skills/update-modgovae-impact-csv/scripts/append_modgovae_impact.py \
  --impact-csv data/modgovae_posts_impact.csv \
  --raw-csv data/raw_modgovae_<start>_<end>.csv
```

8. Verify the update:
   - Confirm the latest `Date` in the impact CSV is either `end_date` or the latest day that had a stats-bearing MOD post.
   - Start the web app with `npm run dev -- --host 127.0.0.1`.
   - Open the app and verify it loads the `_impact.csv` file and shows the latest appended date in the table.

## Browser collection guidance

- Prefer post anchors under the profile grid with `/p/` or `/reel/` in the URL.
- Read the post date from the visible `time` element when available.
- Keep scrolling until the oldest discovered visible post is older than `start_date`.
- Deduplicate URLs before writing the text file.
- If Instagram renders relative URLs, normalize them to `https://www.instagram.com/...`.
- Prefer canonical URLs like `https://www.instagram.com/p/<shortcode>/`. The raw builder also normalizes username-scoped URLs like `https://www.instagram.com/modgovae/p/<shortcode>/`.

## Append rules

- Keep existing rows intact. Do not rewrite historical summaries unless the user asks.
- Skip posts that do not contain daily air-defence statistics.
- The appender script maps newer “engaged X ballistic missiles, Y UAVs” style posts to:
  - `ballistic_detected = ballistic_intercepted = X`
  - `UAV_detected = UAV_intercepted = Y`
  - `ballistic_sea = ballistic_land = UAV_sea = UAV_land = 0`
- It also handles single-type daily posts such as `engaged 9 UAVs` by setting the missing threat type to `0`.
- Deduplicate by URL and shortcode.

## Notes

- `scripts/scrape_instagram.py` currently relies on `instaloader` and is not the preferred path for this account.
- The working fallback is:
  - browser-discovered URL list
  - `build_raw_from_urls.py`
  - `append_modgovae_impact.py`
- `build_raw_from_urls.py` now reads the post-page meta description, so the generated raw CSV includes usable captions for the appender script.
- If you need scratch files for validation, keep them under `tmp/` and remove them before finishing.
