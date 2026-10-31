'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Cable, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createConnection, deleteConnection, type ConnectionItem, type ConnectionKind } from '@/actions/connection/connection';

const COPY = {
  mcp: {
    title: '你的 MCP 连接',
    description: '让 AI 工具访问你的文档',
  },
  api: {
    title: '你的 API 连接',
    description: '添加你的第一个 API 连接',
  },
} as const;

export function ConnectionsPanel({ initial }: { initial: ConnectionItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [kind, setKind] = useState<ConnectionKind>('mcp');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!name.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createConnection({ kind, name, endpoint, token });
        setItems((current) => [created, ...current]);
        setName('');
        setEndpoint('');
        setToken('');
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '连接没有保存，请重试');
      }
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteConnection(id);
        setItems((current) => current.filter((item) => item.id !== id));
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '连接没有删除，请重试');
      }
    });
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">连接</h1>
        <p className="mt-1 text-sm text-muted-foreground">MCP 与 API 接入中心</p>
      </div>

      <section className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-2">
          <Cable className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">{COPY[kind].title}</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{COPY[kind].description}</p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            类型
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ConnectionKind)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="mcp">MCP</option>
              <option value="api">API</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            名称
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：我的 MCP 服务" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            地址
            <Input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} placeholder="https://…" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
            令牌（可选）
            <Input type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="••••" />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
            <Plus className="size-3.5" />
            添加连接
          </Button>
          {error && <span role="status" className="text-xs text-destructive">{error}</span>}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            暂无连接
          </p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] uppercase text-muted-foreground">
                {item.kind}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.name}</p>
                <p className="truncate text-xs text-muted-foreground">{item.endpoint || '未填写地址'}</p>
              </div>
              <button
                type="button"
                aria-label={`删除连接 ${item.name}`}
                onClick={() => remove(item.id)}
                disabled={pending}
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
