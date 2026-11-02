'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getSyncManager } from '@/lib/sync-core';
import { rejectionCopy } from '@/lib/sync/rejection-copy';
import { toast } from '@/components/ui/toast';

/**
 * boot/resume 触发决策（纯函数，测试缝隙）：
 * - session 未定（loading）或未认证 → 'none'：**绝不在认证前 boot**——未登录时
 *   middleware 把 /api/v1/events 307 到 /login（HTML），EventSource 收到非
 *   text/event-stream 是致命错误（中止且不重连），该实例只能靠 30s 轮询兜底
 *   直到整页刷新（task-14 F1 实测）。
 * - 首次观测即 authenticated（含 loading→authenticated、SPA 登录且 boot 从未
 *   执行）→ 'boot'（boot 幂等，重复调用安全）。
 * - 明确见过 unauthenticated 再转 authenticated 且 boot 已执行过 → 'resume'：
 *   R-12——401 暂停（paused）须在 session absent→present 时解除。
 */
export function syncBootAction(
  status: 'loading' | 'authenticated' | 'unauthenticated',
  prevAuthenticated: boolean | null,
  booted: boolean
): 'none' | 'boot' | 'resume' {
  if (status !== 'authenticated') return 'none';
  if (prevAuthenticated === false && booted) return 'resume';
  return 'boot';
}

export function SyncBoot() {
  // R-12：SPA 登录用 router.push（无 reload），401 后 manager 的 paused 必须在
  // session 由 absent → present 时经 resume() 解除。
  const { status } = useSession();
  // null = 尚未观测到确定态（启动即已登录 loading → authenticated 走 boot 分支）
  const prevAuthenticated = useRef<boolean | null>(null);
  // boot() 是否已真正执行过：决定再次登录走 resume 还是 boot
  const booted = useRef(false);

  // G1506/G1512：服务端拒收本机那一笔 ⇒ 屏上必须说一句。G1511 把"同设备第二笔被判旧"的
  // 假阳性修掉之后，`stale` 已是真实的写入失败，与 `not_found` 走同一条 toast 通路。
  useEffect(() => getSyncManager().onRejected((rejected) => {
    const copy = rejectionCopy(rejected);
    if (copy) toast.add({ title: copy.title, description: copy.description, type: 'error' });
  }), []);

  useEffect(() => {
    const action = syncBootAction(status, prevAuthenticated.current, booted.current);
    if (action === 'boot') {
      booted.current = true;
      void getSyncManager().boot();
    } else if (action === 'resume') {
      void getSyncManager().resume();
    }
    if (status !== 'loading') prevAuthenticated.current = status === 'authenticated';
  }, [status]);

  return null;
}
