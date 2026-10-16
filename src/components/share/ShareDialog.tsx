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
  Lock,
  PencilLine,
  X,
} from 'lucide-react';
import {
  getOrCreateShare,
  setSharePasscode,
  setSharePermission,
  setSharePublished,
  setShareShowAuthor,
  setShareSlug,
  setShareVisualOption,
  setShareExpiry,
} from '@/actions/document/share';
import type { DocumentSharePermission } from '@/lib/share/permission';
import { ONLY_COLLABORATORS_LABEL } from '@/lib/share/permission';
import { SHOW_AUTHOR_LABEL, authorStatusLabel, showsAuthor } from '@/lib/share/author-visibility';
import { VISUAL_OPTIONS, visualOptionStatus } from '@/lib/share/visual-options';
import { SEO_DESC, expiryLabel } from '@/lib/share/publishing-options';
import {
  linkOperationDone,
  linkOperationPending,
  type LinkOperation,
} from '@/lib/share/link-operation-copy';
import { toast } from '@/components/ui/toast';
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
  // G04：官方第三档（`collab.access.only.collaborators`）——链接本身不给任何角色，只有已被
  //   授权为协作者的人能打开。
  { value: 'collaborators', label: ONLY_COLLABORATORS_LABEL, hint: '链接不再放行，仅协作者可打开', icon: Lock },
];

export function ShareDialog({ documentId, open, onClose }: ShareDialogProps) {
  const [link, setLink] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showAuthor, setShowAuthor] = useState(true);
  // G1534：visual.options 其余四组（键与 document_share 列同名）。
  const [visuals, setVisuals] = useState<Record<string, boolean>>({
    showPageTitle: true,
    hideTableOfContents: false,
    hidePresentationMode: false,
    showWatermark: true,
    enableSeo: false,
  });
  const [permission, setPermission] = useState<DocumentSharePermission | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [serverVersion, setServerVersion] = useState(0);
  const [tierError, setTierError] = useState<string | null>(null);
  const [hasPasscode, setHasPasscode] = useState(false);
  // G1535：链接到期（ISO 日期串；''＝永不过期）。
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [passcode, setPasscode] = useState('');
  const [token, setToken] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  // G139：每个链接写操作有自己的进行时句，写完后换成该操作的结果句（不是通用 spinner）。
  const [linkOp, setLinkOp] = useState<LinkOperation | null>(null);

  /**
   * Run a link write with its own named progress line, then announce its result on success.
   *
   * `setLinkOp` is deliberately *outside* the transition: both calls inside one transition coalesce
   * into a single commit, so the in-flight line would never reach the DOM. The urgent update lands
   * first, the transition carries the write.
   */
  const runLinkOp = (op: LinkOperation, work: () => Promise<void>) => {
    setLinkOp(op);
    startTransition(async () => {
      try {
        await work();
        const done = linkOperationDone(op);
        if (done) toast.add({ id: `link-op-${op}`, type: 'success', title: done });
      } finally {
        setLinkOp(null);
      }
    });
  };

  // G1508：挂载读先吃本地镜像——镜像里有这一行就当场渲染档位／发布态／口令态／slug，
  //   断链时也看得见现值；镜像没有（这篇文档还没被分享过、本机也没拉过这张表）才回落到
  //   `getOrCreateShare` 去建行。☆ 回落那一趟是**首次分享**的唯一服务端依赖，不是读侧常态。
  // G1522：`slugDraft` 是**受控输入**，只在"种子那一趟"（挂载）才跟着镜像播种——翻新读
  //   （订阅触发的重读）只动 `slug`，否则用户敲了一半的自定义地址会被一次他端推送盖掉。
  const reloadShareFromMirror = useCallback(
    async (opts?: { seedSlugDraft?: boolean }): Promise<boolean> => {
      const view = await findDocumentShare(documentId);
      if (!view || typeof view.token !== 'string') return false;
      setShareId(view.id);
      setToken(view.token);
      setLink(`${window.location.origin}/s/${view.token}`);
      if (typeof view.isPublished === 'boolean') setIsPublished(view.isPublished);
      if (typeof view.showAuthor === 'boolean') setShowAuthor(view.showAuthor);
      setVisuals((prev) => {
        const next = { ...prev };
        for (const key of ['showPageTitle', 'hideTableOfContents', 'hidePresentationMode', 'showWatermark', 'enableSeo'] as const) {
          const value = view[key];
          if (typeof value === 'boolean') next[key] = value;
        }
        return next;
      });
      if (view.permission === 'view' || view.permission === 'edit') setPermission(view.permission);
      if (typeof view.shareVersion === 'number') setServerVersion(view.shareVersion);
      if (typeof view.hasPasscode === 'boolean') setHasPasscode(view.hasPasscode);
      // ☆ 镜像里的到期是完整 ISO 时间戳，而 `type="date"` 只认 `YYYY-MM-DD` ⇒ 截前 10 位，
      //   否则输入框会渲染成空、标签退回「永不过期」（本批第一次就踩到）。
      if (view.expiresAt !== undefined) setExpiresAt(view.expiresAt ? String(view.expiresAt).slice(0, 10) : '');
      if (view.slug !== undefined) {
        setSlug(view.slug);
        if (opts?.seedSlugDraft) setSlugDraft(view.slug ?? '');
      }
      return true;
    },
    [documentId],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      // 每次开面板都先吃镜像（本机读，廉价）：档位／发布态／口令态／slug 当场翻新。
      if (await reloadShareFromMirror({ seedSlugDraft: true })) return;
      if (cancelled || link) return;
      try {
        const share = await getOrCreateShare(documentId);
        if (cancelled) return;
        setShareId(share.id);
        setToken(share.token);
        setLink(`${window.location.origin}/s/${share.token}`);
        setIsPublished(share.isPublished);
        setShowAuthor(share.showAuthor);
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
    runLinkOp('updatingLink', async () => {
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

  // G38：显示作者 → applyLocal（share 行 id 走本地镜像；镜像没有 → 退回服务端 action）。
  //   与发布开关同形：这一列是元数据，断链也要留得住。
  const handleShowAuthorChange = (checked: boolean) => {
    setShowAuthor(checked);
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      if (shareId) {
        await getSyncManager().applyLocal({
          table: 'document_share',
          id: shareId,
          patch: { showAuthor: checked },
        });
      } else {
        await setShareShowAuthor(documentId, checked);
      }
    });
  };

  // G1535：链接到期独立一轴 → applyLocal（镜像缺行退回服务端 action）。
  const handleExpiryChange = (value: string) => {
    setExpiresAt(value);
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      const next = value ? value : null;
      if (shareId) {
        await getSyncManager().applyLocal({ table: 'document_share', id: shareId, patch: { expiresAt: next } });
      } else {
        await setShareExpiry(documentId, next);
      }
    });
  };

  const handleVisualOption = (
    key: 'showPageTitle' | 'hideTableOfContents' | 'hidePresentationMode' | 'showWatermark' | 'enableSeo',
    checked: boolean,
  ) => {
    setVisuals((prev) => ({ ...prev, [key]: checked }));
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      if (shareId) {
        await getSyncManager().applyLocal({ table: 'document_share', id: shareId, patch: { [key]: checked } });
      } else {
        await setShareVisualOption(documentId, key, checked);
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
    runLinkOp('updatingPassword', async () => {
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
    runLinkOp('removingLink', async () => {
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
              {/* G139：写操作进行时按操作命名（正在更新链接／正在更新密码／正在移除链接）。 */}
              {linkOp && (
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <Loader2 className="size-3.5 animate-spin" />
                  {linkOperationPending(linkOp)}
                </p>
              )}
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
              {/* G38：官方 visual.options 里的「显示作者」一组——开关名＋成对状态句逐字。 */}
              <div className="mt-3 flex items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm">{SHOW_AUTHOR_LABEL}</p>
                  <p className="text-xs text-muted-foreground">{authorStatusLabel(showAuthor)}</p>
                </div>
                <Switch
                  checked={showAuthor}
                  onCheckedChange={handleShowAuthorChange}
                  aria-label={SHOW_AUTHOR_LABEL}
                />
              </div>
              {/* G1534：visual.options 其余四组（标题／目录／演示模式／页脚），逐组开关名＋成对状态句。 */}
              {VISUAL_OPTIONS.map((option) => {
                const key = option.labelKey === 'toolbar.show.title'
                  ? 'showPageTitle'
                  : option.labelKey === 'toolbar.show.toc.title'
                    ? 'hideTableOfContents'
                    : option.labelKey === 'toolbar.show.presentation.mode'
                      ? 'hidePresentationMode'
                      : 'showWatermark';
                const on = key === 'hideTableOfContents' || key === 'hidePresentationMode'
                  ? !visuals[key]
                  : visuals[key];
                return (
                  <div
                    key={key}
                    className="mt-3 flex items-center justify-between rounded-md border border-border px-3 py-2.5"
                  >
                    <div>
                      <p className="text-sm">{option.label}</p>
                      <p className="text-xs text-muted-foreground">{visualOptionStatus(option, on)}</p>
                    </div>
                    <Switch
                      checked={on}
                      onCheckedChange={(next) => handleVisualOption(key, next)}
                      aria-label={option.label}
                    />
                  </div>
                );
              })}
              {/* G143：搜索引擎索引（官方 enableSeo 默认关；与口令互斥——口令一设即失效）。 */}
              <div className="mt-3 flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                <div>
                  <p className="text-sm">启用搜索引擎索引</p>
                  <p className="text-xs text-muted-foreground">{SEO_DESC}</p>
                </div>
                <Switch
                  checked={visuals.enableSeo}
                  onCheckedChange={(next) => handleVisualOption('enableSeo', next)}
                  aria-label="启用搜索引擎索引"
                />
              </div>
              {/* G1535：链接到期是独立一轴（官方 expiration.date／expire.on [0]／expire.never）。 */}
              <div className="mt-3 rounded-md border border-border px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm">链接到期</p>
                  <span className="text-xs text-muted-foreground">{expiryLabel(expiresAt || null)}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(event) => handleExpiryChange(event.target.value)}
                    aria-label="链接到期日期"
                    className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                  />
                  {expiresAt && (
                    <Button size="sm" variant="ghost" onClick={() => handleExpiryChange('')} className="h-8 shrink-0 px-2 text-xs">
                      永不过期
                    </Button>
                  )}
                </div>
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
                  <div className="mt-2">
                    <div className="flex items-center justify-between">
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
                    {/* G1535：官方把「更改密码」与「添加密码」分成两档（toolbar.change.password）。 */}
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={passcode}
                        onChange={(e) => setPasscode(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEnablePasscode();
                        }}
                        placeholder="输入新口令"
                        aria-label="更改访问口令"
                        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnablePasscode}
                        disabled={!passcode.trim()}
                        className="h-8 shrink-0 text-xs"
                      >
                        更改密码
                      </Button>
                    </div>
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
