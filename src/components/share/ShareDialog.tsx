'use client';

import { useEffect, useState, useTransition } from 'react';
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
  const [tierError, setTierError] = useState<string | null>(null);
  const [hasPasscode, setHasPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [token, setToken] = useState('');
  const [slug, setSlug] = useState<string | null>(null);
  const [slugDraft, setSlugDraft] = useState('');
  const [slugError, setSlugError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || link) return;
    let cancelled = false;
    getOrCreateShare(documentId)
      .then((share) => {
        if (!cancelled) {
          setToken(share.token);
          setLink(`${window.location.origin}/s/${share.token}`);
          setIsPublished(share.isPublished);
          setPermission(share.permission);
          setHasPasscode(share.hasPasscode);
          setSlug(share.slug);
          setSlugDraft(share.slug ?? '');
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, link, documentId]);

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
      await setSharePublished(documentId, checked);
    });
  };

  const handleTier = (next: DocumentSharePermission) => {
    if (next === permission) return;
    const previous = permission;
    setTierError(null);
    setPermission(next);
    startTransition(async () => {
      try {
        const result = await setSharePermission(documentId, next);
        setPermission(result.permission);
      } catch {
        setPermission(previous);
        setTierError('档位没有保存，请重试');
      }
    });
  };

  const handleEnablePasscode = () => {
    if (!passcode.trim()) return;
    startTransition(async () => {
      await setSharePasscode(documentId, passcode.trim());
      setHasPasscode(true);
      setPasscode('');
    });
  };

  const handleRemovePasscode = () => {
    startTransition(async () => {
      await setSharePasscode(documentId, null);
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
