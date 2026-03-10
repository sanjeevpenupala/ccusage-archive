const RETENTION_DAYS = 30;

export function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getMonthRange(now: Date): string[] {
  const retentionStart = new Date(now);
  retentionStart.setUTCDate(retentionStart.getUTCDate() - RETENTION_DAYS);

  // Last completed month is the month before the current one
  const nowUTCMonth = now.getUTCMonth(); // 0-indexed
  const lastCompletedYear = nowUTCMonth === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const lastCompletedMonth = nowUTCMonth === 0 ? 12 : nowUTCMonth; // 1-indexed

  const startYear = retentionStart.getUTCFullYear();
  const startMonth = retentionStart.getUTCMonth() + 1; // 1-indexed

  const months: string[] = [];
  let year = startYear;
  let month = startMonth;

  while (year < lastCompletedYear || (year === lastCompletedYear && month <= lastCompletedMonth)) {
    months.push(formatMonth(year, month));
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }

  return months;
}

export function getMissingMonths(range: string[], existingSnapshots: Set<string>): string[] {
  return range.filter((month) => !existingSnapshots.has(month));
}
