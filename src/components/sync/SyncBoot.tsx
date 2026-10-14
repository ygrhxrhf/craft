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

  // G1506：服务端拒收本机那一笔 ⇒ 屏上得说一句（此前只盖权威值、一句不说，
  // 「点了恢复，什么都没发生」）。两枚 reason 分开放：
  //   not_found＝这行不存在／不归你，动作凭空蒸发 ⇒ 可见失败；
  //   stale＝LWW 竞态 ⇒ 只留 console。服务端每落一笔都重打 serverNow，本机去抖窗口里
  //   的下一笔天生"比服务端旧"，给竞态弹「保存失败」会把正常写入说成失败（敞口另记）。
  useEffect(() => getSyncManager().onRejected((rejected) => {
    if (!rejected.some(r => r.reason === 'not_found')) {
      console.warn('[sync] 本机改动比服务端旧，已按权威值显示',
        rejected.map(r => `${r.table}:${r.id}`));
      return;
    }
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
