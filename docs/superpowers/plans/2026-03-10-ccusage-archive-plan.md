# ccusage-archive Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a TypeScript CLI tool that snapshots ccusage monthly data to local JSON files on every system boot, working around the 30-day log retention limit.

**Architecture:** CLI shells out to `npx --yes ccusage@latest monthly --json` for each missing month. pm2 runs it on boot. One JSON file per month in `./data/`. Idempotent via file existence checks.

**Tech Stack:** TypeScript, tsx, Vitest, Biome, Lefthook, commitlint, pm2

**Spec:** `docs/superpowers/specs/2026-03-10-ccusage-archive-design.md`

**Reference project:** `/Users/sanjeevpenupala/Desktop/Programming/Repos/Work/ffai/ffai-image-validation-library` — use for tooling config patterns.

---

## File Structure

```
ccusage-archive/
├── src/
│   ├── index.ts              # CLI entry point — orchestrates scan + capture
│   ├── months.ts             # Month range calculation and missing-month detection
│   ├── snapshot.ts           # Runs ccusage CLI, validates output, writes file
│   └── config.ts             # Reads env vars, resolves paths
├── tests/
│   ├── months.test.ts        # Unit tests for month range logic
│   ├── snapshot.test.ts      # Integration tests with mocked ccusage CLI
│   └── config.test.ts        # Config resolution tests
├── scripts/
│   └── validate-branch-name.sh  # Pre-push branch name validation
├── .vscode/
│   ├── settings.json
│   └── extensions.json
├── biome.json
├── commitlint.config.js
├── ecosystem.config.cjs      # pm2 config
├── lefthook.yml
├── tsconfig.json
├── package.json
├── .nvmrc
├── .gitignore                # Updated: add data/
├── CLAUDE.md                 # Updated: GitHub issue IDs instead of Jira
├── CONTRIBUTING.md
├── README.md                 # Updated: full usage docs
└── data/                     # Snapshot output (gitignored)
```

---

## Chunk 1: Project Scaffolding and Tooling

### Task 1: Initialize package.json and install dependencies

**Files:**
- Modify: `package.json` (will be created by `npm init`)
- Create: `.nvmrc`

- [ ] **Step 1: Create `.nvmrc`**

```
24
```

- [ ] **Step 2: Initialize package.json**

Run: `npm init -y`

- [ ] **Step 3: Edit package.json to set correct fields**

```json
{
  "name": "ccusage-archive",
  "version": "0.0.1",
  "private": true,
  "description": "Persist Claude Code usage data beyond the 30-day retention limit",
  "type": "module",
  "engines": {
    "node": ">=22"
  },
  "scripts": {
    "start": "tsx src/index.ts",
    "test": "vitest run",
    "check": "biome check --write",
    "check:ci": "biome ci",
    "typecheck": "tsc --noEmit"
  },
  "license": "MIT"
}
```

- [ ] **Step 4: Install dev dependencies**

Run: `npm install --save-dev typescript tsx @biomejs/biome lefthook @commitlint/cli @commitlint/config-conventional vitest @types/node`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json .nvmrc
git commit -m "chore: initialize package.json and install dev dependencies"
```

---

### Task 2: Configure TypeScript

**Files:**
- Create: `tsconfig.json`

- [ ] **Step 1: Create tsconfig.json**

Adapted from reference project for a non-bundled CLI tool (nodenext instead of bundler, no declarations).

Note: `tests/` is intentionally excluded from tsc — test files are type-checked by Vitest's built-in TypeScript support, not by `tsc --noEmit`. This matches the reference project's pattern.

```json
{
  "include": ["src"],
  "compilerOptions": {
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noUncheckedIndexedAccess": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "strict": true,

    "module": "nodenext",
    "moduleResolution": "nodenext",
    "noUncheckedSideEffectImports": true,

    "noEmit": true,

    "erasableSyntaxOnly": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    "lib": ["ES2023"],
    "libReplacement": false,
    "moduleDetection": "force",

    "skipLibCheck": true
  }
}
```

- [ ] **Step 2: Create a placeholder src/index.ts to verify tsc works**

```typescript
console.log('ccusage-archive');
```

- [ ] **Step 3: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add tsconfig.json src/index.ts
git commit -m "chore: configure TypeScript for nodenext CLI tool"
```

---

### Task 3: Configure Biome

**Files:**
- Create: `biome.json`

- [ ] **Step 1: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.3.14/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true,
    "defaultBranch": "main"
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    }
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "semicolons": "always"
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

**Important:** After running `npm install`, check the installed Biome version via `node_modules/@biomejs/biome/package.json` and update the `$schema` URL to match exactly (e.g., if `@biomejs/biome@2.4.6` is installed, use `schemas/2.4.6/schema.json`). A mismatch causes editor schema validation warnings.

- [ ] **Step 2: Run biome check on src/**

Run: `npx biome check --write src/`
Expected: Files formatted (may fix quote style on placeholder)

- [ ] **Step 3: Commit**

```bash
git add biome.json src/index.ts
git commit -m "chore: configure Biome formatter and linter"
```

---

### Task 4: Configure VSCode

**Files:**
- Create: `.vscode/settings.json`
- Create: `.vscode/extensions.json`

- [ ] **Step 1: Create .vscode/settings.json**

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.biome": "explicit",
    "source.organizeImports.biome": "explicit"
  },
  "editor.defaultFormatter": "biomejs.biome",
  "editor.detectIndentation": true,
  "editor.formatOnSave": true
}
```

- [ ] **Step 2: Create .vscode/extensions.json**

```json
{
  "recommendations": [
    "biomejs.biome",
    "mhutchie.git-graph",
    "vitest.explorer"
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add .vscode/
git commit -m "chore: add VSCode settings and extension recommendations"
```

---

### Task 5: Configure commitlint

**Files:**
- Create: `commitlint.config.js`

- [ ] **Step 1: Create commitlint.config.js**

Adapted from reference: GitHub issue `Refs: #123` instead of Jira `Refs: PROJ-123`.

```javascript
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
    'refs-required': [2, 'always'],
  },
  plugins: [
    {
      rules: {
        /**
         * Custom rule: Require "Refs: #<number>" in the commit footer.
         *
         * Valid formats:
         *   Refs: #123
         *   Refs: #123, #456
         */
        'refs-required': ({ raw }) => {
          const refsPattern = /^Refs:\s+#\d+/m;
          const hasRefs = refsPattern.test(raw);

          return [
            hasRefs,
            'Commit message must include a GitHub issue reference in the footer.\n' +
              'Expected format: "Refs: #<number>" (e.g., "Refs: #123" or "Refs: #123, #456")',
          ];
        },
      },
    },
  ],
};
```

- [ ] **Step 2: Verify commitlint works**

Run: `printf "feat: test message\n\nRefs: #1\n" | npx commitlint`
Expected: No errors

Run: `printf "feat: test message\n" | npx commitlint`
Expected: Error about missing Refs

- [ ] **Step 3: Commit**

```bash
git add commitlint.config.js
git commit -m "chore: configure commitlint with GitHub issue refs

Refs: #1"
```

Note: This requires a GitHub issue to exist. Create issue #1 "Project setup and scaffolding" before this step, or temporarily disable the refs-required rule until issues are created.

---

### Task 6: Configure Lefthook

**Files:**
- Create: `lefthook.yml`
- Create: `scripts/validate-branch-name.sh`

- [ ] **Step 1: Create scripts/validate-branch-name.sh**

Adapted from reference: GitHub issue IDs (`123-description`) instead of Jira (`PROJ-123-description`).

```bash
#!/bin/bash
#
# Branch name validation script
# Enforces format: <type>/<issue-id>-<short-description>
#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
RESET='\033[0m'

branch=$(git rev-parse --abbrev-ref HEAD)

# Allow main branch
if [[ "$branch" == "main" ]]; then
    exit 0
fi

# Check if branch name matches the required format
if [[ "$branch" =~ ^(feat|fix|perf|refactor|test|chore)/[0-9]+-[a-z0-9-]+$ ]]; then
    exit 0
else
    echo ""
    echo -e "${RED}${BOLD}╔════════════════════════════════════════════════════════════════╗${RESET}"
    echo -e "${RED}${BOLD}║                   BRANCH NAME VALIDATION FAILED                ║${RESET}"
    echo -e "${RED}${BOLD}╚════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}  Current branch:${RESET} ${RED}$branch${RESET}"
    echo ""
    echo -e "${CYAN}${BOLD}Required Format:${RESET}"
    echo -e "  ${DIM}<type>/<issue-id>-<short-description>${RESET}"
    echo ""
    echo -e "${CYAN}${BOLD}Branch Types:${RESET}"
    echo -e "  ${GREEN}feat${RESET}     → New feature or enhancement"
    echo -e "  ${GREEN}fix${RESET}      → Bug correction or revert"
    echo -e "  ${GREEN}perf${RESET}     → Performance improvements"
    echo -e "  ${GREEN}refactor${RESET} → Internal code restructuring"
    echo -e "  ${GREEN}test${RESET}     → Adding or modifying tests"
    echo -e "  ${GREEN}chore${RESET}    → Maintenance (build, CI, deps, docs, tooling)"
    echo ""
    echo -e "${CYAN}${BOLD}Examples:${RESET}"
    echo -e "  ${DIM}•${RESET} feat/123-add-weekly-snapshots"
    echo -e "  ${DIM}•${RESET} fix/456-handle-empty-ccusage-output"
    echo -e "  ${DIM}•${RESET} chore/789-update-dependencies"
    echo ""
    exit 1
fi
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/validate-branch-name.sh`

- [ ] **Step 3: Create lefthook.yml**

```yaml
commit-msg:
  commands:
    commitlint:
      run: npx commitlint --edit {1}

pre-commit:
  parallel: true
  jobs:
    - name: lint and format
      run: npx biome check --write --files-ignore-unknown=true --no-errors-on-unmatched {staged_files}
      stage_fixed: true
    - name: typecheck
      run: npx tsc --noEmit

pre-push:
  jobs:
    - name: no-direct-push
      only:
        - ref: main
      run: echo "Blocked. Direct pushes to main are not allowed. Open a PR instead." && exit 1
    - name: validate-branch-name
      run: bash scripts/validate-branch-name.sh
    - name: test
      run: npx vitest run
```

- [ ] **Step 4: Install lefthook git hooks**

Run: `npx lefthook install`

- [ ] **Step 5: Commit**

```bash
git add lefthook.yml scripts/validate-branch-name.sh
git commit -m "chore: configure Lefthook git hooks

- commit-msg: commitlint validation
- pre-commit: biome check + typecheck in parallel
- pre-push: branch name validation + tests

Refs: #1"
```

---

### Task 7: Update .gitignore and CLAUDE.md

**Files:**
- Modify: `.gitignore`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add `data/` to .gitignore**

Append to `.gitignore`:

```
# Snapshot data (user-specific)
data/
```

- [ ] **Step 2: Update CLAUDE.md branch convention from Jira to GitHub issues**

Replace the branch naming line:

```
Branches: `<type>/<issue-id>-<short-description>` (e.g., `feat/123-add-weekly-snapshots`). Allowed branch types: `feat`, `fix`, `perf`, `refactor`, `test`, `chore`. Description must be lowercase kebab-case.
```

Update the commit footer example:

```
Refs: #123
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore CLAUDE.md
git commit -m "chore: update gitignore for data/ and CLAUDE.md for GitHub issues

Refs: #1"
```

---

## Chunk 2: Core Logic (TDD)

### Task 8: Implement config module

**Files:**
- Create: `src/config.ts`
- Create: `tests/config.test.ts`

- [ ] **Step 1: Write failing tests for config**

```typescript
// tests/config.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '../src/config.js';

describe('getConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns default data directory when env var is not set', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '');
    const config = getConfig();
    expect(config.dataDir).toMatch(/data$/);
  });

  it('uses CCUSAGE_ARCHIVE_DIR when set', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '/tmp/custom-snapshots');
    const config = getConfig();
    expect(config.dataDir).toBe('/tmp/custom-snapshots');
  });

  it('resolves relative paths against cwd', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', './custom-data');
    const config = getConfig();
    expect(config.dataDir).toMatch(/custom-data$/);
    expect(config.dataDir).not.toBe('./custom-data');
  });

  it('falls back to default when env var is empty string', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '');
    const config = getConfig();
    expect(config.dataDir).toMatch(/data$/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/config.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement config module**

```typescript
// src/config.ts
import path from 'node:path';

export interface Config {
  readonly dataDir: string;
}

export function getConfig(): Config {
  const envDir = process.env.CCUSAGE_ARCHIVE_DIR;
  const dataDir = envDir ? path.resolve(envDir) : path.resolve('data');

  return { dataDir };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/config.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config.ts tests/config.test.ts
git commit -m "feat(config): add config module with CCUSAGE_ARCHIVE_DIR support

Refs: #1"
```

---

### Task 9: Implement months module

**Files:**
- Create: `src/months.ts`
- Create: `tests/months.test.ts`

- [ ] **Step 1: Write failing tests for month range calculation**

```typescript
// tests/months.test.ts
import { describe, expect, it } from 'vitest';
import { formatMonth, getMissingMonths, getMonthRange } from '../src/months.js';

describe('formatMonth', () => {
  it('formats a date as YYYY-MM', () => {
    expect(formatMonth(2025, 6)).toBe('2025-06');
  });

  it('zero-pads single-digit months', () => {
    expect(formatMonth(2025, 1)).toBe('2025-01');
  });
});

describe('getMonthRange', () => {
  it('returns months from retention start through last completed month', () => {
    // If today is 2025-03-15, retention goes back 30 days to ~2025-02-13
    // Last completed month is 2025-02
    // So range should include 2025-02
    const range = getMonthRange(new Date('2025-03-15'));
    expect(range).toContain('2025-02');
    expect(range).not.toContain('2025-03'); // current month excluded
  });

  it('includes completed months spanning a year boundary', () => {
    // If today is 2025-01-05, retention goes back to ~2024-12-06
    // Last completed month is 2024-12
    // Range should include 2024-12
    const range = getMonthRange(new Date('2025-01-05'));
    expect(range).toContain('2024-12');
  });

  it('returns multiple months when retention window spans them', () => {
    // If today is 2025-03-01, retention goes back to ~2025-01-30
    // Last completed month is 2025-02
    // Range should include 2025-01 and 2025-02
    const range = getMonthRange(new Date('2025-03-01'));
    expect(range).toContain('2025-01');
    expect(range).toContain('2025-02');
  });

  it('excludes a month when retention window starts after it ends', () => {
    // If today is 2025-03-02, retention goes back to ~2025-01-31
    // January ends on Jan 31, so the retention start is exactly the boundary
    // January should still be included (retention starts within or at the month)
    const range = getMonthRange(new Date('2025-03-02'));
    expect(range).toContain('2025-01');

    // If today is 2025-03-03, retention goes back to ~2025-02-01
    // January is now fully outside the retention window
    const range2 = getMonthRange(new Date('2025-03-03'));
    expect(range2).not.toContain('2025-01');
    expect(range2).toContain('2025-02');
  });
});

describe('getMissingMonths', () => {
  it('returns months that do not have snapshot files', () => {
    const range = ['2025-01', '2025-02', '2025-03'];
    const existing = new Set(['2025-01']);
    const missing = getMissingMonths(range, existing);
    expect(missing).toEqual(['2025-02', '2025-03']);
  });

  it('returns empty array when all months are captured', () => {
    const range = ['2025-01', '2025-02'];
    const existing = new Set(['2025-01', '2025-02']);
    const missing = getMissingMonths(range, existing);
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/months.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement months module**

```typescript
// src/months.ts
const RETENTION_DAYS = 30;

export function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getMonthRange(now: Date): string[] {
  const retentionStart = new Date(now);
  retentionStart.setDate(retentionStart.getDate() - RETENTION_DAYS);

  // Last completed month is the month before the current one
  const lastCompletedYear =
    now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastCompletedMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  const startYear = retentionStart.getFullYear();
  const startMonth = retentionStart.getMonth() + 1; // 1-indexed

  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (
    year < lastCompletedYear ||
    (year === lastCompletedYear && month <= lastCompletedMonth)
  ) {
    months.push(formatMonth(year, month));
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export function getMissingMonths(
  range: string[],
  existingSnapshots: Set<string>,
): string[] {
  return range.filter((month) => !existingSnapshots.has(month));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/months.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/months.ts tests/months.test.ts
git commit -m "feat(months): add month range calculation and missing-month detection

Refs: #1"
```

---

### Task 10: Implement snapshot module

**Files:**
- Create: `src/snapshot.ts`
- Create: `tests/snapshot.test.ts`

- [ ] **Step 1: Write failing tests for snapshot module**

```typescript
// tests/snapshot.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { captureMonth, getDateRangeForMonth, getExistingSnapshots } from '../src/snapshot.js';

describe('getExistingSnapshots', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccusage-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty set when directory does not exist', () => {
    const result = getExistingSnapshots('/nonexistent/path');
    expect(result.size).toBe(0);
  });

  it('returns empty set when directory is empty', () => {
    const result = getExistingSnapshots(tmpDir);
    expect(result.size).toBe(0);
  });

  it('returns month identifiers from existing JSON files', () => {
    fs.writeFileSync(path.join(tmpDir, '2025-01.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, '2025-02.json'), '{}');
    const result = getExistingSnapshots(tmpDir);
    expect(result).toEqual(new Set(['2025-01', '2025-02']));
  });

  it('ignores non-JSON files', () => {
    fs.writeFileSync(path.join(tmpDir, '2025-01.json'), '{}');
    fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'hello');
    const result = getExistingSnapshots(tmpDir);
    expect(result).toEqual(new Set(['2025-01']));
  });
});

describe('getDateRangeForMonth', () => {
  it('returns first and last day of a 31-day month', () => {
    const { since, until } = getDateRangeForMonth('2025-01');
    expect(since).toBe('20250101');
    expect(until).toBe('20250131');
  });

  it('returns correct last day for February in a non-leap year', () => {
    const { since, until } = getDateRangeForMonth('2025-02');
    expect(since).toBe('20250201');
    expect(until).toBe('20250228');
  });

  it('returns correct last day for February in a leap year', () => {
    const { since, until } = getDateRangeForMonth('2024-02');
    expect(since).toBe('20240201');
    expect(until).toBe('20240229');
  });

  it('returns correct range for a 30-day month', () => {
    const { since, until } = getDateRangeForMonth('2025-06');
    expect(since).toBe('20250601');
    expect(until).toBe('20250630');
  });
});

describe('captureMonth', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccusage-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('writes snapshot file when ccusage returns valid data', async () => {
    const mockData = {
      type: 'monthly',
      data: [{ month: '2025-01', totalTokens: 1000, costUSD: 5.0 }],
      summary: { totalTokens: 1000, totalCostUSD: 5.0 },
    };

    const result = await captureMonth('2025-01', tmpDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(true);
    const written = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '2025-01.json'), 'utf-8'),
    );
    expect(written).toEqual(mockData);
  });

  it('returns failure when ccusage exits non-zero', async () => {
    const result = await captureMonth('2025-01', tmpDir, () =>
      Promise.resolve({ exitCode: 1, stdout: '' }),
    );

    expect(result.success).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '2025-01.json'))).toBe(false);
  });

  it('returns failure when ccusage returns empty data array', async () => {
    const mockData = { type: 'monthly', data: [], summary: {} };

    const result = await captureMonth('2025-01', tmpDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, '2025-01.json'))).toBe(false);
  });

  it('returns failure when ccusage returns invalid JSON', async () => {
    const result = await captureMonth('2025-01', tmpDir, () =>
      Promise.resolve({ exitCode: 0, stdout: 'not json' }),
    );

    expect(result.success).toBe(false);
  });

  it('creates data directory if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'dir');
    const mockData = {
      type: 'monthly',
      data: [{ month: '2025-01' }],
      summary: {},
    };

    const result = await captureMonth('2025-01', nestedDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, '2025-01.json'))).toBe(true);
  });

  it('returns failure when disk write fails', async () => {
    // Create a file where the directory should be, causing mkdirSync to fail
    const blockerFile = path.join(tmpDir, 'blocker');
    fs.writeFileSync(blockerFile, '');
    const badDir = path.join(blockerFile, 'subdir');

    const mockData = {
      type: 'monthly',
      data: [{ month: '2025-01' }],
      summary: {},
    };

    const result = await captureMonth('2025-01', badDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/failed to write/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/snapshot.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement snapshot module**

```typescript
// src/snapshot.ts
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  readonly exitCode: number;
  readonly stdout: string;
}

export interface CaptureResult {
  readonly success: boolean;
  readonly month: string;
  readonly reason?: string;
}

export function getExistingSnapshots(dataDir: string): Set<string> {
  if (!fs.existsSync(dataDir)) {
    return new Set();
  }

  const files = fs.readdirSync(dataDir);
  const months = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.json')) {
      months.add(file.replace('.json', ''));
    }
  }

  return months;
}

export function getDateRangeForMonth(month: string): { since: string; until: string } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  const since = `${year}${String(monthNum).padStart(2, '0')}01`;

  // Last day of the month
  const lastDay = new Date(year, monthNum, 0).getDate();
  const until = `${year}${String(monthNum).padStart(2, '0')}${String(lastDay).padStart(2, '0')}`;

  return { since, until };
}

export async function captureMonth(
  month: string,
  dataDir: string,
  exec?: (month: string) => Promise<ExecResult>,
): Promise<CaptureResult> {
  const runner = exec ?? defaultExec;

  const result = await runner(month);

  if (result.exitCode !== 0) {
    return { success: false, month, reason: `ccusage exited with code ${result.exitCode}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return { success: false, month, reason: 'ccusage output is not valid JSON' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('data' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).data) ||
    ((parsed as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    return { success: false, month, reason: 'ccusage returned empty data (past retention?)' };
  }

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `${month}.json`), result.stdout, 'utf-8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, month, reason: `Failed to write snapshot: ${message}` };
  }

  return { success: true, month };
}

async function defaultExec(month: string): Promise<ExecResult> {
  const { since, until } = getDateRangeForMonth(month);

  try {
    const { stdout } = await execFileAsync('npx', [
      '--yes',
      'ccusage@latest',
      'monthly',
      '--json',
      '--since',
      since,
      '--until',
      until,
    ]);

    return { exitCode: 0, stdout };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: unknown }).code
        : undefined;
    const exitCode = typeof code === 'number' ? code : 1;
    return { exitCode, stdout: '' };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/snapshot.test.ts`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/snapshot.ts tests/snapshot.test.ts
git commit -m "feat(snapshot): add ccusage CLI execution and snapshot file writing

Refs: #1"
```

---

### Task 11: Implement CLI entry point

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Implement the orchestrator in src/index.ts**

```typescript
// src/index.ts
import { getConfig } from './config.js';
import { getMissingMonths, getMonthRange } from './months.js';
import { captureMonth, getExistingSnapshots } from './snapshot.js';

async function main(): Promise<void> {
  const config = getConfig();
  const now = new Date();

  console.log(`[ccusage-archive] Starting snapshot check...`);
  console.log(`[ccusage-archive] Data directory: ${config.dataDir}`);

  const range = getMonthRange(now);
  if (range.length === 0) {
    console.log('[ccusage-archive] No months in retention window to check.');
    return;
  }

  console.log(`[ccusage-archive] Checking months: ${range.join(', ')}`);

  const existing = getExistingSnapshots(config.dataDir);
  const missing = getMissingMonths(range, existing);

  if (missing.length === 0) {
    console.log('[ccusage-archive] All months within retention window are captured.');
    return;
  }

  console.log(`[ccusage-archive] Missing months: ${missing.join(', ')}`);

  for (const month of missing) {
    console.log(`[ccusage-archive] Capturing ${month}...`);
    const result = await captureMonth(month, config.dataDir);

    if (result.success) {
      console.log(`[ccusage-archive] Saved ${month}.json`);
    } else {
      console.warn(`[ccusage-archive] Skipping ${month}: ${result.reason}`);
    }
  }

  console.log('[ccusage-archive] Done.');
}

main().catch((error: unknown) => {
  console.error('[ccusage-archive] Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify it runs (will fail gracefully without ccusage data)**

Run: `npx tsx src/index.ts`
Expected: Prints "Starting snapshot check..." and either captures or warns about missing data

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: implement CLI entry point with scan and capture orchestration

Refs: #1"
```

---

## Chunk 3: pm2 Configuration and Documentation

### Task 12: Create pm2 ecosystem config

**Files:**
- Create: `ecosystem.config.cjs`

- [ ] **Step 1: Create ecosystem.config.cjs**

Note: `.cjs` because pm2 does not support ESM config files.

```javascript
module.exports = {
  apps: [
    {
      name: 'ccusage-archive',
      script: 'npm',
      args: 'start',
      autorestart: false,
      watch: false,
      cwd: __dirname,
      // Uncomment to override the default snapshot directory:
      // env: {
      //   CCUSAGE_ARCHIVE_DIR: '/path/to/custom/snapshots',
      // },
    },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add ecosystem.config.cjs
git commit -m "chore: add pm2 ecosystem config for boot scheduling

Refs: #1"
```

---

### Task 13: Update README.md

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write README with full usage documentation**

Cover: what it does, prerequisites, installation, pm2 setup, configuration, manual usage, how it works, contributing link.

Key sections:
- **What it does** — one paragraph
- **Prerequisites** — Node.js >= 22, pm2 (`npm install -g pm2`)
- **Installation** — clone, `npm install`
- **Setup** — `pm2 start ecosystem.config.cjs`, `pm2 save`, then `pm2 startup` (important: explicitly note that `pm2 startup` prints a command the user must copy-paste and run with sudo to register the boot hook)
- **Configuration** — `CCUSAGE_ARCHIVE_DIR` env var, how to set it in the ecosystem config
- **Manual run** — `npm start` or `pm2 restart ccusage-archive`
- **Troubleshooting / Logs** — `pm2 logs ccusage-archive` to view output
- **How it works** — brief explanation of the backfill algorithm
- **Data format** — reference the ccusage JSON output structure from the spec, include the example from the ccusage docs (the `type: "monthly"` format with `data` array, `summary` object)
- **Contributing** — link to CONTRIBUTING.md

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: write comprehensive README with setup and usage instructions

Refs: #1"
```

---

### Task 14: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

Cover:
- Dev environment setup (`nvm use`, `npm install`, `npx lefthook install`)
- Running tests: `npm test` for single run, `npx vitest` for watch mode, `npx vitest run tests/months.test.ts` for a single file
- Running the tool locally (`npm start`)
- Commit conventions (conventional commits, `Refs: #<issue>` footer)
- Branch naming (`<type>/<issue-id>-<description>`)
- Code style (Biome enforced, runs on pre-commit)

- [ ] **Step 2: Commit**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with dev setup and conventions

Refs: #1"
```

---

### Task 15: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: No errors

- [ ] **Step 3: Run biome check**

Run: `npm run check:ci`
Expected: No errors

- [ ] **Step 4: Verify the tool runs end-to-end**

Run: `npm start`
Expected: Prints log output, either captures snapshots or warns about no data in retention window

- [ ] **Step 5: Verify pm2 config loads**

Run: `pm2 start ecosystem.config.cjs; pm2 logs ccusage-archive --lines 20 --nostream; pm2 delete ccusage-archive`
Expected: Tool runs once and exits, logs are visible. Using `;` ensures `pm2 delete` runs even if logs step fails. `--nostream` prevents blocking.

- [ ] **Step 6: Verify snapshot files were created**

Run: `ls -la data/`
Expected: One or more `YYYY-MM.json` files (or empty directory if no ccusage data in retention window)
