'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { File, Folder } from 'lucide-react';
import { SidebarSection } from './SidebarSection';
import { getFavoriteDocuments } from '@/actions/document/get';

/**
 * G1670 —— 官方侧栏第一段是「收藏」，段内直接列出被收藏的文档（不是一枚跳转链接）。
 * 本地此前把收藏做成了左侧一级导航里的一枚图标行，段里什么都没有。
 */
export function FavoriteList() {
  const [rows, setRows] = useState<{ id: string; title: string; icon: string | null }[] | null>(null);

  useEffect(() => {
    let alive = true;
    getFavoriteDocuments()
      .then((items) => {
        if (alive) setRows(items.slice(0, 8).map((d) => ({ id: d.id, title: d.title, icon: d.icon })));
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <SidebarSection title="收藏">
      {rows === null ? (
        <p className="px-1.5 py-1 text-[12px] leading-4 text-sidebar-foreground/45">加载中…</p>
      ) : rows.length === 0 ? (
        <p className="px-1.5 py-1 text-[12px] leading-4 text-sidebar-foreground/45">收藏文档以便快速访问</p>
      ) : (
        rows.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="flex h-8 items-center gap-2.5 rounded-md px-1.5 text-[length:13px] leading-4 text-sidebar-foreground/85 transition-colors hover:bg-sidebar-hover hover:text-sidebar-foreground"
          >
            {doc.icon ? (
              <span className="w-5 shrink-0 text-center text-[15px] leading-none">{doc.icon}</span>
            ) : doc.title ? (
              <File className="size-5 shrink-0 text-foreground/45" />
            ) : (
              <Folder className="size-5 shrink-0 text-foreground/45" />
            )}
            <span className="truncate">{doc.title || '无标题文档'}</span>
          </Link>
        ))
      )}
    </SidebarSection>
  );
}
