import fs from 'node:fs';
import path from 'node:path';

export interface ArchiveModel {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly cost: number;
}

export interface ArchiveDay {
  readonly date: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly models: ArchiveModel[];
}

/**
 * A completed 5-hour session block — the window Claude's usage limits reset on.
 * Only completed, non-gap blocks are archived, so each entry is immutable.
 */
export interface ArchiveBlock {
  readonly id: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly actualEndTime: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly models: string[];
  /** ISO timestamp when a hit usage limit resets, or null if the block never hit a limit. */
  readonly usageLimitResetTime: string | null;
}

export interface ArchiveWeek {
  readonly week: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheCreationTokens: number;
  readonly cacheReadTokens: number;
  readonly totalTokens: number;
  readonly totalCost: number;
  readonly models: ArchiveModel[];
}

export interface Archive {
  readonly version: number;
  readonly days: ArchiveDay[];
  readonly blocks: ArchiveBlock[];
  readonly weeks: ArchiveWeek[];
}

/**
 * Merge incoming days into existing archive days.
 * Existing data wins — never overwrite an archived day.
 * Result is sorted by date ascending and deduplicated.
 */
export function mergeDays(existing: ArchiveDay[], incoming: ArchiveDay[]): ArchiveDay[] {
  const byDate = new Map<string, ArchiveDay>();

  for (const day of existing) {
    byDate.set(day.date, day);
  }

  for (const day of incoming) {
    if (!byDate.has(day.date)) {
      byDate.set(day.date, day);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Merge session blocks by id. Existing wins — a completed block never changes,
 * so the first capture is authoritative and survives even after the raw logs
 * that produced it age out. Sorted by start time ascending.
 */
export function mergeBlocks(existing: ArchiveBlock[], incoming: ArchiveBlock[]): ArchiveBlock[] {
  const byId = new Map<string, ArchiveBlock>();

  for (const block of existing) {
    byId.set(block.id, block);
  }

  for (const block of incoming) {
    if (!byId.has(block.id)) {
      byId.set(block.id, block);
    }
  }

  return [...byId.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
}

/**
 * Merge weekly totals by week. Incoming wins — the current week is still
 * accumulating, so its totals must update on each run. Weeks that have aged out
 * of the raw logs are preserved from the existing archive. Sorted ascending.
 */
export function mergeWeeks(existing: ArchiveWeek[], incoming: ArchiveWeek[]): ArchiveWeek[] {
  const byWeek = new Map<string, ArchiveWeek>();

  for (const week of existing) {
    byWeek.set(week.week, week);
  }

  for (const week of incoming) {
    byWeek.set(week.week, week);
  }

  return [...byWeek.values()].sort((a, b) => a.week.localeCompare(b.week));
}

const EMPTY_ARCHIVE: Archive = { version: 2, days: [], blocks: [], weeks: [] };

export function loadArchive(filePath: string): Archive {
  if (!fs.existsSync(filePath)) {
    return EMPTY_ARCHIVE;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Partial<Archive>;
  // Normalize legacy (v1) archives that predate blocks/weeks.
  return {
    version: 2,
    days: raw.days ?? [],
    blocks: raw.blocks ?? [],
    weeks: raw.weeks ?? [],
  };
}

export function saveArchive(filePath: string, archive: Archive): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(archive, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}
