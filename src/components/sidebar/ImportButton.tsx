'use client';

import { useRef, useState } from 'react';
import { Download, FileText, FolderUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { importMarkdownDocuments, importSourceFiles } from '@/actions/document/import';
import { pickTextBundleEntry } from '@/lib/import/markdown';
import { toast } from '@/components/ui/toast';

interface PendingFile {
  name: string;
  text: string;
}

async function base64Of(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function ImportButton() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function run(files: PendingFile[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      const created = await importMarkdownDocuments({ files });
      if (created.length) router.push(`/documents/${created[0].id}`);
    } finally {
      setBusy(false);
    }
  }

  async function runSource(files: PendingFile[]) {
    if (!files.length) return;
    setBusy(true);
    try {
      const created = await importSourceFiles({ files });
      if (created.length) router.push(`/documents/${created[0].id}`);
    } catch (error) {
      toast.add({
        id: 'import-source-failed',
        type: 'error',
        title: error instanceof Error ? error.message : '导入失败',
      });
    } finally {
      setBusy(false);
    }
  }

  async function readMarkdown(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list).filter((file) => /\.(md|markdown|txt|html?|enex|csv|zip)$/i.test(file.name));
    await runSource(await Promise.all(picked.map(async (file) => ({
      name: file.name,
      text: /\.zip$/i.test(file.name) ? await base64Of(file) : await file.text(),
    }))));
  }

  async function readBundles(list: FileList | null) {
    if (!list) return;
    const entries = Array.from(list).filter((file) => file.webkitRelativePath.includes('/'));
    const roots = new Set(entries.map((file) => file.webkitRelativePath.split('/')[0]));

    const files: PendingFile[] = [];
    for (const root of roots) {
      const members = entries.filter((file) => file.webkitRelativePath.startsWith(`${root}/`));
      const entry = pickTextBundleEntry(members.map((file) => file.webkitRelativePath));
      const found = members.find((file) => file.webkitRelativePath === entry);
      if (found) files.push({ name: root, text: await found.text() });
    }
    await run(files);
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".md,.markdown,.txt,.html,.htm,.enex,.csv,.zip,text/markdown,text/plain,text/html,application/zip"
        className="hidden"
        onChange={(event) => void readMarkdown(event.target.files)}
      />
      <input
        ref={folderRef}
        type="file"
        multiple
        // A Text Bundle is a folder, so the picker has to walk one.
        {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        className="hidden"
        onChange={(event) => void readBundles(event.target.files)}
      />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" aria-label="导入" disabled={busy} />}
        >
          <Download className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => {
            // spec D7-④ 离线提示：导入落库走服务端，需要网络
            if (!navigator.onLine) {
              toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
              return;
            }
            fileRef.current?.click();
          }}>
            <FileText className="mr-2 size-4" />
            Markdown / HTML / Evernote / Readwise / Notion…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => {
            if (!navigator.onLine) {
              toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
              return;
            }
            folderRef.current?.click();
          }}>
            <FolderUp className="mr-2 size-4" />
            Text Bundle 文件夹…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
