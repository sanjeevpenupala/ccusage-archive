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
    const range = getMonthRange(new Date(2025, 2, 15));
    expect(range).toContain('2025-02');
    expect(range).not.toContain('2025-03');
  });

  it('includes completed months spanning a year boundary', () => {
    const range = getMonthRange(new Date(2025, 0, 5));
    expect(range).toContain('2024-12');
  });

  it('returns multiple months when retention window spans them', () => {
    const range = getMonthRange(new Date(2025, 2, 1));
    expect(range).toContain('2025-01');
    expect(range).toContain('2025-02');
  });

  it('excludes a month when retention window starts after it ends', () => {
    const range = getMonthRange(new Date(2025, 2, 2));
    expect(range).toContain('2025-01');

    const range2 = getMonthRange(new Date(2025, 2, 3));
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
