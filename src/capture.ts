import { loadDailyUsageData } from 'ccusage/data-loader';
import type { ArchiveDay } from './archive.js';

export function shortenModelName(name: string): string {
  let short = name;
  if (short.startsWith('claude-')) {
    short = short.slice(7);
  }
  short = short.replace(/-\d{8}$/, '');
  return short;
}

export async function captureDailyUsage(): Promise<ArchiveDay[]> {
  const dailyData = await loadDailyUsageData({ mode: 'auto' });

  return dailyData.map((day) => ({
    date: String(day.date),
    inputTokens: day.inputTokens,
    outputTokens: day.outputTokens,
    cacheCreationTokens: day.cacheCreationTokens,
    cacheReadTokens: day.cacheReadTokens,
    totalTokens: day.inputTokens + day.outputTokens + day.cacheCreationTokens + day.cacheReadTokens,
    totalCost: day.totalCost,
    models: day.modelBreakdowns.map((m) => ({
      model: shortenModelName(String(m.modelName)),
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      cacheCreationTokens: m.cacheCreationTokens,
      cacheReadTokens: m.cacheReadTokens,
      cost: m.cost,
    })),
  }));
}
