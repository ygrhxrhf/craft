import { describe, expect, it } from 'vitest';

import { SYNC_DB_FILE, isPersistentSqlitePath, resolveSqlitePath } from './sqlite-path';

// G1516: the desktop database must be a file, so a restart keeps what was written.
describe('the sqlite database path', () => {
  it('honours an explicit path, including the in-memory one', () => {
    expect(resolveSqlitePath('/tmp/x.sqlite')).toBe('/tmp/x.sqlite');
    expect(resolveSqlitePath(':memory:')).toBe(':memory:');
  });

  it('falls back to a data directory when none is given', () => {
    const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const dir = env?.CRAFTY_DATA_DIR ?? env?.APPDATA ?? env?.XDG_DATA_HOME ?? env?.HOME;
    if (!dir) return; // no home directory in this environment; nothing to assert
    const path = resolveSqlitePath();
    expect(path).toContain(SYNC_DB_FILE);
    expect(isPersistentSqlitePath(path)).toBe(true);
  });

  it('knows a real file from the in-memory fallback', () => {
    expect(isPersistentSqlitePath(':memory:')).toBe(false);
    expect(isPersistentSqlitePath('/var/data/crafty-sync.sqlite')).toBe(true);
  });
});
