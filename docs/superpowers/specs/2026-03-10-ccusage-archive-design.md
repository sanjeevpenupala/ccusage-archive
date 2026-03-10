# ccusage-archive Design

Persist Claude Code usage data beyond the 30-day retention limit by snapshotting `ccusage` output to local JSON files on every system boot.

## Architecture

A TypeScript CLI tool with two responsibilities:

1. **Scan** — determine which monthly snapshots are missing by checking the `./data/` directory
2. **Capture** — run `npx --yes ccusage@latest monthly --json --since X --until Y` for each missing month and save the raw JSON output

pm2 handles boot persistence via `pm2 startup`. The tool runs, captures what's needed, and exits. No daemon, no cron.

```
┌─────────┐  on boot   ┌──────────────┐   npx shell    ┌─────────┐
│   pm2   │ ──────────> │ ccusage-     │ ────────────> │ ccusage │
│ startup │             │ archive CLI  │               │  @latest│
└─────────┘             └──────┬───────┘               └─────────┘
                               │
                               ▼
                          ./data/
                          ├── 2025-01.json
                          ├── 2025-02.json
                          └── ...
```

## Core Logic

### Backfill algorithm

On every run:

1. Compute the range: from 30 days ago (retention limit) through the last fully completed calendar month (the current in-progress month is never captured)
2. For each month in that range, check if `./data/YYYY-MM.json` exists
3. For each missing month, run `npx --yes ccusage@latest monthly --json --since YYYYMMDD --until YYYYMMDD`
4. If ccusage returns valid JSON with a non-empty `data` array, write it to `./data/YYYY-MM.json`
5. If ccusage returns an empty `data` array (data past retention) or a non-zero exit code, log a warning and skip

### Idempotency

File existence is the only state. If the snapshot file exists, that month is considered captured. No separate state file, no database, no lock files.

### File format

One JSON file per month. The file contains the raw `ccusage monthly --json` output — no transformation. If ccusage adds fields in future versions, they're captured automatically.

Example filename: `./data/2025-06.json`

## Configuration

Single environment variable:

| Variable | Default | Description |
|---|---|---|
| `CCUSAGE_ARCHIVE_DIR` | `./data` (relative to project root) | Snapshot storage directory |

Configured via pm2 ecosystem file or shell profile. The pm2 ecosystem file must set `cwd` to the project installation directory so that the relative default resolves correctly.

## Scheduling

- **Trigger:** system boot only, via `pm2 startup`
- **No cron, no wake triggers**
- **Rationale:** laptops are unreliable cron hosts. Running on boot with idempotent backfill guarantees coverage as long as the machine boots at least once per 30 days
- **Manual runs:** `pm2 restart ccusage-archive` or direct CLI invocation

## Error Handling

| Failure | Behavior |
|---|---|
| ccusage not installed / Node not on PATH | Fail with clear error, exit non-zero |
| ccusage returns empty data (past retention) | Log warning, skip month, continue |
| Snapshot directory doesn't exist | Create it automatically |
| Disk write fails | Log error, exit non-zero |
| ccusage output isn't valid JSON | Log error, skip month, continue |

No retries. If it fails, pm2 logs it, and it runs again on next boot.

Logging is stdout/stderr, captured by pm2's built-in log management (`pm2 logs ccusage-archive`).

## Extensibility

Future support for weekly (`YYYY-Www.json`) and daily (`YYYY-MM-DD.json`) snapshots. The period-specific logic (filename pattern, date math, ccusage subcommand) is isolated in one place so adding new periods is a small change.

Not built now — just structured so it's easy to add.

## Testing

- **Unit tests:** missing-month detection, date range calculation, filename generation
- **Integration tests:** mock the `ccusage` CLI call (fake script returning known JSON), verify snapshot files are written correctly
- **No e2e tests:** depend on real Claude Code usage data, which is environment-specific
- **Runner:** Vitest

## Tooling

### TypeScript (`tsconfig.json`)

Based on the reference project's analysis, adapted for a non-bundled CLI tool:

**Keep from reference:**
- `strict: true` and all type-checking flags (`allowUnreachableCode: false`, `allowUnusedLabels: false`, `exactOptionalPropertyTypes: true`, `noFallthroughCasesInSwitch: true`, `noImplicitOverride: true`, `noImplicitReturns: true`, `noUncheckedIndexedAccess: true`, `noUnusedLocals: true`, `noUnusedParameters: true`)
- `erasableSyntaxOnly: true`
- `verbatimModuleSyntax: true`
- `isolatedModules: true`
- `forceConsistentCasingInFileNames: true`
- `noEmit: true` (tsc type-checks only, `tsx` runs the code)
- `lib: ["ES2023"]`
- `libReplacement: false`
- `moduleDetection: "force"`
- `skipLibCheck: true`
- `noUncheckedSideEffectImports: true`

**Changed from reference:**
- `module: "nodenext"` (was `"preserve"` — no bundler, running on Node directly)
- `moduleResolution: "nodenext"` (was `"bundler"`)

**Dropped from reference:**
- `allowImportingTsExtensions` — not valid with `nodenext`
- `declaration`, `isolatedDeclarations` — not publishing type declarations

### Biome (`biome.json`)

Direct port from reference: single quotes, 2-space indent, 100-char line width, semicolons, recommended lint rules, organized imports. Drop `dist` and `playground` excludes.

### Lefthook (`lefthook.yml`)

- `commit-msg`: run commitlint
- `pre-commit`: run biome check + typecheck in parallel
- `pre-push`: validate branch name, run tests
- Branch validation adapted for GitHub issue IDs: `<type>/<issue-id>-<short-description>` (e.g., `feat/123-add-weekly-snapshots`)
- Drop `no-tag-push.sh` (not relevant)

### Commitlint (`commitlint.config.js`)

- Extends `@commitlint/config-conventional`
- `header-max-length: 72`
- Custom rule: require `Refs: #<number>` (GitHub issue) in commit footer instead of Jira ticket

### Other

- `.nvmrc`: Node 24
- `.vscode/settings.json`: Biome as default formatter, format-on-save
- `.vscode/extensions.json`: recommend Biome extension
- `package.json`: `"type": "module"`, ESM only
- `CONTRIBUTING.md`: dev setup, commit conventions, branch naming, running tests
- `CLAUDE.md`: update branch convention from Jira to GitHub issue IDs
- `./data/` added to `.gitignore`

## Dependencies

### Runtime
- None (shells out to `npx ccusage@latest`)

### Dev
- `typescript`
- `tsx` (run TS directly)
- `@biomejs/biome`
- `lefthook`
- `@commitlint/cli`
- `@commitlint/config-conventional`
- `vitest`
- `@types/node`

### Global (user's machine)
- Node.js (>= 22)
- pm2 (`npm install -g pm2`)
