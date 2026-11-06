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
  Info,
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
  setShareAccessLists,
  setShareCommentLevel,
  setShareExpiry,
} from '@/actions/document/share';
import {
  listAccessRequests,
  decideAccessRequest,
  type AccessRequestItem,
} from '@/actions/document/access-requests';
import { countSubpages } from '@/actions/document/get';
import type { DocumentSharePermission } from '@/lib/share/permission';
import { ONLY_COLLABORATORS_LABEL, normalizeSharePermission } from '@/lib/share/permission';
import { ACCESS_LEVEL_COPY } from '@/lib/share/access-levels';
import {
  ADD_EMAIL_ACCESS_FAIL,
  ADD_EMAIL_DOMAIN_ACCESS_FAIL,
  ADD_EMAIL_DOMAIN,
  ADD_EMAILS_PLACEHOLDER,
  allEmailAddresses,
  parseDomains,
  parseEmails,
} from '@/lib/share/email-allowlist';
import { SHOW_AUTHOR_LABEL, authorStatusLabel, showsAuthor } from '@/lib/share/author-visibility';
import { VISUAL_OPTIONS, visualOptionStatus } from '@/lib/share/visual-options';
import {
  COMMENT_LEVEL_COPY,
  normalizeCommentLevel,
  type CommentLevel,
} from '@/lib/share/comment-level';
import {
  BLOCK_LINKS_SWITCH,
  DUPLICATE_SWITCH,
  USER_INTERACTIVITY_TITLE,
  visitorSwitchStatus,
} from '@/lib/share/visitor-interaction';
import { SEO_DESC, expiryLabel } from '@/lib/share/publishing-options';
import {
  SHARE_SCOPE_WARNING,
  hasSubpages,
  shareScopeConfirmation,
} from '@/lib/share/document-scope';
import {
  linkOperationDone,
  linkOperationPending,
  type LinkOperation,
} from '@/lib/share/link-operation-copy';
import { toast } from '@/components/ui/toast';
import { COPY_LINK_FAILED } from '@/lib/errors/alert-copy';
import { EDIT_REQUEST_LABEL, VIEW_REQUEST_LABEL, ACCESS_REQUESTS_HEADING } from '@/lib/share/request-access-copy';
import { confirmDialog } from '@/lib/dialog/show';
import { PASSWORD_XOR_EMAIL, PREVIOUS_LINK_INACTIVE, SHARE_ERROR } from '@/lib/share/share-guards';
import { cn } from 'cn';
import { getSyncManager } from '@/lib/sync-core';
import { findDocumentShare, findDocumentShareId } from '@/components/sync/local-records';

interface ShareDialogProps {
  documentId: string;
  open: boolean;
  onClose: () => void;
}

const TIERS: { value: DocumentSharePermission; label: string; hint: string; icon: typeof Eye }[] = [
  // G131：官方五档（从最闭到最开），逐字取自 `collab.access.*`。「可评论」是独立一档，
  // 不是从"可编辑"里减出来的开关——`viewAndComment` 可评不可编、`linkView` 只看不可评。
  { value: 'collaborators', label: ONLY_COLLABORATORS_LABEL, hint: '链接不再放行，仅协作者可打开', icon: Lock },
  { value: 'viewAndComment', label: ACCESS_LEVEL_COPY.viewAndComment.label, hint: '登录的协作者可查看和评论，不能修改', icon: Eye },
  { value: 'editAndComment', label: ACCESS_LEVEL_COPY.editAndComment.label, hint: '登录的协作者可协作编辑和评论', icon: PencilLine },
  { value: 'linkView', label: ACCESS_LEVEL_COPY.linkView.label, hint: '拿到链接的人都可以查看', icon: Eye },
  { value: 'linkEdit', label: ACCESS_LEVEL_COPY.linkEdit.label, hint: '登录用户可以协作编辑；匿名访客只读', icon: PencilLine },
];

export function ShareDialog({ documentId, open, onClose }: ShareDialogProps) {
  const [link, setLink] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState(false);
  const [showAuthor, setShowAuthor] = useState(true);
  // G64：私密链接的访客评论权限三档（默认 add，与官方 commentLevel 默认一致）。
  const [commentLevel, setCommentLevel] = useState<CommentLevel>('add');
  // G1534/G141：visual.options 与其余发布开关（键与 document_share 列同名，默认值照官方 13 项）。
  const [visuals, setVisuals] = useState<Record<string, boolean>>({
    showPageTitle: true,
    hideTableOfContents: false,
    hidePresentationMode: false,
    showWatermark: true,
    enableSeo: false,
    enableObjectLinks: false,
    showDuplicateAsTemplate: false,
    emailBasedAccessEnabled: false,
    hideHashTagWords: false,
  });
  const [permission, setPermission] = useState<DocumentSharePermission | null>(null);
  // G144: the two email-access lists, kept as the pasted text while editing.
  const [emailDraft, setEmailDraft] = useState('');
  const [domainDraft, setDomainDraft] = useState('');
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
  // G04：待批准的编辑请求（requested 成员行），只有所有者能读到。
  const [accessRequests, setAccessRequests] = useState<AccessRequestItem[]>([]);
  const [requestBusy, setRequestBusy] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  // G138：子页数——决定要不要给「分享适用于整个文档」那句与改档前确认。
  const [subpageCount, setSubpageCount] = useState(0);

  /**
   * Run a link write with its own named progress line, then announce its result on success.
   *
   * `setLinkOp` is deliberately *outside* the transition: both calls inside one transition coalesce
   * into a single commit, so the in-flight line would never reach the DOM. The urgent update lands
   * first, the transition carries the write.
   */
  const runLinkOp = (op: LinkOperation, work: () => Promise<void>, failureTitle?: string) => {
    setLinkOp(op);
    startTransition(async () => {
      try {
        await work();
        const done = linkOperationDone(op);
        if (done) toast.add({ id: `link-op-${op}`, type: 'success', title: done });
      } catch {
        if (failureTitle) toast.add({ id: `link-op-${op}-error`, type: 'error', title: failureTitle });
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
      if (view.commentLevel !== undefined) setCommentLevel(normalizeCommentLevel(view.commentLevel));
      setVisuals((prev) => {
        const next = { ...prev };
        for (const key of ['showPageTitle', 'hideTableOfContents', 'hidePresentationMode', 'showWatermark', 'enableSeo', 'enableObjectLinks', 'showDuplicateAsTemplate', 'emailBasedAccessEnabled', 'hideHashTagWords'] as const) {
          const value = view[key];
          if (typeof value === 'boolean') next[key] = value;
        }
        return next;
      });
      if (view.permission !== undefined) {
        const normalized = normalizeSharePermission(view.permission);
        if (normalized) setPermission(normalized);
      }
      if (view.allowedEmails) setEmailDraft(view.allowedEmails.join(', '));
      if (view.allowedDomains) setDomainDraft(view.allowedDomains.join(', '));
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
        setEmailDraft(share.allowedEmails.join(', '));
        setDomainDraft(share.allowedDomains.join(', '));
      } catch {
        // 首次分享也失败（断链且镜像没有行）：停在"生成链接中…"，不谎报档位
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, link, documentId, reloadShareFromMirror]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    countSubpages(documentId)
      .then((count) => {
        if (!cancelled) setSubpageCount(count);
      })
      .catch(() => {
        if (!cancelled) setSubpageCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  // G04：面板每次打开都读一次待批准请求；批准／拒绝后再读一次。
  const reloadAccessRequests = useCallback(async () => {
    if (!open) return;
    try {
      setAccessRequests(await listAccessRequests(documentId));
    } catch {
      setAccessRequests([]);
    }
  }, [open, documentId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listAccessRequests(documentId)
      .then((rows) => {
        if (!cancelled) setAccessRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setAccessRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, documentId]);

  const handleAccessRequest = async (requesterId: string, approve: boolean) => {
    setRequestBusy(requesterId);
    setRequestError(null);
    try {
      await decideAccessRequest(documentId, requesterId, approve);
      await reloadAccessRequests();
    } catch (err) {
      setRequestError(err instanceof Error ? err.message : '请求没有更新，请重试');
    } finally {
      setRequestBusy(null);
    }
  };

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

  /** G64：commentLevel 是枚举不是布尔 ⇒ 单独一条写通路（与视觉开关同形：镜像优先、回退 action）。 */
  const handleCommentLevel = (next: CommentLevel) => {
    setCommentLevel(next);
    startTransition(async () => {
      const shareId = await findDocumentShareId(documentId);
      if (shareId) {
        await getSyncManager().applyLocal({
          table: 'document_share',
          id: shareId,
          patch: { commentLevel: next },
        });
      } else {
        await setShareCommentLevel(documentId, next);
      }
    });
  };

  const handleVisualOption = (
    key:
      | 'showPageTitle'
      | 'hideTableOfContents'
      | 'hidePresentationMode'
      | 'showWatermark'
      | 'enableSeo'
      // G141: the four later boolean publish settings.
      | 'enableObjectLinks'
      | 'showDuplicateAsTemplate'
      | 'emailBasedAccessEnabled'
      | 'hideHashTagWords',
    checked: boolean,
  ) => {
    // G1530: the two access restrictions cannot be on at the same time.
    if (key === 'emailBasedAccessEnabled' && checked && hasPasscode) {
      toast.add({ id: 'password-xor', type: 'warning', title: PASSWORD_XOR_EMAIL });
      return;
    }
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

  // G144: save both allowlists; invalid entries get the official failure sentence.
  const handleSaveAccessLists = () => {
    const emails = parseEmails(emailDraft);
    const domains = parseDomains(domainDraft);
    if (emails.invalid.length > 0) {
      toast.add({ id: 'email-access-fail', type: 'error', title: ADD_EMAIL_ACCESS_FAIL });
      return;
    }
    if (domains.invalid.length > 0) {
      toast.add({ id: 'email-domain-access-fail', type: 'error', title: ADD_EMAIL_DOMAIN_ACCESS_FAIL });
      return;
    }
    startTransition(async () => {
      const next = await setShareAccessLists(documentId, emails.valid, domains.valid);
      setEmailDraft(next.allowedEmails.join(', '));
      setDomainDraft(next.allowedDomains.join(', '));
      toast.add({ id: 'email-access-saved', type: 'success', title: allEmailAddresses(next.allowedEmails.length) });
    });
  };

  const handleTier = (next: DocumentSharePermission) => {
    if (next === permission) return;
    const previous = permission;
    setTierError(null);
    startTransition(async () => {
      try {
        // G138：档位是**整篇文档**的，不是当前子页。有子页时先把话说清，并把作用域写进确认按钮；
        // 只有一页时不打扰（那句话在此刻没有信息量）。确认前不动选区，免得闪一下再退回来。
        const scope = shareScopeConfirmation(subpageCount);
        if (scope && !(await confirmDialog(scope))) return;
        setPermission(next);
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
        setTierError(SHARE_ERROR.changePermission);
      }
    });
  };

  // ☆ 两枚 `applyLocal` 的 `patch` 都必须写成**字面量**：G1489 那道静态闸（`tables.test.ts`）判得出
  //   字面量键、判不出变量（G1492 的盲区基线就按调用点数在钉），抽成 helper 传 patch 会把这一处
  //   从"可判"降级成"要人工复核"。
  const handleEnablePasscode = () => {
    if (!passcode.trim()) return;
    // G1530: email-based access and passcode protection are mutually exclusive.
    if (visuals.emailBasedAccessEnabled) {
      toast.add({ id: 'password-xor', type: 'warning', title: PASSWORD_XOR_EMAIL });
      return;
    }
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
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.add({ id: 'share-copy-link-failed', type: 'error', title: COPY_LINK_FAILED });
    }
  };

  // G1530: rotating the token invalidates the previous link; the official sentence is the toast.
  const handleResetLink = async () => {
    const ok = await confirmDialog({
      title: '重置链接',
      message: PREVIOUS_LINK_INACTIVE,
      confirmLabel: '重置',
    });
    if (!ok) return;
    const nextToken = crypto.randomUUID();
    const shareId = await findDocumentShareId(documentId);
    if (shareId) {
      await getSyncManager().applyLocal({
        table: 'document_share',
        id: shareId,
        patch: { token: nextToken },
      });
    }
    setToken(nextToken);
    setLink(`${window.location.origin}/s/${nextToken}`);
    toast.add({ id: 'share-link-reset', type: 'info', title: PREVIOUS_LINK_INACTIVE });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto rounded-xl! p-0">
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
                <Button size="sm" variant="ghost" onClick={() => void handleResetLink()} aria-label="重置链接">
                  重置
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
              {accessRequests.length > 0 && (
                <div className="mt-3 rounded-md border border-border px-3 py-2.5">
                  <p className="text-sm">{ACCESS_REQUESTS_HEADING} · {accessRequests.length}</p>
                  <ul className="mt-2 space-y-1.5">
                    {accessRequests.map((request) => (
                      <li key={request.requesterId} className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                          {request.name || request.email}
                        </span>
                        {/* G75：同一队列里区分「想要查看」与「想要编辑」。 */}
                        <span className="shrink-0 rounded bg-foreground/8 px-1.5 py-0.5 text-[10px] text-foreground/55">
                          {request.kind === 'view' ? VIEW_REQUEST_LABEL : EDIT_REQUEST_LABEL}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={requestBusy === request.requesterId}
                          onClick={() => void handleAccessRequest(request.requesterId, true)}
                        >
                          批准
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={requestBusy === request.requesterId}
                          onClick={() => void handleAccessRequest(request.requesterId, false)}
                        >
                          拒绝
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {requestError && <p className="mt-1.5 text-xs text-destructive">{requestError}</p>}
                </div>
              )}
              {/* G138：这是**整篇文档**的分享面板。有子页时把作用域说在档位列表之前——
                  官方那句「分享适用于整个文档。你对查看或编辑权限所做的任何更改都将应用于整个文档。」 */}
              {hasSubpages(subpageCount) && (
                <p
                  data-testid="share-scope-warning"
                  className="mt-3 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground"
                >
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  <span>{SHARE_SCOPE_WARNING}</span>
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
              {/* G141：其余两项布尔发布设置。 */}
              {(
                [
                  ['emailBasedAccessEnabled', '启用基于邮箱的访问限制'],
                  ['hideHashTagWords', '在公开页隐藏 # 标签词'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="mt-3 flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5">
                  <p className="text-sm">{label}</p>
                  <Switch
                    checked={visuals[key]}
                    onCheckedChange={(next) => handleVisualOption(key, next)}
                    aria-label={label}
                  />
                </div>
              ))}
              {/* G144：邮箱访问的两级白名单——个人地址（逗号分隔批量粘贴）与域名。 */}
              {visuals.emailBasedAccessEnabled && (
                <div className="mt-3 space-y-2 rounded-md border border-border px-3 py-2.5" data-testid="email-access-lists">
                  <textarea
                    value={emailDraft}
                    onChange={(event) => setEmailDraft(event.target.value)}
                    placeholder={ADD_EMAILS_PLACEHOLDER}
                    aria-label={ADD_EMAILS_PLACEHOLDER}
                    rows={2}
                    className="w-full resize-none rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
                  />
                  <input
                    value={domainDraft}
                    onChange={(event) => setDomainDraft(event.target.value)}
                    placeholder={ADD_EMAIL_DOMAIN}
                    aria-label={ADD_EMAIL_DOMAIN}
                    className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-sm outline-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {allEmailAddresses(parseEmails(emailDraft).valid.length)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={handleSaveAccessLists}>
                      保存访问名单
                    </Button>
                  </div>
                </div>
              )}
              {/* G145：官方「用户互动」分区——每个开关都带描述句与成对状态句（不是只有 tooltip）。
                  评论两枚是三档 `commentLevel` 的两个端点（G64）。官方把它们放在独立子页，且在
                  `commentLevel==='none'` 时主面板整区隐藏；本地没有子页入口，整区隐藏会把「查看评论」
                  一起藏掉、再也打不开 ⇒ 本地区块常驻（声明的本地偏差）。 */}
              <div className="mt-5" data-testid="visitor-interactivity">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {USER_INTERACTIVITY_TITLE}
                </p>
                <div className="flex flex-col gap-2">
                  {[DUPLICATE_SWITCH, BLOCK_LINKS_SWITCH].map((copy) => {
                    const key = copy === DUPLICATE_SWITCH ? 'showDuplicateAsTemplate' : 'enableObjectLinks';
                    const on = visuals[key];
                    return (
                      <div
                        key={copy.labelKey}
                        className="rounded-md border border-border px-3 py-2.5"
                        data-visitor-switch={key}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-sm">{copy.label}</p>
                          <Switch
                            checked={on}
                            onCheckedChange={(next) => handleVisualOption(key, next)}
                            aria-label={copy.label}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{copy.description}</p>
                        <p className="mt-1 text-xs text-foreground/60" data-visitor-status>
                          {visitorSwitchStatus(copy, on)}
                        </p>
                      </div>
                    );
                  })}
                  {/* 评论那两枚在官方是**独立子页**（`C==="comments"` 才渲染 `Yc`）。本地没有子页
                      路由，就把这两枚真开关放在同一分区：查看＝档位不是 none；添加＝档位是 add，
                      且 none 时禁用（官方也是先有查看才谈添加）。 */}
                  <div className="rounded-md border border-border px-3 py-2.5" data-comment-switch="view">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm">{COMMENT_LEVEL_COPY.view.label}</p>
                      <Switch
                        checked={commentLevel !== 'none'}
                        onCheckedChange={(next) => handleCommentLevel(next ? 'view' : 'none')}
                        aria-label={COMMENT_LEVEL_COPY.view.label}
                      />
                    </div>
                  </div>
                  <div className="rounded-md border border-border px-3 py-2.5" data-comment-switch="add">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm">{COMMENT_LEVEL_COPY.add.label}</p>
                      <Switch
                        checked={commentLevel === 'add'}
                        disabled={commentLevel === 'none'}
                        onCheckedChange={(next) => handleCommentLevel(next ? 'add' : 'view')}
                        aria-label={COMMENT_LEVEL_COPY.add.label}
                      />
                    </div>
                  </div>
                </div>
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
                {visuals.emailBasedAccessEnabled && (
                  <p className="mt-1 text-xs text-destructive" data-testid="password-xor-notice">
                    {PASSWORD_XOR_EMAIL}
                  </p>
                )}
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
                        disabled={visuals.emailBasedAccessEnabled}
                        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleEnablePasscode}
                        disabled={!passcode.trim() || visuals.emailBasedAccessEnabled}
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
                      disabled={visuals.emailBasedAccessEnabled}
                      className="h-8 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-xs outline-none transition-colors focus:border-ring"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleEnablePasscode}
                      disabled={!passcode.trim() || visuals.emailBasedAccessEnabled}
                      className="h-8 shrink-0 text-xs"
                    >
                      启用
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {permission === 'linkEdit' || permission === 'editAndComment'
                  ? '拥有链接的登录用户可以协作编辑，匿名访客只能查看'
                  : permission === 'collaborators'
                    ? '链接不再放行，只有已被授权的协作者能打开'
                    : '任何拥有链接的人都只能查看该文档'}
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
