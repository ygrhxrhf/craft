'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ensureStarterTemplates, type StarterTemplateRow } from '@/actions/document/starter-templates';
import { createDocument } from '@/actions/document/create';

/**
 * G1672 —— 「Craft 的模板库」横幅 +「打开图库」。
 *
 * 官方那枚按钮打开的是外部的模板图库；本地把内容换成随包自带的起始模板（第一次打开时种进本账号，
 * 见 `ensureStarterTemplates`）。点一张卡＝用它新建一篇文档，和官方图库的动作一致。
 */
export function TemplateGallery() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StarterTemplateRow[] | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  const load = () => {
    if (rows !== null) return;
    ensureStarterTemplates()
      .then(setRows)
      .catch(() => setRows([]));
  };

  async function applyTemplate(template: StarterTemplateRow) {
    if (creating) return;
    setCreating(template.id);
    try {
      const doc = await createDocument({ useTemplateId: template.id, title: template.title });
      setOpen(false);
      router.push(`/documents/${(doc as { id: string }).id}`);
    } finally {
      setCreating(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      {/* 官方横幅：标题 + 一句说明 + 「打开图库」。 */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[10px] bg-foreground/[0.03] px-4 py-3">
        <LayoutTemplate className="size-5 shrink-0 text-foreground/50" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold leading-5 text-foreground">Craft 的模板库</p>
          <p className="mt-0.5 text-[13px] leading-4 text-foreground/55">
            数百个模板可帮助你加快工作流程，变得更有条理并释放你的创造力
          </p>
        </div>
        <DialogTrigger className="shrink-0 rounded-md bg-foreground/[0.06] px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/[0.1]">
          打开图库
        </DialogTrigger>
      </div>
      <DialogContent className="max-h-[80vh] w-[720px] overflow-y-auto p-5">
        <DialogTitle className="mb-4 text-[15px] font-semibold">模板图库</DialogTitle>
        {rows === null ? (
          <p className="flex items-center gap-2 py-6 text-[13px] text-foreground/55">
            <Loader2 className="size-4 animate-spin" /> 正在准备模板…
          </p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-[13px] text-foreground/55">暂时没有可用模板</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {rows.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => void applyTemplate(template)}
                disabled={creating !== null}
                className="flex flex-col items-start gap-2 rounded-[10px] border border-foreground/8 bg-white p-3 text-left transition-colors hover:border-foreground/20"
              >
                <span className="text-2xl leading-none">{template.icon || '📄'}</span>
                <span className="text-[13px] font-medium text-foreground">{template.title}</span>
                <span className="text-[12px] text-foreground/50">{template.category}</span>
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
