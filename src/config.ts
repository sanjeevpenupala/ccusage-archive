import path from 'node:path';

export interface Config {
  readonly dataDir: string;
}

export function getConfig(): Config {
  const envDir = process.env.CCUSAGE_ARCHIVE_DIR;
  const dataDir = envDir ? path.resolve(envDir) : path.resolve('data');

  return { dataDir };
}
