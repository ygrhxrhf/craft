import type { Cursor } from '@/lib/sync/cursor';
export type { Cursor };

export interface SyncRecord {
  table: string; id: string; op: 'upsert' | 'delete';
  data?: Record<string, unknown>; syncTs: string;
}

export interface PendingOp {
  seq: number; table: string; recordId: string;
  op: 'upsert' | 'delete'; payload: { data?: Record<string, unknown>; syncTs: string };
  createdAt: string; tries: number; nextRetryAt: string | null;
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'degraded' | 'error';
