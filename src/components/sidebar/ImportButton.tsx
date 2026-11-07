'use client';

import { Download, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useImportSources } from '@/components/import/use-import-sources';
import {
  IMPORT_BUNDLE_LABEL,
  IMPORT_FILES_LABEL,
  IMPORT_SOURCES,
  IMPORT_WHERE,
} from '@/lib/browse/import-sources';

/**
 * G177：导入先问「你想从哪里导入？」，再列来源。五个来源共用同一个文件挑选器——本地导入器按
 * 内容分流（`.enex` / `.csv` / `.zip` / `.html` / `.md`），所以每一行都是真通路而不是五个文案。
 */
export function ImportButton() {
  const { busy, inputs, openMarkdown, openBundle } = useImportSources();

  return (
    <>
      {inputs}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label={IMPORT_FILES_LABEL} disabled={busy} />}
        >
          <Download className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <div className="px-2 py-1.5 text-[11px] font-medium text-muted-foreground">
            {IMPORT_WHERE}
          </div>
          {IMPORT_SOURCES.map((source) => (
            <DropdownMenuItem key={source.id} onClick={openMarkdown}>
              <span className="min-w-0 flex-1">{source.label}</span>
              <span className="ml-2 shrink-0 text-[11px] text-muted-foreground/70">{source.hint}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onClick={openBundle}>
            <FolderUp className="mr-2 size-4" />
            {IMPORT_BUNDLE_LABEL}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}