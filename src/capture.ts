import { loadDailyUsageData, loadSessionBlockData, loadWeeklyUsageData } from 'ccusage/data-loader';
import type { ArchiveBlock, ArchiveDay, ArchiveWeek } from './archive.js';

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

/**
 * Capture completed 5-hour session blocks (the usage-limit windows).
 * Skips gap blocks (idle spans) and the currently active block (still growing);
 * the active one gets archived on a later run once it has closed.
 */
export async function captureSessionBlocks(): Promise<ArchiveBlock[]> {
  const blocks = await loadSessionBlockData({ mode: 'auto' });

  return blocks
    .filter((b) => !b.isGap && !b.isActive)
    .map((b) => {
      const t = b.tokenCounts;
      return {
        id: String(b.id),
        startTime: String(b.startTime),
        endTime: String(b.endTime),
        actualEndTime: String(b.actualEndTime),
        inputTokens: t.inputTokens,
        outputTokens: t.outputTokens,
        cacheCreationTokens: t.cacheCreationInputTokens,
        cacheReadTokens: t.cacheReadInputTokens,
        totalTokens:
          t.inputTokens + t.outputTokens + t.cacheCreationInputTokens + t.cacheReadInputTokens,
        totalCost: b.costUSD,
        models: b.models.map((m) => shortenModelName(String(m))),
        usageLimitResetTime: b.usageLimitResetTime ? String(b.usageLimitResetTime) : null,
      };
    });
}

/** Capture weekly usage totals — the dimension governed by the separate weekly cap. */
export async function captureWeeklyUsage(): Promise<ArchiveWeek[]> {
  const weeks = await loadWeeklyUsageData({ mode: 'auto' });

  return weeks.map((w) => ({
    week: String(w.week),
    inputTokens: w.inputTokens,
    outputTokens: w.outputTokens,
    cacheCreationTokens: w.cacheCreationTokens,
    cacheReadTokens: w.cacheReadTokens,
    totalTokens: w.inputTokens + w.outputTokens + w.cacheCreationTokens + w.cacheReadTokens,
    totalCost: w.totalCost,
    models: w.modelBreakdowns.map((m) => ({
      model: shortenModelName(String(m.modelName)),
      inputTokens: m.inputTokens,
      outputTokens: m.outputTokens,
      cacheCreationTokens: m.cacheCreationTokens,
      cacheReadTokens: m.cacheReadTokens,
      cost: m.cost,
    })),
  }));
}
