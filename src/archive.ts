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

export interface Archive {
  readonly version: 1;
  readonly days: ArchiveDay[];
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

const EMPTY_ARCHIVE: Archive = { version: 1, days: [] };

export function loadArchive(filePath: string): Archive {
  if (!fs.existsSync(filePath)) {
    return EMPTY_ARCHIVE;
  }
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Archive;
  return raw;
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
