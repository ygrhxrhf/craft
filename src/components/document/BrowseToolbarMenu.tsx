'use client';

import { useRouter } from 'next/navigation';
import { Check, MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toast';
import { useImportSources } from '@/components/import/use-import-sources';
import { exportLibraryTextBundleZip, exportLibraryZip } from '@/actions/document/export-library';
import { downloadBase64File } from '@/lib/download/base64-file';
import {
  BROWSE_SORT_CHOICES,
  TOOLBAR_MENU_GROUPS,
  type BrowseSortOption,
  type ToolbarMenuGroup,
} from '@/lib/browse/toolbar-menu';
import { LAYOUT_ENTRY_LABEL } from '@/lib/browse/view-modes';

interface BrowseToolbarMenuProps {
  sortChoice: BrowseSortOption;
  onSortChange: (choice: BrowseSortOption) => void;
  showDailyNotes: boolean;
  onToggleDailyNotes: () => void;
  onSelect: () => void;
}

/**
 * G223：所有文档屏工具栏的 ⋯ 菜单。七组十项，分组与顺序来自 `toolbar-menu.ts`（台账结构）。
 * 排序只有四档、默认 更新日期；导出有两枚（Markdown / TextBundle）。
 */
export function BrowseToolbarMenu({
  sortChoice,
  onSortChange,
  showDailyNotes,
  onToggleDailyNotes,
  onSelect,
}: BrowseToolbarMenuProps) {
  const router = useRouter();
  const { inputs, openMarkdown, openBundle } = useImportSources();

  const exportLibrary = async (kind: 'markdown' | 'textbundle') => {
    try {
      const file = kind === 'markdown' ? await exportLibraryZip() : await exportLibraryTextBundleZip();
      downloadBase64File(file.filename, file.base64, 'application/zip');
    } catch {
      toast.add({ id: `library-export-${kind}-failed`, type: 'error', title: '资料库导出失败' });
    }
  };

  const renderEntry = (entry: ToolbarMenuGroup['entries'][number]) => {
    if (entry.id === 'select') {
      return (
        <DropdownMenuItem key={entry.id} onClick={onSelect} data-testid="browse-enter-selection">
          {entry.label}
        </DropdownMenuItem>
      );
    }
    if (entry.id === 'showDailyNotes') {
      return (
        <DropdownMenuItem key={entry.id} onClick={onToggleDailyNotes} aria-checked={showDailyNotes}>
          <span className="flex-1">{entry.label}</span>
          {showDailyNotes ? <Check className="size-3.5" /> : null}
        </DropdownMenuItem>
      );
    }
    if (entry.id === 'import') {
      return (
        <DropdownMenuSub key={entry.id}>
          <DropdownMenuSubTrigger>{entry.label}</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={openMarkdown}>Markdown / HTML / Evernote…</DropdownMenuItem>
            <DropdownMenuItem onClick={openBundle}>Text Bundle 文件夹…</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      );
    }
    if (entry.id === 'exportMarkdown') {
      return (
        <DropdownMenuItem key={entry.id} onClick={() => void exportLibrary('markdown')}>
          {entry.label}
        </DropdownMenuItem>
      );
    }
    if (entry.id === 'exportTextBundle') {
      return (
        <DropdownMenuItem key={entry.id} onClick={() => void exportLibrary('textbundle')}>
          {entry.label}
        </DropdownMenuItem>
      );
    }
    // spaceSettings
    return (
      <DropdownMenuItem key={entry.id} onClick={() => router.push('/settings')}>
        {entry.label}
      </DropdownMenuItem>
    );
  };

  return (
    <>
      {inputs}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={LAYOUT_ENTRY_LABEL} />}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {TOOLBAR_MENU_GROUPS.map((group, index) => (
            <DropdownMenuGroup key={group.title ?? group.entries[0]?.id}>
              {index > 0 && <DropdownMenuSeparator />}
              {group.title && <DropdownMenuLabel>{group.title}</DropdownMenuLabel>}
              {group.title === '排序方式'
                ? BROWSE_SORT_CHOICES.map((choice) => (
                    <DropdownMenuItem
                      key={choice.id}
                      onClick={() => onSortChange(choice.id)}
                      aria-checked={sortChoice === choice.id}
                    >
                      <span className="flex-1">{choice.label}</span>
                      {sortChoice === choice.id ? <Check className="size-3.5" /> : null}
                    </DropdownMenuItem>
                  ))
                : group.entries.map((entry) => renderEntry(entry))}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
