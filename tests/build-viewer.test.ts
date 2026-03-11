import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildViewer, normalizeSnapshot, shortenModelName } from '../scripts/build-viewer.js';

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
