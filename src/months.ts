const RETENTION_DAYS = 30;

export function formatMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function getMonthRange(now: Date): string[] {
  const retentionStart = new Date(now);
  retentionStart.setDate(retentionStart.getDate() - RETENTION_DAYS);

  // Last completed month is the month before the current one
  const nowMonth = now.getMonth(); // 0-indexed
  const lastCompletedYear = nowMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const lastCompletedMonth = nowMonth === 0 ? 12 : nowMonth; // 1-indexed

  const startYear = retentionStart.getFullYear();
  const startMonth = retentionStart.getMonth() + 1; // 1-indexed

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
