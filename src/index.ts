import path from 'node:path';
import { loadArchive, mergeBlocks, mergeDays, mergeWeeks, saveArchive } from './archive.js';
import { captureDailyUsage, captureSessionBlocks, captureWeeklyUsage } from './capture.js';
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

  log('Capturing session blocks and weekly totals...');
  const capturedBlocks = await captureSessionBlocks();
  const capturedWeeks = await captureWeeklyUsage();
  log(`Captured ${capturedBlocks.length} completed blocks, ${capturedWeeks.length} weeks`);

  const mergedDays = mergeDays(archive.days, captured);
  const mergedBlocks = mergeBlocks(archive.blocks, capturedBlocks);
  const mergedWeeks = mergeWeeks(archive.weeks, capturedWeeks);

  const newDays = mergedDays.length - archive.days.length;
  const newBlocks = mergedBlocks.length - archive.blocks.length;

  // Weekly totals for the current week keep changing, so always persist.
  saveArchive(archivePath, {
    version: 2,
    days: mergedDays,
    blocks: mergedBlocks,
    weeks: mergedWeeks,
  });
  log(
    `Added ${newDays} new day${newDays !== 1 ? 's' : ''}, ${newBlocks} new block${newBlocks !== 1 ? 's' : ''}`,
  );

  log(
    `Archive now has ${mergedDays.length} days, ${mergedBlocks.length} blocks, ${mergedWeeks.length} weeks`,
  );
}

main().catch((err: unknown) => {
  console.error('[ccusage-archive] Fatal:', err);
  process.exitCode = 1;
});
