/**
 * Version history grouping (G18). A version falls into 今天, 昨天, or 较早 by its calendar day, and
 * its change count is how many words it moved relative to the version before it — the only measure
 * the stored row carries. The first version counts all of its words.
 */
export type VersionBucket = 'today' | 'yesterday' | 'earlier';

export const VERSION_BUCKETS: readonly VersionBucket[] = ['today', 'yesterday', 'earlier'];

export const VERSION_BUCKET_LABELS: Record<VersionBucket, string> = {
  today: '今天',
  yesterday: '昨天',
  earlier: '较早',
};

function dayIndex(value: Date): number {
  return value.getFullYear() * 10000 + (value.getMonth() + 1) * 100 + value.getDate();
}

export function versionBucket(createdAt: string, now: Date = new Date()): VersionBucket {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 'earlier';
  const distance = dayIndex(now) - dayIndex(created);
  if (distance <= 0) return 'today';
  if (distance === 1) return 'yesterday';
  return 'earlier';
}

/** Words moved since the previous version, which is the change count the row can show. */
export function versionChangeCount(wordCount: number, previousWordCount: number | null): number {
  if (previousWordCount === null) return wordCount;
  return Math.abs(wordCount - previousWordCount);
}

export function changeCountLabel(count: number): string {
  return `${count} 项变更`;
}
