'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cable, Loader2 } from 'lucide-react';
import { cn } from 'cn';
import { listConnections, type ConnectionItem } from '@/actions/connection/connection';

/**
 * G1673 —— 设置里的「集成」一格。
 *
 * 官方这一格列的是真实接入（MCP / API 连接）。本地此前写死一句「暂无已连接的集成」，而
 * `Connection` 表与 `/connections` 页都是真实现 ⇒ 这里改成读同一张表：有就逐条列出名称与类型，
 * 没有才是那句空态，另附一枚进接入中心的入口。
 */
/** 与 SettingsPanels 里那张卡同一形态（该文件没把它导出，这里照抄一份最小实现）。 */
function RowCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-xl bg-foreground/4', className)}>{children}</div>;
}

export function IntegrationsPanel() {
  const [rows, setRows] = useState<ConnectionItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    listConnections()
      .then((items) => {
        if (alive) setRows(items);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (rows === null) {
    return (
      <p className="flex items-center gap-2 py-3 text-[13px] text-foreground/55">
        <Loader2 className="size-4 animate-spin" /> 正在读取连接…
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <RowCard className="px-4 py-3 text-[13px] text-foreground/55">暂无已连接的集成。</RowCard>
      ) : (
        rows.map((row) => (
          <RowCard key={row.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <Cable className="size-4 shrink-0 text-foreground/45" />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{row.name}</div>
                <div className="mt-0.5 truncate text-[12px] text-foreground/55">
                  {row.kind === 'mcp' ? 'MCP' : 'API'} · {row.scope} · {row.permission}
                </div>
              </div>
            </div>
            <span className="shrink-0 text-[12px] text-foreground/45">
              {row.hasToken ? '已授权' : '未授权'}
            </span>
          </RowCard>
        ))
      )}
      <Link
        href="/connections"
        className="inline-block text-[13px] font-medium text-(--craft-accent) hover:underline"
      >
        打开接入中心
      </Link>
    </div>
  );
}
