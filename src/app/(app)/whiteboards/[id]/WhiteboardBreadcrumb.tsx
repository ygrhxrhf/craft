'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getSyncManager } from '@/lib/sync-core';

interface WhiteboardBreadcrumbProps {
  id: string;
  name: string;
  icon: string | null;
}

export function WhiteboardBreadcrumb({ id, name, icon }: WhiteboardBreadcrumbProps) {
  const [value, setValue] = useState(name);

  const handleRename = async () => {
    if (value !== name && value.trim()) {
      // 白板改名 → applyLocal（R-16：白板元数据走 applyLocal 推送）
      const manager = getSyncManager();
      await manager.applyLocal({
        table: 'whiteboard',
        id,
        patch: { name: value.trim() },
      });
      // /whiteboards 列表读的是服务端权威行（getWhiteboards），applyLocal 只入队等 2s 去抖
      // ⇒ 改名后立刻整页跳转就读不到新名字。与 TasksView / AddPropertyMenu 同一规则。
      await manager.flushNow();
    }
  };

  return (
    <nav className="flex min-w-0 items-center gap-2 text-sm">
      <Link href="/whiteboards" className="shrink-0 text-muted-foreground hover:text-foreground">
        白板
      </Link>
      <span className="shrink-0 text-muted-foreground">/</span>
      <span className="text-base leading-none">{icon ?? '🎨'}</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleRename}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 truncate bg-transparent font-medium outline-none"
        aria-label="白板名称"
      />
    </nav>
  );
}
