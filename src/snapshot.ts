import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface ExecResult {
  readonly exitCode: number;
  readonly stdout: string;
}

export interface CaptureResult {
  readonly success: boolean;
  readonly month: string;
  readonly reason?: string;
}

export function getExistingSnapshots(dataDir: string): Set<string> {
  if (!fs.existsSync(dataDir)) {
    return new Set();
  }

  const files = fs.readdirSync(dataDir);
  const months = new Set<string>();

  for (const file of files) {
    if (file.endsWith('.json')) {
      months.add(file.replace('.json', ''));
    }
  }

  return months;
}

export function getDateRangeForMonth(month: string): { since: string; until: string } {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthNum = Number(monthStr);

  const since = `${year}${String(monthNum).padStart(2, '0')}01`;

  // Last day of the month
  const lastDay = new Date(year, monthNum, 0).getDate();
  const until = `${year}${String(monthNum).padStart(2, '0')}${String(lastDay).padStart(2, '0')}`;

  return { since, until };
}

export async function captureMonth(
  month: string,
  dataDir: string,
  exec?: (month: string) => Promise<ExecResult>,
): Promise<CaptureResult> {
  const runner = exec ?? defaultExec;

  const result = await runner(month);

  if (result.exitCode !== 0) {
    return { success: false, month, reason: `ccusage exited with code ${result.exitCode}` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return { success: false, month, reason: 'ccusage output is not valid JSON' };
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('data' in parsed) ||
    !Array.isArray((parsed as Record<string, unknown>).data) ||
    ((parsed as Record<string, unknown>).data as unknown[]).length === 0
  ) {
    return { success: false, month, reason: 'ccusage returned empty data (past retention?)' };
  }

  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `${month}.json`), result.stdout, 'utf-8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, month, reason: `Failed to write snapshot: ${message}` };
  }

  return { success: true, month };
}

async function defaultExec(month: string): Promise<ExecResult> {
  const { since, until } = getDateRangeForMonth(month);

  try {
    const { stdout } = await execFileAsync('npx', [
      '--yes',
      'ccusage@latest',
      'monthly',
      '--json',
      '--since',
      since,
      '--until',
      until,
    ]);

    return { exitCode: 0, stdout };
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? (error as { code: unknown }).code
        : undefined;
    const exitCode = typeof code === 'number' ? code : 1;
    return { exitCode, stdout: '' };
  }
}
