import path from 'node:path';
import { loadArchive, mergeDays, saveArchive } from './archive.js';
import { captureDailyUsage } from './capture.js';
import { getConfig } from './config.js';

function log(msg: string): void {
  console.log(`[ccusage-archive] ${msg}`);
}

async function main(): Promise<void> {
  const { dataDir } = getConfig();
  const archivePath = path.join(dataDir, 'archive.json');

  log('Loading archive...');
  const archive = loadArchive(archivePath);
  log(`Archive has ${archive.days.length} days`);

  log('Capturing daily usage from ccusage...');
  const captured = await captureDailyUsage();
  log(`Captured ${captured.length} days from ccusage`);

  const merged = mergeDays(archive.days, captured);
  const newDays = merged.length - archive.days.length;

  if (newDays > 0) {
    saveArchive(archivePath, { version: 1, days: merged });
    log(`Added ${newDays} new day${newDays !== 1 ? 's' : ''} to archive`);
  } else {
    log('No new days to add');
  }

  log(`Archive now has ${merged.length} days`);
}

main().catch((err: unknown) => {
  console.error('[ccusage-archive] Fatal:', err);
  process.exitCode = 1;
});
