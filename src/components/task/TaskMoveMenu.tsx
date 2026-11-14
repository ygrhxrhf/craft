'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderInput } from 'lucide-react';

import { getRecentDocuments } from '@/actions/document/get';
import { moveTaskToDocument } from '@/actions/task/move';
import { taskMovedMessage, TASK_MOVE_FAILED } from '@/lib/task/move-copy';
import { toast } from '@/components/ui/toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

/**
 * G1529：任务行的「移至」菜单——每日笔记，或从最近文档里挑一篇。
 * 成功/失败文案都用官方句（`taskMovedMessage` / `TASK_MOVE_FAILED`）。
 */
export function TaskMoveMenu({ taskId, disabled = false }: { taskId: string; disabled?: boolean }) {
  const router = useRouter();
  const [docs, setDocs] = useState<{ id: string; title: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const load = () => {
    void getRecentDocuments(8)
      .then((rows) => setDocs(rows.map((row) => ({ id: row.id, title: row.title }))))
      .catch(() => setDocs([]));
  };

  const move = async (target: { documentId: string } | { dailyNote: true }) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await moveTaskToDocument(taskId, target);
      toast.add({
        id: `task-moved-${taskId}`,
        type: 'success',
        title: taskMovedMessage({ count: 1, documentTitle: result.documentTitle }),
      });
      router.refresh();
    } catch {
      toast.add({ id: `task-move-failed-${taskId}`, type: 'error', title: TASK_MOVE_FAILED });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && load()}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="size-7 p-0 text-muted-foreground"
            aria-label="移至"
            disabled={disabled || busy}
            data-testid="task-move-menu"
          />
        }
      >
        <FolderInput className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => void move({ dailyNote: true })}>每日笔记</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>移至文档</DropdownMenuLabel>
          {docs.length === 0 ? (
            <DropdownMenuItem disabled>没有可选的文档</DropdownMenuItem>
          ) : (
            docs.map((doc) => (
              <DropdownMenuItem key={doc.id} onClick={() => void move({ documentId: doc.id })}>
                <span className="truncate">{doc.title || '无标题文档'}</span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
