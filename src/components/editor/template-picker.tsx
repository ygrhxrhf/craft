'use client';

import { useEffect, useState } from 'react';
import type { JSONContent } from '@tiptap/core';
import { LayoutTemplate } from 'lucide-react';

import { getTemplateContent, getTemplates } from '@/actions/document/get';
import { useTemplatePickerStore } from '@/lib/store/use-template-picker-store';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type TemplateRow = { id: string; title: string; icon: string | null; updatedAt: string };

/**
 * The picker half of 「从模板插入」 (`commands.insert.template.inline`). The list is the same read
 * the `/templates` page uses, so the empty state carries that page's wording verbatim rather than
 * a second sentence invented here.
 *
 * The insertion point comes from the store: the slash query is already deleted by the time this
 * dialog opens, so dismissing it leaves no `/…` residue in the document.
 */
export function TemplatePicker() {
  const open = useTemplatePickerStore((state) => state.open);
  const editor = useTemplatePickerStore((state) => state.editor);
  const at = useTemplatePickerStore((state) => state.at);
  const close = useTemplatePickerStore((state) => state.close);
  const [rows, setRows] = useState<TemplateRow[] | null>(null);

  useEffect(() => {
    if (!open) return;
    // Read the list once per open. Resetting `rows` synchronously here would trip the
    // set-state-in-effect rule, and a previous list is still a correct list of this account's
    // templates while the fresh one arrives.
    let cancelled = false;
    void getTemplates()
      .then((list) => {
        if (!cancelled) setRows(list);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const insert = async (id: string) => {
    if (!editor || !at) return;
    try {
      const template = await getTemplateContent(id);
      // The column is `Json` on the way out; the editor takes the same document JSON, so the one
      // place the shapes meet is here rather than in the action, which stays `unknown`.
      editor.chain().focus().insertContentAt(at, template.content as JSONContent).run();
      close();
    } catch {
      // Same shape the info panel uses for its own failure (`另存为模板失败`); local wording.
      alert('插入模板失败');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogContent className="sm:max-w-lg" data-testid="template-picker">
        <DialogTitle>模板</DialogTitle>
        {rows === null ? (
          <p className="text-sm text-foreground/55">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-foreground/55">
            还没有模板,在文档的动作面板中选择「另存为模板」创建
          </p>
        ) : (
          <ul className="max-h-[50vh] space-y-1 overflow-y-auto">
            {rows.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  data-testid={`template-item-${row.id}`}
                  onClick={() => void insert(row.id)}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {row.icon ? <span className="text-base leading-none">{row.icon}</span> : <LayoutTemplate className="size-4 text-foreground/50" />}
                  <span className="truncate">{row.title}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
