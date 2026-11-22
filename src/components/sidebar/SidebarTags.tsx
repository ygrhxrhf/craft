'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Hash } from 'lucide-react';
import { SidebarSection } from './SidebarSection';
import { getTags } from '@/actions/tag/tag';

/**
 * G1670 —— 官方侧栏最后一段是「标签」，段内列出标签本身。
 * 本地此前只有一枚指向 `/tags` 的导航行。
 */
export function SidebarTags() {
  const [rows, setRows] = useState<{ id: string; name: string; color: string | null }[] | null>(null);

  useEffect(() => {
    let alive = true;
    getTags()
      .then((items) => {
        if (alive) setRows(items.slice(0, 12).map((t) => ({ id: t.id, name: t.name, color: t.color ?? null })));
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SidebarSection title="标签">
      {rows === null ? (
        <p className="px-1.5 py-1 text-[12px] leading-4 text-sidebar-foreground/45">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="px-1.5 py-1 text-[12px] leading-4 text-sidebar-foreground/45">固定关键标签以便快速访问</p>
      ) : (
        rows.map((tag) => (
          <Link
            key={tag.id}
            href={`/tags/${tag.id}`}
            className="flex h-8 items-center gap-2.5 rounded-md px-1.5 text-[length:13px] leading-4 text-sidebar-foreground/85 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            <Hash className="size-5 shrink-0" style={tag.color ? { color: tag.color } : undefined} />
            <span className="truncate">{tag.name}</span>
          </Link>
        ))
      )}
    </SidebarSection>
  );
}
