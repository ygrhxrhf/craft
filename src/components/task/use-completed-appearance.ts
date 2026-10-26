'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { getSyncManager } from '@/lib/sync-core';
import { readLocalRecords } from '@/components/sync/local-records';
import { appearanceFromUserRows, type CompletedTaskAppearance } from '@/lib/task/completed-appearance';

/**
 * `gap.md` G160 —— 已完成任务外观的**本机偏好读取口**。
 *
 * ☆ 走本机 user 镜像（与别的元数据读同源），不把偏好从各路由文件逐层传参；
 *   `applyLocal` 落 user 行 → 内核 `onStoreChanged('user')` ⇒ 设置页改完立刻生效。
 * 任务页、日历月视图、日历时间线三处都用这一枚，避免各写一份读逻辑漂移。
 */
export function useCompletedTaskAppearance(): CompletedTaskAppearance {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [appearance, setAppearance] = useState<CompletedTaskAppearance>('strike');

  useEffect(() => {
    let alive = true;
    const read = () =>
      readLocalRecords('user').then((rows) => {
        if (alive) setAppearance(appearanceFromUserRows(rows, userId));
      });
    void read();
    const unsubscribe = getSyncManager().onStoreChanged((table) => {
      if (table !== 'user') return;
      void read();
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, [userId]);

  return appearance;
}
