import type { Cursor } from '@/lib/sync/cursor';
export type { Cursor };

export interface SyncRecord {
  table: string; id: string; op: 'upsert' | 'delete';
  data?: Record<string, unknown>; syncTs: string;
}

/**
 * G1506：服务端不肯落这一笔的原因。`stale` = 本机这版比服务端旧（权威值回灌）；
 * `not_found` = 服务端没有这行、而这笔又不是合法的离线新建（G1505 的铸造闸，或同一枚 id
 * 在他人名下 ⇒ 越权推送）；`invalid`（G1629）= 这一笔的值绑不进列类型（Postgres 的参数化
 * 会直接报错 ⇒ 整批 25P02），它永远不可能成功，只能单独丢掉。
 * UI 逐枚各说一句：把三件事混成一句「保存失败」就把越权提示、竞态提示和坏数据一起弄丢了。
 */
export type RejectReason = 'stale' | 'not_found' | 'invalid';

export interface SyncRejection extends SyncRecord {
  reason?: RejectReason;
}

export interface PendingOp {
  seq: number; table: string; recordId: string;
  op: 'upsert' | 'delete'; payload: { data?: Record<string, unknown>; syncTs: string };
  createdAt: string; tries: number; nextRetryAt: string | null;
}

export type SyncStatus = 'offline' | 'syncing' | 'synced' | 'degraded' | 'error';
