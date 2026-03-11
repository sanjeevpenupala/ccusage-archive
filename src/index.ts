import { getConfig } from './config.js';
import { getMissingMonths, getMonthRange } from './months.js';
import { captureMonth, getExistingSnapshots } from './snapshot.js';

async function main(): Promise<void> {
  const config = getConfig();
  const now = new Date();

  console.log(`[ccusage-archive] Starting snapshot check...`);
  console.log(`[ccusage-archive] Data directory: ${config.dataDir}`);

  const range = getMonthRange(now);
  if (range.length === 0) {
    console.log('[ccusage-archive] No months in retention window to check.');
    return;
  }

  console.log(`[ccusage-archive] Checking months: ${range.join(', ')}`);

  const existing = getExistingSnapshots(config.dataDir);
  const missing = getMissingMonths(range, existing);

  if (missing.length === 0) {
    console.log('[ccusage-archive] All months within retention window are captured.');
    return;
  }

  console.log(`[ccusage-archive] Missing months: ${missing.join(', ')}`);

  for (const month of missing) {
    console.log(`[ccusage-archive] Capturing ${month}...`);
    const result = await captureMonth(month, config.dataDir);

    if (result.success) {
      console.log(`[ccusage-archive] Saved ${month}.json`);
    } else {
      console.warn(`[ccusage-archive] Skipping ${month}: ${result.reason}`);
    }
  }

  console.log('[ccusage-archive] Done.');
}

main().catch((error: unknown) => {
  console.error('[ccusage-archive] Fatal error:', error);
  process.exit(1);
});
