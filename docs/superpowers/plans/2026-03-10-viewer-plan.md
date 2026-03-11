# ccusage Archive Viewer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained HTML dashboard that visualizes archived ccusage monthly cost data with a bar chart and expandable table.

**Architecture:** A build script reads snapshot JSONs from the data directory, normalizes them, and injects the data into an HTML template to produce a single self-contained `viewer.html`. The HTML uses inline CSS/JS for a dark-themed dashboard with a cost bar chart and expandable monthly table.

**Tech Stack:** TypeScript (build script run via tsx), HTML/CSS/JS (viewer template), Vitest (tests)

**Spec:** `docs/superpowers/specs/2026-03-10-viewer-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `scripts/build-viewer.ts` | Reads snapshot JSONs, normalizes data, injects into template, writes `viewer.html` |
| `src/viewer/template.html` | Self-contained HTML template with `/*__DATA__*/` placeholder; all CSS/JS inline |
| `tests/build-viewer.test.ts` | Tests for the build script's data normalization and file generation |

---

## Chunk 1: Build Script + Tests

### Task 1: Fix snapshot validation bug

The existing `captureMonth` in `src/snapshot.ts` checks for a `data` array, but ccusage actually returns a `monthly` array. Fix this so snapshots are saved correctly. Also update the corresponding test.

**Files:**
- Modify: `src/snapshot.ts:70-76`
- Modify: `tests/snapshot.test.ts` (the test that creates mock ccusage output)

- [ ] **Step 1: Update the validation in `captureMonth`**

In `src/snapshot.ts`, change the validation block (lines 70-76) from checking `data` to checking `monthly`:

```typescript
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('monthly' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).monthly) ||
    ((parsed as Record<string, unknown>).monthly as unknown[]).length === 0
  ) {
    return { success: false, month, reason: 'ccusage returned empty data (past retention?)' };
  }
```

- [ ] **Step 2: Update all 5 mock data locations in tests**

In `tests/snapshot.test.ts`, update every mock ccusage output from `{ data: [...] }` to `{ monthly: [...] }`. There are exactly 5 locations:

1. **Line 81-84** ("writes snapshot file when ccusage returns valid data"):
   ```typescript
   const mockData = {
     monthly: [{ month: '2025-01', totalTokens: 1000, totalCost: 5.0 }],
     totals: { totalTokens: 1000, totalCost: 5.0 },
   };
   ```

2. **Line 106** ("returns failure when ccusage returns empty data array"):
   ```typescript
   const mockData = { monthly: [], totals: {} };
   ```

3. **Lines 126-129** ("creates data directory if it does not exist"):
   ```typescript
   const mockData = {
     monthly: [{ month: '2025-01' }],
     totals: {},
   };
   ```

4. **Lines 145-148** ("returns failure when disk write fails"):
   ```typescript
   const mockData = {
     monthly: [{ month: '2025-01' }],
     totals: {},
   };
   ```

All four `type: 'monthly'` and `summary` keys are removed — use `monthly` array and `totals` object to match real ccusage output.

- [ ] **Step 3: Run tests**

Run: `npx vitest run tests/snapshot.test.ts`
Expected: All 14 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/snapshot.ts tests/snapshot.test.ts
git commit -m "fix: validate 'monthly' array instead of 'data' in snapshot capture

ccusage returns { monthly: [...] }, not { data: [...] }.

Refs: #1"
```

---

### Task 2: Build script — data normalization (TDD)

Write the build script's core logic: reading snapshot JSONs, normalizing model names, and producing the embedded data array. Test this logic in isolation before wiring up file I/O.

**Files:**
- Create: `scripts/build-viewer.ts`
- Create: `tests/build-viewer.test.ts`

- [ ] **Step 1: Write failing tests for data normalization**

Create `tests/build-viewer.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { normalizeSnapshot, shortenModelName } from '../scripts/build-viewer.js';

describe('shortenModelName', () => {
  it('strips claude- prefix', () => {
    expect(shortenModelName('claude-opus-4-6')).toBe('opus-4-6');
  });

  it('strips trailing date suffix', () => {
    expect(shortenModelName('claude-sonnet-4-5-20250929')).toBe('sonnet-4-5');
  });

  it('strips both prefix and date suffix', () => {
    expect(shortenModelName('claude-haiku-4-5-20251001')).toBe('haiku-4-5');
  });

  it('returns name unchanged when no prefix or suffix', () => {
    expect(shortenModelName('custom-model')).toBe('custom-model');
  });
});

describe('normalizeSnapshot', () => {
  it('extracts first monthly entry and normalizes model breakdowns', () => {
    const raw = {
      monthly: [
        {
          month: '2026-02',
          inputTokens: 310714,
          outputTokens: 262985,
          cacheCreationTokens: 34705827,
          cacheReadTokens: 487082986,
          totalTokens: 522362512,
          totalCost: 403.09,
          modelsUsed: ['claude-opus-4-6'],
          modelBreakdowns: [
            {
              modelName: 'claude-opus-4-6',
              inputTokens: 204054,
              outputTokens: 227808,
              cacheCreationTokens: 22079832,
              cacheReadTokens: 333011701,
              cost: 311.22,
            },
          ],
        },
      ],
      totals: { totalTokens: 522362512, totalCost: 403.09 },
    };

    const result = normalizeSnapshot(raw);
    expect(result).toEqual({
      month: '2026-02',
      totalCost: 403.09,
      totalTokens: 522362512,
      inputTokens: 310714,
      outputTokens: 262985,
      cacheCreationTokens: 34705827,
      cacheReadTokens: 487082986,
      models: [
        {
          name: 'opus-4-6',
          cost: 311.22,
          inputTokens: 204054,
          outputTokens: 227808,
          cacheCreationTokens: 22079832,
          cacheReadTokens: 333011701,
        },
      ],
    });
  });

  it('returns null for invalid input', () => {
    expect(normalizeSnapshot({})).toBeNull();
    expect(normalizeSnapshot({ monthly: [] })).toBeNull();
    expect(normalizeSnapshot(null)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/build-viewer.test.ts`
Expected: FAIL — `normalizeSnapshot` and `shortenModelName` are not defined.

- [ ] **Step 3: Implement the functions**

Create `scripts/build-viewer.ts`:

```typescript
import fs from 'node:fs';
import path from 'node:path';

export interface NormalizedModel {
  readonly name: string;
  readonly cost: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
}

export interface NormalizedMonth {
  readonly month: string;
  readonly totalCost: number;
  readonly totalTokens: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly models: NormalizedModel[];
}

export function shortenModelName(name: string): string {
  let short = name;
  if (short.startsWith('claude-')) {
    short = short.slice(7);
  }
  short = short.replace(/-\d{8}$/, '');
  return short;
}

export function normalizeSnapshot(raw: unknown): NormalizedMonth | null {
  if (typeof raw !== 'object' || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.monthly) || obj.monthly.length === 0) return null;

  const entry = obj.monthly[0] as Record<string, unknown>;

  const breakdowns = Array.isArray(entry.modelBreakdowns) ? entry.modelBreakdowns : [];
  const models: NormalizedModel[] = (breakdowns as Record<string, unknown>[]).map((b) => ({
    name: shortenModelName(String(b.modelName ?? '')),
    cost: Number(b.cost ?? 0),
    inputTokens: Number(b.inputTokens ?? 0),
    outputTokens: Number(b.outputTokens ?? 0),
    cacheCreationTokens: Number(b.cacheCreationTokens ?? 0),
    cacheReadTokens: Number(b.cacheReadTokens ?? 0),
  }));

  return {
    month: String(entry.month ?? ''),
    totalCost: Number(entry.totalCost ?? 0),
    totalTokens: Number(entry.totalTokens ?? 0),
    inputTokens: Number(entry.inputTokens ?? 0),
    outputTokens: Number(entry.outputTokens ?? 0),
    cacheCreationTokens: Number(entry.cacheCreationTokens ?? 0),
    cacheReadTokens: Number(entry.cacheReadTokens ?? 0),
    models,
  };
}
```

Note: The file I/O and template injection (the `buildViewer` function) will be added in Task 3. This task only implements and tests the pure data transformation functions.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/build-viewer.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-viewer.ts tests/build-viewer.test.ts
git commit -m "feat: add snapshot normalization for viewer build script

Refs: #1"
```

---

### Task 3: Build script — file I/O and template injection (TDD)

Wire up the build script to read snapshot files, call the normalization from Task 2, inject into template, and write the output.

**Files:**
- Modify: `scripts/build-viewer.ts`
- Modify: `tests/build-viewer.test.ts`

- [ ] **Step 1: Write failing tests for `buildViewer`**

Add to `tests/build-viewer.test.ts`. Add `fs`, `os`, `path` to the existing imports at the top of the file. Add `afterEach`, `beforeEach` to the existing vitest import. Add `buildViewer` to the existing import from `../scripts/build-viewer.js`. Then append this `describe` block after the existing tests:

```typescript
describe('buildViewer', () => {
  let tmpDir: string;
  let templatePath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'viewer-test-'));
    templatePath = path.join(tmpDir, 'template.html');
    fs.writeFileSync(
      templatePath,
      '<html><script>const DATA = [/*__DATA__*/];</script><body>test</body></html>',
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('reads snapshots and injects normalized data into template', () => {
    const snapshot = {
      monthly: [
        {
          month: '2025-12',
          inputTokens: 100,
          outputTokens: 200,
          cacheCreationTokens: 300,
          cacheReadTokens: 400,
          totalTokens: 1000,
          totalCost: 5.0,
          modelsUsed: ['claude-opus-4-6'],
          modelBreakdowns: [
            {
              modelName: 'claude-opus-4-6',
              inputTokens: 100,
              outputTokens: 200,
              cacheCreationTokens: 300,
              cacheReadTokens: 400,
              cost: 5.0,
            },
          ],
        },
      ],
      totals: { totalTokens: 1000, totalCost: 5.0 },
    };
    fs.writeFileSync(path.join(tmpDir, '2025-12.json'), JSON.stringify(snapshot));

    const outputPath = path.join(tmpDir, 'viewer.html');
    buildViewer(tmpDir, templatePath, outputPath);

    const output = fs.readFileSync(outputPath, 'utf-8');
    expect(output).toContain('"month":"2025-12"');
    expect(output).toContain('"name":"opus-4-6"');
    expect(output).not.toContain('/*__DATA__*/');
  });

  it('skips non-json files', () => {
    fs.writeFileSync(path.join(tmpDir, 'viewer.html'), 'old');
    fs.writeFileSync(path.join(tmpDir, 'readme.txt'), 'ignore');
    const snapshot = {
      monthly: [{ month: '2025-11', totalTokens: 1, totalCost: 1, modelBreakdowns: [] }],
      totals: {},
    };
    fs.writeFileSync(path.join(tmpDir, '2025-11.json'), JSON.stringify(snapshot));

    const outputPath = path.join(tmpDir, 'viewer.html');
    buildViewer(tmpDir, templatePath, outputPath);

    const output = fs.readFileSync(outputPath, 'utf-8');
    expect(output).toContain('"month":"2025-11"');
  });

  it('sorts months ascending', () => {
    const makeSnapshot = (month: string) => ({
      monthly: [{ month, totalTokens: 1, totalCost: 1, modelBreakdowns: [] }],
      totals: {},
    });
    fs.writeFileSync(path.join(tmpDir, '2026-02.json'), JSON.stringify(makeSnapshot('2026-02')));
    fs.writeFileSync(path.join(tmpDir, '2025-12.json'), JSON.stringify(makeSnapshot('2025-12')));
    fs.writeFileSync(path.join(tmpDir, '2026-01.json'), JSON.stringify(makeSnapshot('2026-01')));

    const outputPath = path.join(tmpDir, 'viewer.html');
    buildViewer(tmpDir, templatePath, outputPath);

    const output = fs.readFileSync(outputPath, 'utf-8');
    const idx12 = output.indexOf('2025-12');
    const idx01 = output.indexOf('2026-01');
    const idx02 = output.indexOf('2026-02');
    expect(idx12).toBeLessThan(idx01);
    expect(idx01).toBeLessThan(idx02);
  });

  it('produces valid output when data directory is empty', () => {
    const outputPath = path.join(tmpDir, 'viewer.html');
    buildViewer(tmpDir, templatePath, outputPath);

    const output = fs.readFileSync(outputPath, 'utf-8');
    expect(output).toContain('const DATA = [];');
  });

  it('skips invalid JSON files gracefully', () => {
    fs.writeFileSync(path.join(tmpDir, '2025-10.json'), 'not json');
    const snapshot = {
      monthly: [{ month: '2025-11', totalTokens: 1, totalCost: 1, modelBreakdowns: [] }],
      totals: {},
    };
    fs.writeFileSync(path.join(tmpDir, '2025-11.json'), JSON.stringify(snapshot));

    const outputPath = path.join(tmpDir, 'viewer.html');
    buildViewer(tmpDir, templatePath, outputPath);

    const output = fs.readFileSync(outputPath, 'utf-8');
    expect(output).toContain('"month":"2025-11"');
    expect(output).not.toContain('2025-10');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/build-viewer.test.ts`
Expected: FAIL — `buildViewer` is not exported.

- [ ] **Step 3: Implement `buildViewer` and `main`**

Add to `scripts/build-viewer.ts`:

```typescript
export function buildViewer(dataDir: string, templatePath: string, outputPath: string): void {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  const months: NormalizedMonth[] = [];

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    let raw: unknown;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch {
      console.warn(`Skipping invalid JSON: ${file}`);
      continue;
    }

    const normalized = normalizeSnapshot(raw);
    if (normalized) {
      months.push(normalized);
    }
  }

  months.sort((a, b) => a.month.localeCompare(b.month));

  const template = fs.readFileSync(templatePath, 'utf-8');
  const output = template.replace('/*__DATA__*/', JSON.stringify(months));
  fs.writeFileSync(outputPath, output, 'utf-8');
}

const isMainModule = process.argv[1]?.endsWith('build-viewer.ts');
if (isMainModule) {
  const dataDir = process.env.CCUSAGE_ARCHIVE_DIR
    ? path.resolve(process.env.CCUSAGE_ARCHIVE_DIR)
    : path.resolve('data');
  const templatePath = path.resolve('src/viewer/template.html');
  const outputPath = path.join(dataDir, 'viewer.html');

  buildViewer(dataDir, templatePath, outputPath);
  console.log(`Viewer built: ${outputPath}`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/build-viewer.test.ts`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-viewer.ts tests/build-viewer.test.ts
git commit -m "feat: add build-viewer file I/O and template injection

Refs: #1"
```

---

## Chunk 2: HTML Template + npm Scripts

### Task 4: HTML template

Create the self-contained HTML template with dark theme, bar chart, expandable table, and empty state. All CSS and JS inline. Uses `/*__DATA__*/` placeholder for data injection.

**Files:**
- Create: `src/viewer/template.html`

- [ ] **Step 1: Create the HTML template**

Create `src/viewer/template.html`. This is a complete, self-contained HTML file with inline CSS and JS. Key elements:

- Dark theme (`background: #1a1a2e`, light text)
- Monospace font for data columns
- Header with title and summary line ("N months — $X.XX total")
- CSS bar chart: flex container with bars proportional to max cost, labeled with `YYYY-MM` and cost value
- Table sorted newest-first with columns: chevron, Month, Cost, Tokens, Models count
- Expandable detail rows per month showing per-model breakdown (name, cost, tokens)
- Totals row at bottom summing cost and tokens
- Empty state: "No snapshots found. Run `npm start` to capture data."
- Data placeholder: `const DATA = [/*__DATA__*/];`
- Helper functions: `formatCost(n)` → `$X.XX`, `formatTokens(n)` → human-readable (K/M/B)
- `toggleDetail(i)` function to expand/collapse model breakdown rows
- `render()` function called on load to build the page from `DATA`

The template must use DOM string building (concatenation to set `innerHTML`) since this is a locally-generated file with no user input — all data comes from the user's own local JSON snapshots. No external resources.

- [ ] **Step 2: Verify the template has the data placeholder**

Run: `grep '\/\*__DATA__\*\/' src/viewer/template.html`
Expected: Matches the line `const DATA = [/*__DATA__*/];`

- [ ] **Step 3: Commit**

```bash
git add src/viewer/template.html
git commit -m "feat: add viewer HTML template with chart and expandable table

Refs: #1"
```

---

### Task 5: npm scripts and integration test

Add the `viewer` and `viewer:build` npm scripts. Run an end-to-end test: create a snapshot file, run the build, and verify the output HTML.

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add npm scripts to `package.json`**

Add two scripts to the `scripts` section in `package.json`:

```json
"viewer:build": "tsx scripts/build-viewer.ts",
"viewer": "npm run viewer:build && open data/viewer.html"
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: All tests pass (config, months, snapshot, build-viewer).

- [ ] **Step 3: Integration smoke test**

Create a test snapshot and build:

```bash
mkdir -p data
echo '{"monthly":[{"month":"2026-02","inputTokens":100,"outputTokens":200,"cacheCreationTokens":300,"cacheReadTokens":400,"totalTokens":1000,"totalCost":5.0,"modelsUsed":["claude-opus-4-6"],"modelBreakdowns":[{"modelName":"claude-opus-4-6","inputTokens":100,"outputTokens":200,"cacheCreationTokens":300,"cacheReadTokens":400,"cost":5.0}]}],"totals":{"totalTokens":1000,"totalCost":5.0}}' > data/2026-02.json
npm run viewer:build
```

Expected: `Viewer built: <path>/data/viewer.html` printed to stdout. File exists and contains the embedded data.

Clean up the test snapshot:

```bash
rm data/2026-02.json data/viewer.html
```

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "feat: add viewer npm scripts

Refs: #1"
```

---

### Task 6: Final verification

Run all checks to ensure nothing is broken.

**Files:** None (verification only)

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: Clean (note: `scripts/` is outside `src/` so not typechecked by tsc, but tsx will still run it correctly).

- [ ] **Step 3: Run Biome**

Run: `npx biome ci`
Expected: No errors.

- [ ] **Step 4: Verify git status is clean**

Run: `git status`
Expected: Nothing uncommitted except possibly `.gitignore` changes from the spec commit.
