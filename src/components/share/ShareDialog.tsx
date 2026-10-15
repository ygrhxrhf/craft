'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Check,
  Copy,
  Eye,
  Globe,
  KeyRound,
  LinkIcon,
  Loader2,
  PencilLine,
  X,
} from 'lucide-react';
import {
  getOrCreateShare,
  setSharePasscode,
  setSharePermission,
  setSharePublished,
  setShareSlug,
} from '@/actions/document/share';
import type { DocumentSharePermission } from '@/lib/share/permission';
import { cn } from 'cn';
import { getSyncManager } from '@/lib/sync-core';
import { findDocumentShare, findDocumentShareId } from '@/components/sync/local-records';

interface ShareDialogProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

const TIERS: { value: DocumentSharePermission; label: string; hint: string; icon: typeof Eye }[] = [
  { value: 'view', label: '查看', hint: '拿到链接的人可以查看，不能修改', icon: Eye },
  { value: 'edit', label: '编辑', hint: '登录用户可以协作编辑；匿名访客只读', icon: PencilLine },
];

export function ShareDialog({ documentId, open, onClose }: ShareDialogProps) {
  const [link, setLink] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [permission, setPermission] = useState<DocumentSharePermission | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState(0);
  const [tierError, setTierError] = useState<string | null>(null);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [token, setToken] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  // G1508：挂载读先吃本地镜像——镜像里有这一行就当场渲染档位／发布态／口令态／slug，
  //   断链时也看得见现值；镜像没有（这篇文档还没被分享过、本机也没拉过这张表）才回落到
  //   `getOrCreateShare` 去建行。☆ 回落那一趟是**首次分享**的唯一服务端依赖，不是读侧常态。
  const reloadShareFromMirror = useCallback(async (): Promise<boolean> => {
    const view = await findDocumentShare(documentId);
    if (!view || typeof view.token !== 'string') return false;
    setShareId(view.id);
    setToken(view.token);
    setLink(`${window.location.origin}/s/${view.token}`);
    if (typeof view.isPublished === 'boolean') setIsPublished(view.isPublished);
    if (view.permission === 'view' || view.permission === 'edit') setPermission(view.permission);
    if (typeof view.shareVersion === 'number') setServerVersion(view.shareVersion);
    if (typeof view.hasPasscode === 'boolean') setHasPasscode(view.hasPasscode);
    if (view.slug !== undefined) {
      setSlug(view.slug);
      setSlugDraft(view.slug ?? '');
    }
    return true;
  }, [documentId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      // 每次开面板都先吃镜像（本机读，廉价）：档位／发布态／口令态／slug 当场翻新。
      if (await reloadShareFromMirror()) return;
      if (cancelled || link) return;
      try {
        const share = await getOrCreateShare(documentId);
        if (cancelled) return;
        setShareId(share.id);
        setToken(share.token);
        setLink(`${window.location.origin}/s/${share.token}`);
        setIsPublished(share.isPublished);
        setPermission(share.permission);
        setServerVersion(share.shareVersion);
        setHasPasscode(share.hasPasscode);
        setSlug(share.slug);
        setSlugDraft(share.slug ?? '');
      } catch {
        // 首次分享也失败（断链且镜像没有行）：停在"生成链接中…"，不谎报档位
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, link, documentId, reloadShareFromMirror]);

  // G1509：面板开着时他端改档／本机改档／入站 ack+pull 都会触碰 document_share ⇒ 重读镜像翻新选中态。
  //   只读镜像、不回落 action：这一路是"已建档之后"的翻新，建行那一步归挂载那一趟。
  useEffect(() => {
    if (!open) return;
    return getSyncManager().onStoreChanged((table) => {
      if (table !== 'document_share') return;
      void reloadShareFromMirror();
    });
  }, [open, reloadShareFromMirror]);

  const handleSaveSlug = () => {
    setSlugError(null);
    startTransition(async () => {
      const result = await setShareSlug(documentId, slugDraft);
      if ('error' in result && result.error) {
        setSlugError(result.error);
        return;
      }
      setSlug(result.slug);
      setSlugDraft(result.slug ?? '');
    });
  };

  const handlePublishedChange = (checked: boolean) => {
    setIsPublished(checked);
    startTransition(async () => {
      // 发布开关 → applyLocal（share 行 id 走本地镜像；镜像没有 → 退回服务端 action）
      const shareId = await findDocumentShareId(documentId);
      if (shareId) {
        await getSyncManager().applyLocal({
          table: 'document_share',
          id: shareId,
          patch: { isPublished: checked },
        });
      } else {
        await setSharePublished(documentId, checked);
      }
    });
  };

  const handleTier = (next: DocumentSharePermission) => {
    if (next === permission) return;
    const previous = permission;
    setTierError(null);
    setPermission(next);
    startTransition(async () => {
      try {
        // 档位是元数据 ⇒ 走离线内核（G1491）：本地镜像里有这一行就只改这两列；
        // 镜像还没有（这篇文档刚被分享、或本机还没拉过这张表）就连着面板挂载时读回来的那一行
        // 一起写进去——一枚 op，档位与建档不分成两趟；两条都不成立才退回服务端 action（那条路
        // 此前连广播都没发，本批补上）。
        const local = await findDocumentShare(documentId);
        // ☆ 计数器只增不减：镜像可能比服务端旧，所以取「服务端读回来的那一枚」与「镜像那一枚」
        //   的较大值再 +1。往回拨等于让按旧档授权的那条访客连接躲过过期判定。
        const shareVersion = Math.max(serverVersion, local?.shareVersion ?? 0) + 1;
        if (local) {
          await getSyncManager().applyLocal({
            table: 'document_share',
            id: local.id,
            patch: { permission: next, shareVersion },
          });
          return;
        }
        if (shareId) {
          await getSyncManager().applyLocal({
            table: 'document_share',
            id: shareId,
            patch: { documentId, token, isPublished, permission: next, shareVersion },
          });
          return;
        }
        const result = await setSharePermission(documentId, next);
        setPermission(result.permission);
        setServerVersion(result.shareVersion);
      } catch {
        setPermission(previous);
        setTierError('档位没有保存，请重试');
      }
    });
  };

  // ☆ 两枚 `applyLocal` 的 `patch` 都必须写成**字面量**：G1489 那道静态闸（`tables.test.ts`）判得出
  //   字面量键、判不出变量（G1492 的盲区基线就按调用点数在钉），抽成 helper 传 patch 会把这一处
  //   从"可判"降级成"要人工复核"。
  const handleEnablePasscode = () => {
    if (!passcode.trim()) return;
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      const value = passcode.trim();
      if (shareId) {
        await getSyncManager().applyLocal({ table: 'document_share', id: shareId, patch: { passcode: value } });
      } else {
        await setSharePasscode(documentId, value);
      }
      setHasPasscode(true);
      setPasscode('');
    });
  };

  const handleRemovePasscode = () => {
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      if (shareId) {
        await getSyncManager().applyLocal({ table: 'document_share', id: shareId, patch: { passcode: null } });
      } else {
        await setSharePasscode(documentId, null);
      }
      setHasPasscode(false);
      setPasscode('');
    });
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const handleCopy = async () => {
    if (link) {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-xl! p-0">
        <DialogTitle className="sr-only">分享文档</DialogTitle>
        <DialogDescription className="sr-only">
          生成此文档的分享链接，并选择查看或编辑档
        </DialogDescription>
        <div className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">分享此文档</span>
          </div>
          {!link ? (
            <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              生成链接中…
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md border border-input/30 bg-input/30 px-2">
                  <LinkIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs text-muted-foreground">{link}</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copied ? '已复制' : '复制'}
                </Button>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {TIERS.map((tier) => {
                  const Icon = tier.icon;
                  const selected = tier.value === permission;
                  return (
                    <button
                      key={tier.value}
                      type="button"
                      data-share-permission={tier.value}
                      aria-pressed={selected}
                      disabled={permission === null || isPending}
                      onClick={() => handleTier(tier.value)}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-left transition-colors hover:bg-muted',
                        selected && 'border-primary bg-muted',
                      )}
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{tier.label}</span>
                        <span className="block text-xs text-muted-foreground">{tier.hint}</span>
                      </span>
                    </button>
                  );
                })}
                {tierError && <p className="text-xs text-destructive">{tierError}</p>}
              </div>
              <div className="mt-3 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm">发布为公开页面</p>
                  <p className="text-xs text-muted-foreground">
                    在 /p 链接展示带主题的独立页面
                  </p>
                </div>
                <Switch
                  checked={isPublished}
                  onCheckedChange={handlePublishedChange}
                  aria-label="发布为公开页面"
                />
              </div>
              {isPublished && (
                <div className="mt-3 rounded-md border border-border px-3 py-2.5">
                  <p className="text-sm">公开页面地址</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {link?.replace(/\/s\/.*$/, '')}/p/{slug || token}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={slugDraft}
                      onChange={(event) => setSlugDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') handleSaveSlug();
                      }}
                      placeholder={token.slice(0, 8)}
                      aria-label="自定义地址"
                      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveSlug}
                      disabled={slugDraft === (slug ?? '')}
                    >
                      保存
                    </Button>
                  </div>
                  {slugError && <p className="mt-1.5 text-xs text-destructive">{slugError}</p>}
                </div>
              )}
              <div className="mt-3 rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <KeyRound className="size-4 text-muted-foreground" />
                  <span className="text-sm">口令保护</span>
                </div>
                {hasPasscode ? (
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      已启用，访问者需输入口令才能查看
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRemovePasscode}
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" />
                      清除
                    </Button>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEnablePasscode();
                      }}
                      placeholder="设置访问口令"
                      aria-label="设置访问口令"
                      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEnablePasscode}
                      disabled={!passcode.trim()}
                      className="h-8 shrink-0 text-xs"
                    >
                      启用
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {permission === 'edit'
                  ? '拥有链接的登录用户可以协作编辑，匿名访客只能查看'
                  : '任何拥有链接的人都只能查看该文档'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
