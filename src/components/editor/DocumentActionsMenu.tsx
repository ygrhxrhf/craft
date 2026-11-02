'use client';

import { useState } from 'react';
import { MoreHorizontal, ChevronRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  DOCUMENT_MENU_GEOMETRY,
  DOCUMENT_MENU_SECTIONS,
  DOCUMENT_VIEW_ITEMS,
  staticItemsOf,
} from '@/lib/editor/document-menu';

export type DocumentViewTab = 'pageInfo' | 'tasks' | 'attachments' | 'comments';

interface DocumentActionsMenuProps {
  onPageStyle: () => void;
  onFindInPage: () => void;
  onTableOfContents: () => void;
  onMoveTo: () => void;
  onUndo: () => void;
  /** 「视图」那栏的四枚 —— 由调用点决定落到哪个面板页签。 */
  onViewTab: (tab: DocumentViewTab) => void;
}

/**
 * G1451 —— 文档级 `⋯` 弹层，按官方那**五分组**建模（`styleSection`／`navigationSection`／
 * `viewSection`／`documentActionsSection`／`documentManagementSection`），并保留「视图」的
 * **二栏切换**：点「视图」不关弹层，整份内容换成四枚（页面信息／任务／附件／评论）。
 *
 * 注入位（官方 `Lie(I)` 与 `...w.map(Lie)`）在这里**不画空行**：固定骨架只列静态项，
 * 上下文注入的项由调用点以后补——宁可少画一枚，也不画一个点了没反应的空条目。
 */
export function DocumentActionsMenu(props: DocumentActionsMenuProps) {
  const [viewOpen, setViewOpen] = useState(false);

  const run = (fn: () => void) => {
    fn();
    setViewOpen(false);
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setViewOpen(false);
      }}
    >
      <DropdownMenuTrigger
        type="button"
        aria-label="文档操作"
        title="文档操作"
        data-testid="document-actions-menu"
        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        style={{ width: DOCUMENT_MENU_GEOMETRY.width }}
        data-testid="document-actions-content"
      >
        {viewOpen ? (
          <>
            <div className="flex items-center justify-between px-2 py-1 text-[12px] text-muted-foreground">
              <span>视图</span>
              <button
                type="button"
                aria-label="返回"
                onClick={() => setViewOpen(false)}
                className="rounded p-0.5 hover:bg-foreground/4"
              >
                <ChevronRight className="size-3.5 rotate-180" />
              </button>
            </div>
            {DOCUMENT_VIEW_ITEMS.map((item) => (
              <DropdownMenuItem
                key={item.id}
                data-testid={`document-view-${item.id}`}
                onClick={() => run(() => props.onViewTab(item.id as DocumentViewTab))}
              >
                {item.label}
              </DropdownMenuItem>
            ))}
          </>
        ) : (
          DOCUMENT_MENU_SECTIONS.map((section, index) => (
            <div key={section.id}>
              {index > 0 && <DropdownMenuSeparator />}
              {staticItemsOf(section).map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  data-testid={`document-action-${item.id}`}
                  // 「视图」那枚 `preventCloseOnClick: true` —— 点开不关弹层，换内容。
                  onClick={() => {
                    if (item.id === 'view') {
                      setViewOpen(true);
                      return;
                    }
                    if (item.id === 'pageStyle') run(props.onPageStyle);
                    else if (item.id === 'findInPage') run(props.onFindInPage);
                    else if (item.id === 'tableOfContents') run(props.onTableOfContents);
                    else if (item.id === 'moveTo') run(props.onMoveTo);
                    else if (item.id === 'undo') run(props.onUndo);
                  }}
                >
                  {item.label}
                  {item.id === 'view' && <ChevronRight className="ml-auto size-3.5 text-muted-foreground" />}
                </DropdownMenuItem>
              ))}
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
