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
