/**
 * G177 — import asks *where from* first.
 *
 * Official: `browse.import.md.where`「你想从哪里导入？」 is the question the panel opens with; the
 * sources below it carry their own keys (`import.standalone.md` / `import.from.evernote` /
 * `import.from.notion` / `import.from.readwise` / `import.from.google.docs`). Every one of them is
 * a file the local importer already parses by content:
 *   Markdown `.md`/`.txt`, Evernote `.enex`, Readwise `.csv`, Notion `.zip`, Google Docs `.html`.
 * `browse.import.files`「导入文件」 is the button that opens the panel.
 */

export const IMPORT_WHERE = '你想从哪里导入？';
export const IMPORT_FILES_LABEL = '导入文件';

export type ImportSourceId = 'markdown' | 'evernote' | 'notion' | 'readwise' | 'google-docs';

export interface ImportSource {
  id: ImportSourceId;
  /** The official row label. */
  label: string;
  /** What the shared picker expects for this source (local hint, not an official string). */
  hint: string;
}

export const IMPORT_SOURCES: readonly ImportSource[] = [
  { id: 'markdown', label: '来自 Markdown 文件', hint: '.md / .txt' },
  { id: 'evernote', label: '来自 Evernote', hint: '.enex' },
  { id: 'notion', label: '来自 Notion', hint: '.zip' },
  { id: 'readwise', label: '来自 Readwise', hint: '.csv' },
  { id: 'google-docs', label: '来自 Google Docs', hint: '.html' },
] as const;

/** Text Bundle is a folder, so it keeps its own picker (local string: the pack has no key for it). */
export const IMPORT_BUNDLE_LABEL = 'Text Bundle 文件夹…';

export const IMPORT_SOURCE_KEYS: Record<ImportSourceId, string> = {
  markdown: 'import.standalone.md',
  evernote: 'import.from.evernote',
  notion: 'import.from.notion',
  readwise: 'import.from.readwise',
  'google-docs': 'import.from.google.docs',
};