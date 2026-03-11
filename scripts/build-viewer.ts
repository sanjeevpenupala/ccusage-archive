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
