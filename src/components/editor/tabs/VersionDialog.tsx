'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { History, RotateCcw, Loader2 } from 'lucide-react';
import { confirmDialog } from '@/lib/dialog/show';
import {
  CANNOT_RESTORE_DOCUMENT,
  DOCUMENT_RESTORED,
  GO_TO_RESTORED_DOCUMENT,
  RESTORE_VERSION_PROMPT,
} from '@/lib/document/backup-restore-copy';
import { toast } from '@/components/ui/toast';
import { useRouter } from 'next/navigation';
import {
  getVersions,
  getVersionContent,
  restoreVersion,
  type VersionItem,
} from '@/actions/version';
import {
  CURRENT_BACKUP_PLAN,
  backupWindowSentence,
  versionsInWindow,
} from '@/lib/document/backup-retention';
import {
  VERSION_BUCKETS,
  VERSION_BUCKET_LABELS,
  changeCountLabel,
  versionBucket,
  versionChangeCount,
} from '@/lib/document/version-groups';

interface VersionDialogProps {
  documentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function VersionDialog({ documentId, open, onOpenChange }: VersionDialogProps) {
  // 结果按「本次打开」记账：每次打开换一个 token，加载态与预览清空都由 token 派生，
  // 不必在 effect 里同步 setLoading/setPreview*（react-hooks/set-state-in-effect）。
  const [openToken, setOpenToken] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setOpenToken((token) => token + 1);
  }

  const [batch, setBatch] = useState<{ token: number; versions: VersionItem[] } | null>(null);
  const [preview, setPreview] = useState<{ token: number; id: string; text: string | null } | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const router = useRouter();

  const loading = open && batch?.token !== openToken;

  useEffect(() => {
    if (!open) return;
    getVersions(documentId)
      .then((versions) => setBatch({ token: openToken, versions }))
      .catch(() => setBatch({ token: openToken, versions: [] }));
  }, [open, openToken, documentId]);

  // G360：备份只看套餐窗口内的版本（Free 30 天 / Plus Family 180 天）。
  const versions = versionsInWindow(
    batch?.token === openToken ? batch.versions : [],
    CURRENT_BACKUP_PLAN,
  );
  const currentPreview = preview?.token === openToken ? preview : null;
  const previewId = currentPreview?.id ?? null;
  const previewText = currentPreview?.text ?? null;

  const handlePreview = async (id: string) => {
    setPreview({ token: openToken, id, text: null });
    try {
      const v = await getVersionContent(id);
      setPreview({ token: openToken, id, text: v.plainText || '(空白内容)' });
    } catch {
      setPreview({ token: openToken, id, text: '(无法加载预览)' });
    }
  };

  const handleRestore = async (id: string) => {
    // G230：恢复产出新文档并跳过去（官方 backup.go.to.restored.document「转至已恢复的文档」）。
    const confirmed = await confirmDialog({
      title: RESTORE_VERSION_PROMPT,
      message: '将按此版本内容新建一份文档，原文档保持不变。',
      confirmLabel: '恢复',
    });
    if (!confirmed) return;
    setRestoring(id);
    try {
      const { documentId } = await restoreVersion(id);
      onOpenChange(false);
      toast.add({
        id: 'document-restored',
        type: 'success',
        title: DOCUMENT_RESTORED,
        actionProps: {
          children: GO_TO_RESTORED_DOCUMENT,
          onClick: () => router.push(`/documents/${documentId}`),
        },
      });
      router.push(`/documents/${documentId}`);
    } catch {
      setRestoring(null);
      toast.add({ id: 'restore-failed', type: 'error', title: CANNOT_RESTORE_DOCUMENT });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            版本历史
          </DialogTitle>
          <DialogDescription>
            每次编辑超过 10 分钟间隔会自动保存一个版本
          </DialogDescription>
          <p className="text-meta text-foreground/45" data-testid="backup-window">
            {backupWindowSentence(CURRENT_BACKUP_PLAN)}
          </p>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
          <div className="min-h-0 w-44 shrink-0 space-y-1 overflow-y-auto pr-1">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : versions.length === 0 ? (
              <div className="py-8 text-center text-meta text-foreground/40">
                暂无版本
              </div>
            ) : (
              VERSION_BUCKETS.map((bucket) => {
                const items = versions.filter((v) => versionBucket(v.createdAt) === bucket);
                if (items.length === 0) return null;
                return (
                  <div key={bucket} className="mb-2">
                    <div className="px-2 py-1 text-meta text-foreground/40">{VERSION_BUCKET_LABELS[bucket]}</div>
                    {items.map((v) => {
                      const previous = versions.find((item) => item.version === v.version - 1);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handlePreview(v.id)}
                          className={`w-full rounded-md px-2 py-1.5 text-left transition-colors duration-150 ease-craft ${
                            previewId === v.id ? 'bg-foreground/6' : 'hover:bg-foreground/4'
                          }`}
                        >
                          <div className="text-ui font-medium">
                            v{v.version} · {formatTime(v.createdAt)}
                          </div>
                          <div className="text-meta text-foreground/40">
                            {changeCountLabel(versionChangeCount(v.wordCount, previous ? previous.wordCount : null))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-foreground/10 bg-foreground/4 p-3">
            {previewId === null ? (
              <div className="flex h-full items-center justify-center text-meta text-foreground/40">
                选择左侧版本查看内容
              </div>
            ) : previewText === null ? (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
              </div>
            ) : (
              <>
                <p className="whitespace-pre-wrap text-ui leading-relaxed">
                  {previewText}
                </p>
                <button
                  type="button"
                  onClick={() => handleRestore(previewId)}
                  disabled={restoring !== null}
                  className="mt-3 flex items-center gap-1.5 rounded-md border border-foreground/10 px-2.5 py-1.5 text-meta transition-colors duration-150 ease-craft hover:bg-foreground/4"
                >
                  {restoring ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="size-3.5" />
                  )}
                  恢复此版本
                </button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
