'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Cable, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { createConnection, deleteConnection, type ConnectionItem, type ConnectionKind } from '@/actions/connection/connection';
import { CONNECTION_PERMISSIONS, CONNECTION_PROTECTIONS, CONNECTION_SCOPES } from '@/lib/connections/connection-spec';

const COPY = {
  mcp: {
    title: '你的 MCP 连接',
    description: '让 AI 工具访问你的文档',
  },
  api: {
    title: '你的 API 连接',
    description: '用于构建工作流程和快捷方式',
  },
} as const;

const KINDS: ConnectionKind[] = ['mcp', 'api'];

/**
 * G1658：官方连接屏是「两段 + 每段若干连接卡 + 左上 ＋」，添加走弹层；
 * 本地此前是常开表单。改后结构对齐，空段给一张虚线添加卡。
 * 官方那张天空云朵底图是专有资产，按既定口径不搬（G1658 判定里已写明）。
 */
export function ConnectionsPanel({ initial }: { initial: ConnectionItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [dialogKind, setDialogKind] = useState<ConnectionKind | null>(null);
  const [kind, setKind] = useState<ConnectionKind>('mcp');
  const [name, setName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [token, setToken] = useState('');
  // G122: the three access-centre axes.
  const [permission, setPermission] = useState<string>('read-write');
  const [protection, setProtection] = useState<string>('public');
  const [scope, setScope] = useState<string>('all-documents');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openDialog = (nextKind: ConnectionKind) => {
    setKind(nextKind);
    setError(null);
    setDialogKind(nextKind);
  };

  const submit = () => {
    if (!name.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const created = await createConnection({ kind, name, endpoint, token, permission, protection, scope });
        setItems((current) => [created, ...current]);
        setName('');
        setEndpoint('');
        setToken('');
        setDialogKind(null);
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 pb-16 pt-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">MCP 与 API 接入中心</p>
        <button
          type="button"
          aria-label="添加连接"
          onClick={() => openDialog('mcp')}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {KINDS.map((sectionKind) => {
        const sectionItems = items.filter((item) => item.kind === sectionKind);
        return (
          <section key={sectionKind} className="flex flex-col gap-4">
            <div>
              <h2 className="text-[15px] font-semibold">{COPY[sectionKind].title}</h2>
              <p className="mt-0.5 text-[13px] text-muted-foreground">{COPY[sectionKind].description}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {sectionItems.map((item) => (
                <div
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-sky-50 to-background p-4 shadow-sm"
                >
                  <div className="flex items-start gap-2">
                    <Cable className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">所有文档</p>
                    </div>
                    <button
                      type="button"
                      aria-label={`删除连接 ${item.name}`}
                      onClick={() => remove(item.id)}
                      disabled={pending}
                      className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 disabled:opacity-40"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                  {/* 文档堆叠的轻量示意（官方那张位图是专有素材，这里用 CSS 形状近似）。 */}
                  <div className="mt-4 flex items-end gap-1" aria-hidden="true">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <span
                        key={index}
                        className="block w-6 rounded-[3px] bg-background shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-border"
                        style={{ height: `${28 + index * 6}px` }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openDialog(sectionKind)}
                className="flex min-h-[128px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
              >
                <Plus className="size-5" />
                添加{sectionKind === 'mcp' ? ' MCP ' : ' API '}连接
              </button>
            </div>
          </section>
        );
      })}

      <Dialog open={dialogKind !== null} onOpenChange={(open) => !open && setDialogKind(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{COPY[kind].title}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
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
            {/* G122: the three access-centre axes, each with its official choices. */}
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              权限
              <select
                value={permission}
                onChange={(event) => setPermission(event.target.value)}
                aria-label="权限"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {CONNECTION_PERMISSIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              保护
              <select
                value={protection}
                onChange={(event) => setProtection(event.target.value)}
                aria-label="保护"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {CONNECTION_PROTECTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-2">
              作用域
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value)}
                aria-label="作用域"
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
              >
                {CONNECTION_SCOPES.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p role="status" className="text-xs text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogKind(null)}>
              取消
            </Button>
            <Button size="sm" onClick={submit} disabled={pending || !name.trim()}>
              <Plus className="size-3.5" />
              添加连接
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
