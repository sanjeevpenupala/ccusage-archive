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
      monthly: [{ month: '2025-01', totalTokens: 1000, totalCost: 5.0 }],
      totals: { totalTokens: 1000, totalCost: 5.0 },
    };

    const result = await captureMonth('2025-01', tmpDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(true);
    const written = JSON.parse(fs.readFileSync(path.join(tmpDir, '2025-01.json'), 'utf-8'));
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
    const mockData = { monthly: [], totals: {} };

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
      monthly: [{ month: '2025-01' }],
      totals: {},
    };

    const result = await captureMonth('2025-01', nestedDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(nestedDir, '2025-01.json'))).toBe(true);
  });

  it('returns failure when disk write fails', async () => {
    const blockerFile = path.join(tmpDir, 'blocker');
    fs.writeFileSync(blockerFile, '');
    const badDir = path.join(blockerFile, 'subdir');

    const mockData = {
      monthly: [{ month: '2025-01' }],
      totals: {},
    };

    const result = await captureMonth('2025-01', badDir, () =>
      Promise.resolve({ exitCode: 0, stdout: JSON.stringify(mockData) }),
    );

    expect(result.success).toBe(false);
    expect(result.reason).toMatch(/failed to write/i);
  });
});
