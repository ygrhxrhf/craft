'use client';

import { useSyncExternalStore } from 'react';
import { cn } from 'cn';

import { ViewModeSwitcher } from './ViewModeSwitcher';
import {
  readViewMode,
  serverViewMode,
  storeViewMode,
  subscribeViewMode,
} from '@/lib/browse/view-modes';

/**
 * G1655/G1659：浏览屏右上角的三档布局切换。单独做成客户端小块，就能挂在服务端页面里
 * （收藏空态也要有这排按钮），并让所有浏览屏共用 `craft.browse.viewMode` 这一处偏好。
 */
export function BrowseViewModeBar({ className }: { className?: string }) {
  const viewMode = useSyncExternalStore(subscribeViewMode, readViewMode, serverViewMode);
  return (
    <div className={cn('mb-3 flex items-center justify-end', className)}>
      <ViewModeSwitcher value={viewMode} onChange={storeViewMode} />
    </div>
  );
}
