import { afterEach, describe, expect, it, vi } from 'vitest';
import { getConfig } from '../src/config.js';

describe('getConfig', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns default data directory when env var is not set', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '');
    const config = getConfig();
    expect(config.dataDir).toMatch(/data$/);
  });

  it('uses CCUSAGE_ARCHIVE_DIR when set', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '/tmp/custom-snapshots');
    const config = getConfig();
    expect(config.dataDir).toBe('/tmp/custom-snapshots');
  });

  it('resolves relative paths against cwd', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', './custom-data');
    const config = getConfig();
    expect(config.dataDir).toMatch(/custom-data$/);
    expect(config.dataDir).not.toBe('./custom-data');
  });

  it('falls back to default when env var is empty string', () => {
    vi.stubEnv('CCUSAGE_ARCHIVE_DIR', '');
    const config = getConfig();
    expect(config.dataDir).toMatch(/data$/);
  });
});
