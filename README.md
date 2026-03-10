# ccusage Archive

ccusage Archive persists Claude Code usage data beyond the 30-day retention
limit of the underlying Anthropic API logs. On every system boot, it runs
`ccusage monthly --json` for each calendar month within the retention window
that does not yet have a local snapshot, and writes the result to a JSON file
in a configurable data directory. Because the tool is idempotent (it skips
months that already have a file), repeated runs are safe.

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

On startup the tool:

1. Computes the retention window (today minus 30 days) to determine which
   completed calendar months could still be queried from ccusage.
2. Reads `./data/` (or `CCUSAGE_ARCHIVE_DIR`) to find which months already
   have a snapshot file.
3. For each missing month, shells out to `npx --yes ccusage@latest monthly
   --json --since <YYYYMMDD> --until <YYYYMMDD>` and writes the output to
   `<month>.json`.
4. Skips months where ccusage returns an empty data array (data has already
   rolled out of retention).

## Data Format

Each snapshot file contains the JSON output from ccusage, which looks like:

```json
{
  "type": "monthly",
  "data": [
    {
      "month": "2025-01",
      "totalTokens": 1000,
      "costUSD": 5.00
    }
  ],
  "summary": {
    "totalTokens": 1000,
    "totalCostUSD": 5.00
  }
}
```

Files are named `YYYY-MM.json` and stored flat in the data directory.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
