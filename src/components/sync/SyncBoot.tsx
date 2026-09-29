'use client';
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getSyncManager } from '@/lib/sync-core';

export function SyncBoot() {
  // R-12：SPA 登录用 router.push（无 reload），401 后 manager 的 paused 必须在
  // session 由 absent → present 时经 resume() 解除。
  const { status } = useSession();
  // null = 尚未观测到确定态：启动即已登录（loading → authenticated）不触发 resume，
  // 交由 boot()；只有明确见过 unauthenticated 再转 authenticated 才是登录迁移。
  const prevAuthenticated = useRef<boolean | null>(null);

  useEffect(() => {
    void getSyncManager().boot();
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    const authenticated = status === 'authenticated';
    if (prevAuthenticated.current === false && authenticated) {
      void getSyncManager().resume();
    }
    prevAuthenticated.current = authenticated;
  }, [status]);

  return null;
}
