import { describe, expect, it } from 'vitest';
import type { ArchiveBlock, ArchiveDay, ArchiveWeek } from '../src/archive.js';
import { mergeBlocks, mergeDays, mergeWeeks } from '../src/archive.js';

function makeBlock(startTime: string, cost: number): ArchiveBlock {
  return {
    id: startTime,
    startTime,
    endTime: startTime,
    actualEndTime: startTime,
    inputTokens: 1,
    outputTokens: 2,
    cacheCreationTokens: 3,
    cacheReadTokens: 4,
    totalTokens: 10,
    totalCost: cost,
    models: ['opus-4-6'],
    usageLimitResetTime: null,
  };
}

function makeWeek(week: string, cost: number): ArchiveWeek {
  return {
    week,
    inputTokens: 1,
    outputTokens: 2,
    cacheCreationTokens: 3,
    cacheReadTokens: 4,
    totalTokens: 10,
    totalCost: cost,
    models: [],
  };
}

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

describe('mergeBlocks', () => {
  it('adds new blocks by id', () => {
    const result = mergeBlocks([], [makeBlock('2026-01-15T07:00:00.000Z', 1)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('2026-01-15T07:00:00.000Z');
  });

  it('preserves existing blocks — a completed block is immutable', () => {
    const existing = [makeBlock('2026-01-15T07:00:00.000Z', 1)];
    const incoming = [makeBlock('2026-01-15T07:00:00.000Z', 99)];
    const result = mergeBlocks(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalCost).toBe(1);
  });

  it('maintains ascending start-time sort order', () => {
    const existing = [makeBlock('2026-01-15T12:00:00.000Z', 2)];
    const incoming = [
      makeBlock('2026-01-15T07:00:00.000Z', 1),
      makeBlock('2026-01-15T17:00:00.000Z', 3),
    ];
    const result = mergeBlocks(existing, incoming);
    expect(result.map((b) => b.startTime)).toEqual([
      '2026-01-15T07:00:00.000Z',
      '2026-01-15T12:00:00.000Z',
      '2026-01-15T17:00:00.000Z',
    ]);
  });

  it('handles empty incoming array', () => {
    const existing = [makeBlock('2026-01-15T07:00:00.000Z', 1)];
    expect(mergeBlocks(existing, [])).toEqual(existing);
  });
});

describe('mergeWeeks', () => {
  it('adds new weeks by week key', () => {
    const result = mergeWeeks([], [makeWeek('2026-01-12', 1)]);
    expect(result).toHaveLength(1);
    expect(result[0]!.week).toBe('2026-01-12');
  });

  it('lets incoming overwrite — the current week keeps accumulating', () => {
    const existing = [makeWeek('2026-01-12', 1)];
    const incoming = [makeWeek('2026-01-12', 99)];
    const result = mergeWeeks(existing, incoming);
    expect(result).toHaveLength(1);
    expect(result[0]!.totalCost).toBe(99);
  });

  it('preserves existing weeks that incoming no longer covers', () => {
    const existing = [makeWeek('2025-12-01', 5)];
    const incoming = [makeWeek('2026-01-12', 10)];
    const result = mergeWeeks(existing, incoming);
    expect(result.map((w) => w.week)).toEqual(['2025-12-01', '2026-01-12']);
    expect(result[0]!.totalCost).toBe(5);
  });

  it('maintains ascending week sort order', () => {
    const existing = [makeWeek('2026-01-19', 3)];
    const incoming = [makeWeek('2026-01-05', 1), makeWeek('2026-01-12', 2)];
    const result = mergeWeeks(existing, incoming);
    expect(result.map((w) => w.week)).toEqual(['2026-01-05', '2026-01-12', '2026-01-19']);
  });
});
