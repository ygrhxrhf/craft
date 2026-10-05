/**
 * Coalesces reads that a single mount generation can issue more than once.
 *
 * A dev-mode mount runs each client effect twice (React StrictMode), so a read fired
 * straight from an effect costs two round trips in the dev counter and one in
 * production. Keying the in-flight promise by the revision the effect depends on keeps
 * those two readings agreeing without suppressing a read that a real change asked for.
 */
export interface ReadPerRevision<T> {
  read: (revision: number, load: () => Promise<T>) => Promise<T>;
}

export function createReadPerRevision<T>(): ReadPerRevision<T> {
  let entry: { revision: number; promise: Promise<T> } | null = null;

  return {
    read(revision, load) {
      if (entry !== null && entry.revision === revision) return entry.promise;

      const promise = load();
      entry = { revision, promise };
      // A failed read must not be replayed from the cache for the rest of the revision.
      promise.catch(() => {
        if (entry !== null && entry.promise === promise) entry = null;
      });
      return promise;
    },
  };
}
