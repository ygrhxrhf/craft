'use client';

import { Download, FileText, FolderUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useImportSources } from '@/components/import/use-import-sources';

export function ImportButton() {
  const { busy, inputs, openMarkdown, openBundle } = useImportSources();

  return (
    <>
      {inputs}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="导入" disabled={busy} />}
        >
          <Download className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={openMarkdown}>
            <FileText className="mr-2 size-4" />
            Markdown / HTML / Evernote / Readwise / Notion…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openBundle}>
            <FolderUp className="mr-2 size-4" />
            Text Bundle 文件夹…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
