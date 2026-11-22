'use client';
import { useEffect, useState } from 'react';
import { getSyncManager, type SyncStatus } from '@/lib/sync-core';
import { badgeVariants } from '@/components/ui/badge';
import { toast } from '@/components/ui/toast';
import { cn } from 'cn';

export function statusToView(status: SyncStatus, pending: number):
  { render: false } | { render: true; text: string; tone: 'warn' | 'error' | 'busy' } {
  switch (status) {
    case 'synced': return { render: false };
    case 'syncing': return { render: true, text: '同步中', tone: 'busy' };
    case 'offline': return { render: true, text: `离线 · ${pending} 条待传`, tone: 'warn' };
    case 'degraded': return { render: true, text: '实时连接断开', tone: 'warn' };
    case 'error': return { render: true, text: '同步失败', tone: 'error' };
  }
}

// tone → badge.tsx 既有变体（不新造配色；视觉零改动，指示器是唯一新增元素）
const TONE_VARIANT = {
  busy: 'outline',
  warn: 'secondary',
  error: 'destructive',
} as const;

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<SyncStatus>('synced');
  const [pending, setPending] = useState(0);
  const [toastShown, setToastShown] = useState(false);
  useEffect(() => getSyncManager().subscribe((s, p) => {
    setStatus(s); setPending(p);
    if (s === 'error' && !toastShown) {           // error toast 仅一次
      setToastShown(true);
      // 这一档只说明「这一轮推送没成功」，真实原因可能是网络、也可能是服务端拒绝。
      // 旧的「将在网络恢复后重试」把归因写死成网络：外键/鉴权失败时用户按那句话排查，只会白等。
      // 能确定的是改动还在本地队列里（applyLocal 先落库再入队），所以说这一句；原因留给下一层。
      toast.add({
        id: 'sync-error',
        type: 'error',
        title: '同步失败，改动已存在本机',
        description: '网络或服务器暂时不可用，恢复后会自动重试。',
      });
    }
    if (s === 'synced') setToastShown(false);
  }), [toastShown]);

  const view = statusToView(status, pending);
  if (!view.render) return null;
  return (
    <div
      data-testid="sync-indicator"
      data-tone={view.tone}
      className={cn(
        badgeVariants({ variant: TONE_VARIANT[view.tone] }),
        'fixed bottom-4 right-4 z-50 shadow-sm'
      )}
    >
      {view.text}
    </div>
  );
}
