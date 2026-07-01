# ccusage Archive

ccusage Archive persists Claude Code usage data beyond the ~30-day retention
limit of the underlying Anthropic logs. On every run it reads your local usage
through the `ccusage` data-loader and merges any new records into a single
`archive.json`:

- **Daily** token and cost totals, with a per-model breakdown.
- **Session blocks** — the completed 5-hour windows that usage limits reset on,
  including whether each one hit a limit.
- **Weekly** totals, for the separate weekly cap.

Merges are idempotent — recorded days and blocks are never overwritten — so
repeated runs are safe and history accumulates past the point where the raw
logs age out.

## Prerequisites

- Node.js >= 22 (`nvm` recommended — `.nvmrc` is provided)
- pm2 installed globally: `npm install -g pm2`

## Installation

```
git clone <repo-url> ccusage-archive
cd ccusage-archive
nvm use
npm install
```

## Setup

Register the tool with pm2 and configure it to run on every boot:

```
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

`pm2 startup` prints a command that must be copy-pasted and run with sudo to
register the boot hook with your OS init system. Run that command before
rebooting.

## Configuration

By default snapshots are written to `./data/` relative to the project root.
Set the `CCUSAGE_ARCHIVE_DIR` environment variable to use a different location:

```
CCUSAGE_ARCHIVE_DIR=/path/to/snapshots npm start
```

To set it permanently for pm2, uncomment and edit the `env` block in
`ecosystem.config.cjs`:

```javascript
env: {
  CCUSAGE_ARCHIVE_DIR: '/path/to/custom/snapshots',
},
```

Then reload: `pm2 restart ccusage-archive`.

## Manual Run

```
npm start
```

Or, if pm2 is managing the process:

```
pm2 restart ccusage-archive
```

## Logs

```
pm2 logs ccusage-archive
```

## How It Works

On each run the tool:

1. Loads the existing `archive.json` (or starts empty).
2. Captures current usage from the ccusage data-loader: daily aggregates
   (`loadDailyUsageData`), completed session blocks (`loadSessionBlockData`,
   skipping gaps and the still-active block), and weekly totals
   (`loadWeeklyUsageData`).
3. Merges into the archive. Days and blocks are immutable once recorded
   (existing wins); the in-progress week is refreshed on every run.
4. Writes the merged archive back atomically.

Run `npm run viewer:build` to (re)generate `data/viewer.html` — a
self-contained dashboard with two tabs: **Usage** (cost, tokens, and models
over time) and **Sessions** (start-hour histogram, tokens vs. peak, burn rate,
and a cap-hit counter).

## Data Format

A single `archive.json` holds the full history:

```json
{
  "version": 2,
  "days": [
    { "date": "2026-06-30", "totalTokens": 1000, "totalCost": 5.0, "models": [] }
  ],
  "blocks": [
    {
      "id": "2026-06-30T12:00:00.000Z",
      "startTime": "2026-06-30T12:00:00.000Z",
      "actualEndTime": "2026-06-30T14:11:00.000Z",
      "totalTokens": 1000,
      "totalCost": 5.0,
      "models": ["opus-4-6"],
      "usageLimitResetTime": null
    }
  ],
  "weeks": [
    { "week": "2026-06-29", "totalTokens": 1000, "totalCost": 5.0, "models": [] }
  ]
}
```

`blocks` are the 5-hour session-limit windows; `usageLimitResetTime` is
non-null only for a block that actually hit a limit.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
