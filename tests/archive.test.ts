import { describe, expect, it } from 'vitest';
import type { ArchiveDay } from '../src/archive.js';
import { mergeDays } from '../src/archive.js';

function makeDay(date: string, cost: number): ArchiveDay {
  return {
    date,
    inputTokens: 100,
    outputTokens: 200,
    cacheCreationTokens: 300,
    cacheReadTokens: 400,
    totalTokens: 1000,
    totalCost: cost,
    models: [
      {
        model: 'opus-4-6',
        inputTokens: 100,
        outputTokens: 200,
        cacheCreationTokens: 300,
        cacheReadTokens: 400,
        cost,
      },
    ],
  };
}

describe('mergeDays', () => {
  it('adds new days to empty archive', () => {
    const result = mergeDays([], [makeDay('2026-01-15', 10)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.date).toBe('2026-01-15');
  });

  it('preserves existing days (never overwrites)', () => {
    const existing = [makeDay('2026-01-15', 10)];
    const incoming = [makeDay('2026-01-15', 99)];
    const result = mergeDays(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalCost).toBe(10);
  });

  it('adds only new dates, keeps existing untouched', () => {
    const existing = [makeDay('2026-01-15', 10)];
    const incoming = [makeDay('2026-01-15', 99), makeDay('2026-01-16', 20)];
    const result = mergeDays(existing, incoming);
    expect(result).toHaveLength(2);
    expect(result[0]!.totalCost).toBe(10);
    expect(result[1]!.totalCost).toBe(20);
  });

  it('maintains ascending date sort order', () => {
    const existing = [makeDay('2026-01-20', 20)];
    const incoming = [makeDay('2026-01-10', 10), makeDay('2026-01-30', 30)];
    const result = mergeDays(existing, incoming);
    expect(result.map((d) => d.date)).toEqual(['2026-01-10', '2026-01-20', '2026-01-30']);
  });

  it('deduplicates by date', () => {
    const existing = [makeDay('2026-01-15', 10), makeDay('2026-01-15', 10)];
    const incoming = [makeDay('2026-01-15', 99)];
    const result = mergeDays(existing, incoming);
    expect(result).toHaveLength(1);
  });

  it('handles empty incoming array', () => {
    const existing = [makeDay('2026-01-15', 10)];
    const result = mergeDays(existing, []);
    expect(result).toEqual(existing);
  });

  it('handles both empty arrays', () => {
    const result = mergeDays([], []);
    expect(result).toEqual([]);
  });
});
