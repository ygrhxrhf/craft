'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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

function needsNetwork(): boolean {
  if (navigator.onLine) return false;
  toast.add({ id: 'offline-hint', type: 'warning', title: '需要网络' });
  return true;
}

/**
 * 导入两个文件挑选器（G223 的 ⋯ 菜单与侧栏按钮共用同一条通路）。返回的两枚隐藏 input 由
 * 调用方渲染；`openMarkdown` / `openBundle` 负责离线短路与挑文件，读文件后落库并跳到第一篇。
 */
export function useImportSources() {
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

  const inputs: ReactNode = (
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
    </>
  );

  const openMarkdown = () => {
    if (!needsNetwork()) fileRef.current?.click();
  };
  const openBundle = () => {
    if (!needsNetwork()) folderRef.current?.click();
  };

  return { busy, inputs, openMarkdown, openBundle };
}
