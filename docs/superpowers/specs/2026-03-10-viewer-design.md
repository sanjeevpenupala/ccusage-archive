# ccusage Archive Viewer — Design Spec

## Overview

A single self-contained HTML file that displays all archived ccusage monthly snapshots as a cost dashboard with a bar chart and expandable table.

## How It Works

1. A build script (`scripts/build-viewer.ts`) reads all `*.json` snapshot files from the data directory, embeds them as a `<script>` variable into an HTML template (`src/viewer/template.html`), and writes the result to `data/viewer.html`.
2. `npm run viewer` builds and opens the file in the default browser.
3. No server, no external dependencies — everything is inline in one HTML file.

## Data Flow

```
data/*.json  →  scripts/build-viewer.ts  →  data/viewer.html  →  browser
```

The build script:
- Reads `CCUSAGE_ARCHIVE_DIR` (or defaults to `./data/`) to find snapshot JSONs (excludes `viewer.html`).
- Parses each file. The ccusage JSON has a `monthly` array — extracts the first element.
- Sorts by month string ascending.
- Serializes the array as JSON and injects it into the HTML template via a placeholder (`/*__DATA__*/`).
- Writes the final HTML to the data directory as `viewer.html`.

The `npm run viewer` script chains: build then `open data/viewer.html` (macOS). The build script itself does not handle opening — that's a separate shell command in the npm script.

## Page Layout

### Header
- Title: "ccusage Archive"
- Summary stats: total months archived, cumulative cost (e.g., "12 months — $4,230.50 total")

### Bar Chart
- Pure CSS/HTML bar chart (no charting library).
- One bar per month, newest on the right.
- Bar height proportional to that month's total cost.
- Each bar labeled with the month in `YYYY-MM` format and cost value above the bar.
- Simple, functional — not a full charting solution.

### Table
- Sorted newest-first.
- Columns: Month, Total Cost, Total Tokens, Models Used (count), expand chevron.
- Token counts formatted human-readable: "522.4M", "310.7K", "1.2B".
- Cost formatted as USD: "$403.09".

### Expandable Rows
- Clicking a row expands to show per-model breakdown.
- Sub-table columns: Model Name (short, e.g., "opus-4-6"), Cost, Tokens.
- Model names shortened from full IDs (strip `claude-` prefix and date suffix).

### Totals Row
- Bottom of the table.
- Sums: total cost across all months, total tokens across all months.

## Styling

- Dark theme (dark background, light text).
- Monospace font for data.
- Minimal CSS, all inline in the HTML file.
- No external stylesheets, fonts, or scripts.
- Responsive enough to work on a standard desktop browser window.

## npm Scripts

- `viewer:build` — `tsx scripts/build-viewer.ts` (build only)
- `viewer` — `npm run viewer:build && open data/viewer.html` (build + open on macOS)

## Files

| File | Purpose |
|------|---------|
| `src/viewer/template.html` | HTML template with placeholder for data injection |
| `scripts/build-viewer.ts` | Reads snapshots, injects data, writes final HTML |
| `data/viewer.html` | Generated output (gitignored) |

## Snapshot Data Shape (input)

Each `YYYY-MM.json` file contains:

```json
{
  "monthly": [
    {
      "month": "2026-02",
      "inputTokens": 310714,
      "outputTokens": 262985,
      "cacheCreationTokens": 34705827,
      "cacheReadTokens": 487082986,
      "totalTokens": 522362512,
      "totalCost": 403.09,
      "modelsUsed": ["claude-opus-4-6", "claude-sonnet-4-5-20250929"],
      "modelBreakdowns": [
        {
          "modelName": "claude-opus-4-6",
          "inputTokens": 204054,
          "outputTokens": 227808,
          "cacheCreationTokens": 22079832,
          "cacheReadTokens": 333011701,
          "cost": 311.22
        }
      ]
    }
  ],
  "totals": {
    "inputTokens": 310714,
    "outputTokens": 262985,
    "cacheCreationTokens": 34705827,
    "cacheReadTokens": 487082986,
    "totalCost": 403.09,
    "totalTokens": 522362512
  }
}
```

## Embedded Data Shape (in HTML)

The build script extracts and normalizes into:

```json
[
  {
    "month": "2026-02",
    "totalCost": 403.09,
    "totalTokens": 522362512,
    "inputTokens": 310714,
    "outputTokens": 262985,
    "cacheCreationTokens": 34705827,
    "cacheReadTokens": 487082986,
    "models": [
      {
        "name": "opus-4-6",
        "cost": 311.22,
        "inputTokens": 204054,
        "outputTokens": 227808,
        "cacheCreationTokens": 22079832,
        "cacheReadTokens": 333011701
      }
    ]
  }
]
```

Model names are shortened by: (1) stripping the `claude-` prefix, (2) removing any trailing `-YYYYMMDD` date suffix (8 digits preceded by a hyphen at the end of the string). Examples: `claude-opus-4-6` → `opus-4-6`, `claude-sonnet-4-5-20250929` → `sonnet-4-5`, `claude-haiku-4-5-20251001` → `haiku-4-5`.

## Edge Cases

- **Empty data directory (no snapshots):** The template renders an empty state message: "No snapshots found. Run `npm start` to capture data."
- **`viewer.html` in data dir:** The build script skips `viewer.html` when scanning for snapshot JSONs.
- **`viewer.html` gitignored:** Must be added to `.gitignore` (alongside `data/` which already covers it since output goes to `data/viewer.html`).

## Known Issue

`captureMonth` in `src/snapshot.ts` validates the ccusage output by checking for a `data` array, but ccusage actually returns a `monthly` array. This is a pre-existing bug unrelated to the viewer. The viewer reads what's on disk — the raw ccusage output with the `monthly` key.

## Out of Scope

- Filtering or date range selection.
- Real-time updates or auto-refresh.
- Any server component.
- External dependencies (charting libraries, CSS frameworks).
- Mobile optimization.
