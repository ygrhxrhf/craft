/**
 * G1516: on the desktop the local database has to be a **file**, so what was written is still
 * there after a restart. The sqlite adapter used to hard-code `:memory:`, which meant every launch
 * started from an empty database — the offline-first promise was only half kept.
 *
 * The path is resolved here, in one place: an explicit path wins (tests pass `:memory:`), then the
 * platform's data directory, and only as a last resort an in-memory database.
 */

/** The file name the desktop build keeps its sync database in. */
export const SYNC_DB_FILE = 'crafty-sync.sqlite';

/** An explicit path, or null. `:memory:` is treated as explicit so tests stay isolated. */
function explicitPath(dbPath: string | undefined): string | null {
  return typeof dbPath === 'string' && dbPath.length > 0 ? dbPath : null;
}

/** A directory the desktop runtime can write to, or null when none is known. */
function platformDataDir(): string | null {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const env = proc?.env;
  if (!env) return null;
  // Tauri passes the app data dir through; the OS fallbacks cover a plain node run.
  return env.CRAFTY_DATA_DIR ?? env.APPDATA ?? env.XDG_DATA_HOME ?? env.HOME ?? null;
}

/** Join two path pieces without pulling in a path module (this file also runs in the browser build). */
function join(dir: string, file: string): string {
  const sep = dir.includes('\\') && !dir.includes('/') ? '\\' : '/';
  return dir.endsWith(sep) ? `${dir}${file}` : `${dir}${sep}${file}`;
}

/**
 * The database path the sqlite adapter should open. `:memory:` only survives when it was asked
 * for explicitly or when no writable directory can be found.
 */
export function resolveSqlitePath(dbPath?: string): string {
  const explicit = explicitPath(dbPath);
  if (explicit) return explicit;
  const dir = platformDataDir();
  return dir ? join(dir, SYNC_DB_FILE) : ':memory:';
}

/** Whether a resolved path is a real file (as opposed to the in-memory fallback). */
export function isPersistentSqlitePath(path: string): boolean {
  return path !== ':memory:' && path.length > 0;
}
