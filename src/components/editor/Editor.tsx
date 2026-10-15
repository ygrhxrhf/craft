'use client';

import { useEditor, EditorContent, ReactNodeViewRenderer } from '@tiptap/react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import Typography from '@tiptap/extension-typography';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { common, createLowlight } from 'lowlight';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { updateDocument } from '@/actions/document/update';
import { uploadFile } from '@/lib/upload-client';
import { syncBacklinks } from '@/actions/document/backlinks';
import { syncDocumentTasks } from '@/actions/task/task';
import { pmNodeText } from '@/lib/search/extract';
import { ALIGNABLE_TYPES } from '@/lib/editor/format-presence';
import { useCompletedTaskAppearance } from '@/components/task/use-completed-appearance';
import { EditorBubbleMenu } from './bubble-menu/BubbleMenu';
import { AiBubbleMenu } from './bubble-menu/AiBubbleMenu';
import { ImageGenDialogHost } from './ai/ImageGenDialog';
import { TableToolbar } from './table/TableToolbar';
import { DragHandle } from './drag-handle/DragHandle';
import { SlashCommand } from './slash-menu/SlashCommandExtension';
import { slashCommands } from './slash-menu/slash-commands';
import { MarkdownShortcuts } from './extensions/markdown-shortcuts';
import { Callout } from './extensions/callout';
import { ToggleBlock } from './extensions/toggle-block';
import { GradientHighlight } from './extensions/gradient-highlight';
import { FocusStyle } from './extensions/focus-style';
import { ShadedStyle } from './extensions/shaded-style';
import { ImageBlock } from './extensions/image-block';
import { Attachment } from './extensions/attachment';
import { OfficialHardBreak } from './extensions/hard-break';
import { LinkPreview } from './extensions/link-preview';
import { ImageGallery } from './extensions/image-gallery';
import { Drawing } from './extensions/drawing';
import { VideoEmbed } from './extensions/video-embed';
import { Divider } from './extensions/divider';
import { CodeBlockView } from './extensions/code-block-view';
import { ReminderPill } from './extensions/reminder-pill';
import { MathBlock } from './extensions/math-block';
import { InlineMath } from './extensions/math-inline';
import { Mention } from './extensions/mention';
import { BlockLink } from './extensions/block-link';
import { BlockId } from './extensions/block-id';
import { TaskItemId } from './extensions/task-id';
import { BlockEmoji } from './extensions/block-emoji';
import { MirrorBlock } from './extensions/mirror-block';
import { BlockLinkSuggestion } from './extensions/block-link-suggestion';
import { MentionUserSuggestion } from './extensions/mention-user-suggestion';
import { EmojiSuggestion } from './extensions/emoji-suggestion';
import { FontSize } from './extensions/font-size';
import { WritingDirection } from './extensions/writing-direction';
import { Columns, Column } from './extensions/columns';
import { TableOfContents } from './extensions/toc';
import { WhiteboardLink } from './extensions/whiteboard-link';
import { WhiteboardEmbed } from './extensions/whiteboard-embed';
import { SidebarDrop } from './extensions/sidebar-drop';
import { CardBlock } from './extensions/card-block';
import { CommentMark } from './extensions/comment-mark';
import { FindReplace } from './extensions/find-replace';
import { CraftKeymap } from './extensions/craft-keymap';
import { saveDraft, getDraft, deleteDraft } from '@/lib/offline/draft-store';
import { jumpToAnchor, readAnchorHash } from '@/lib/editor/block-anchor';
import { useCollabSession } from '@/lib/collaboration/use-collab-session';
import { CursorLayer } from './collab/CursorLayer';
import Collaboration from '@tiptap/extension-collaboration';

const lowlight = createLowlight(common);

function collectLinkedDocIds(content: unknown): string[] {
  const ids = new Set<string>();
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (
      (node.type === 'mention' || node.type === 'blockLink' || node.type === 'mirrorBlock') &&
      typeof (node.attrs?.documentId ?? node.attrs?.sourceDocumentId) === 'string'
    ) {
      ids.add(node.attrs.documentId ?? node.attrs.sourceDocumentId);
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  if (content && typeof content === 'object' && 'type' in (content as object)) {
    walk(content);
  }
  return [...ids];
}

function collectTaskItems(content: unknown): { taskId: string; title: string; isCompleted: boolean; remindAt: string | null; cancelled: boolean; cancelledAt: string | null }[] {
  const tasks: { taskId: string; title: string; isCompleted: boolean; remindAt: string | null; cancelled: boolean; cancelledAt: string | null }[] = [];
  const walk = (node: any) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'taskItem' && Array.isArray(node.content)) {
      const title = node.content.map(pmNodeText).join(' ').trim();
      if (title) {
        // 真源＝文档里那枚 `taskId`（`extensions/task-id.ts` 在同一批事务里钉好）。
        // 这里的兜底只服务"正文来自一枚没跑过该插件的旧文档"这一档：临时副本上补一枚，
        // 让这一趟投影有个键可对账，但下次保存仍会由插件写回文档而稳定下来。
        const taskId = typeof node.attrs?.taskId === 'string' && node.attrs.taskId
          ? node.attrs.taskId
          : crypto.randomUUID();
        node.attrs = { ...node.attrs, taskId };
        tasks.push({
          taskId,
          title,
          isCompleted: !!node.attrs.checked,
          remindAt: typeof node.attrs?.remindAt === 'string' ? node.attrs.remindAt : null,
          cancelled: !!node.attrs?.cancelled,
          cancelledAt: typeof node.attrs?.cancelledAt === 'string' ? node.attrs.cancelledAt : null,
        });
      }
    }
    if (Array.isArray(node.content)) node.content.forEach(walk);
  };
  if (content && typeof content === 'object' && 'type' in (content as object)) {
    walk(content);
  }
  return tasks;
}

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

interface EditorProps {
  documentId: string;
  initialContent?: any;
  readOnly?: boolean;
  collaborative?: boolean;
  onUpdate?: (content: any, plainText: string, wordCount: number) => void;
  onEditorReady?: (editor: TiptapEditor | null) => void;
  onSaveStateChange?: (state: SaveState) => void;
  onSaveNowReady?: (saveNow: (() => void) | null) => void;
  /** Page-level spell check (G65). Off unless the page turns it on. */
  spelling?: boolean;
  spellingLang?: string;
}

export function Editor({
  documentId,
  initialContent,
  readOnly = false,
  collaborative = false,
  onUpdate,
  onEditorReady,
  onSaveStateChange,
  onSaveNowReady,
  spelling = false,
  spellingLang,
}: EditorProps) {
  // Created during the first render so the Collaboration extension can be built
  // synchronously; a ref write here would violate the rules of hooks.
  const [collabYdoc] = useState<Y.Doc | null>(() => (collaborative ? new Y.Doc() : null));
  const {
    ydoc: collabDoc,
    state: collabState,
    readOnly: collabReadOnly,
    awareness: collabAwareness,
  } = useCollabSession(documentId, collabYdoc, collaborative);
  // Server-side collab grants can arrive after mount, so every write path keys off
  // `locked` rather than the `readOnly` prop alone.
  const locked = readOnly || collabReadOnly;

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingRef = useRef<{
    content: unknown;
    plainText: string;
    wordCount: number;
    contentStr: string;
    revision: number;
  } | null>(null);
  const lastSavedRef = useRef<string>('');
  const revisionRef = useRef(0);
  const savingRef = useRef(false);

  const setSaveState = useCallback((state: SaveState) => {
    onSaveStateChange?.(state);
  }, [onSaveStateChange]);

  /**
   * 反链与任务行这两张派生表谁都不许把"保存"本身拖下水，但也不能**静默**失败：一台拿着旧契约的
   * dev server 会让 `syncDocumentTasks` 整批 500（`Unknown column "cancelledAt"`），而屏上一直写着
   * 「已保存」⇒ 本机库里 `documentId` 非空的任务行数＝0 这件事从来没人看得见（G1497 的教训）。
   * ☆ 但这两张表是**另一张账**：正文行已经写进去了，就不能因为派生表没跟上而报「这版没保存」——
   *   那会把 `onUpdate`（标题/字数回灌）与 `deleteDraft` 一起扣下，把成功说成失败。
   *   所以正文的账照常结，派生表的失败单独记一枚脏标 ⇒ 徽标翻红，「重试」在没有 pending 时只补跑
   *   派生表那一路（不清脏标＝徽标一直红着，用户不会误以为已经同步好）。
   */
  const derivedDirtyRef = useRef<{ content: unknown } | null>(null);

  const syncDerivedTables = async (content: unknown): Promise<boolean> => {
    const results = await Promise.allSettled([
      syncBacklinks(documentId, collectLinkedDocIds(content)),
      syncDocumentTasks(documentId, collectTaskItems(content)),
    ]);
    const failed = results.filter((one): one is PromiseRejectedResult => one.status === 'rejected');
    for (const failure of failed) console.error('[save] 派生表同步失败', failure.reason);
    return failed.length === 0;
  };

  const applyDerivedOutcome = (content: unknown, ok: boolean): void => {
    derivedDirtyRef.current = ok ? null : { content };
    setSaveState(ok ? 'saved' : 'error');
  };

  const retryDerived = async (): Promise<void> => {
    const dirty = derivedDirtyRef.current;
    if (!dirty) return;
    setSaveState('saving');
    if (await syncDerivedTables(dirty.content)) {
      derivedDirtyRef.current = null;
      setSaveState('saved');
    } else {
      setSaveState('error');
    }
  };

  const savePending = async () => {
    const pending = pendingRef.current;
    if (!pending || savingRef.current || pending.contentStr === lastSavedRef.current) return;

    savingRef.current = true;
    setSaveState('saving');
    try {
      if (collaborative) {
        // The Yjs room is the source of truth, and the collab server mirrors it
        // into Document.content. Writing that row from every open tab is what
        // used to clobber newer edits with a stale full-document overwrite, so
        // only the side tables that nothing else derives are synced here.
        const synced = await syncDerivedTables(pending.content);
        lastSavedRef.current = pending.contentStr;
        pendingRef.current = null;
        onUpdate?.(pending.content, pending.plainText, pending.wordCount);
        applyDerivedOutcome(pending.content, synced);
        return;
      }

      await updateDocument(documentId, {
        content: pending.content,
        plainText: pending.plainText,
        wordCount: pending.wordCount,
      });
      if (pending.revision >= revisionRef.current) {
        const synced = await syncDerivedTables(pending.content);
        lastSavedRef.current = pending.contentStr;
        pendingRef.current = null;
        onUpdate?.(pending.content, pending.plainText, pending.wordCount);
        void deleteDraft(documentId).catch(() => {});
        applyDerivedOutcome(pending.content, synced);
      }
    } catch {
      setSaveState('error');
      if (pending) {
        void saveDraft({
          documentId,
          content: pending.content,
          plainText: pending.plainText,
          wordCount: pending.wordCount,
          contentStr: pending.contentStr,
          savedAt: Date.now(),
        }).catch(() => {});
      }
    } finally {
      savingRef.current = false;
      if (pendingRef.current && pendingRef.current.revision > (pending?.revision ?? 0)) {
        queueMicrotask(() => void savePending());
      }
    }
  };

  const scheduleSave = (delay = 2000) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void savePending();
    }, delay);
  };

  const savePendingRef = useRef(savePending);
  useEffect(() => {
    savePendingRef.current = savePending;
  });
  // The room keeps its own copy of the content, but `Document.content` — which the
  // public page, export, search and version snapshots read — only moves when this
  // debounced write lands. Leaving the editor inside the debounce window used to drop
  // it, so flush instead of clearing the timer.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      void savePendingRef.current();
    };
  }, []);

  const editor = useEditor({
    // The editor only ever mounts client-side; opting out avoids a hydration mismatch.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        // Official Shift-Enter does nothing on a document page. StarterKit's HardBreak
        // binds that key, so drop the shortcut and keep the node via OfficialHardBreak.
        hardBreak: false,
        // Our divider carries four weights; StarterKit's plain <hr> would compete
        // for the `---` input rule and produce a second, featureless node.
        horizontalRule: false,
        heading: {
          levels: [1, 2, 3, 4],
        },
        underline: {},
        // StarterKit's TrailingNode appends an empty paragraph whenever the doc's last
        // block isn't a paragraph, so wrapping the tail blocks in a list left a stray
        // empty line (G1485). A list item already holds a paragraph, so the caret is
        // reachable without it — Enter on an empty item still exits the list.
        trailingNode: { notAfter: ['bulletList', 'orderedList', 'taskList'] },
        link: {
          openOnClick: false,
          HTMLAttributes: {
            class: 'text-primary underline-offset-4 hover:underline',
          },
        },
        dropcursor: {
          width: 2,
          class: 'ProseMirror-dropcursor',
        },
        // Yjs owns history in collaborative rooms; its own undo would revert
        // another editor's changes.
        undoRedo: collaborative ? false : {},
      }),
      OfficialHardBreak,
      TextAlign.configure({
        // 与「格式」面板的对齐判定同源（`format-presence.ts`）：面板点亮某一档，正文就必须写得进这一档。
        types: ALIGNABLE_TYPES,
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      ReminderPill,
      TaskItem.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            taskId: {
              default: null,
              parseHTML: (element) => element.getAttribute('data-task-id'),
              renderHTML: (attributes) => attributes.taskId
                ? { 'data-task-id': attributes.taskId }
                : {},
            },
            // The reminder lives on the task item and rides the existing task sync, which already
            // carries remindAt. It is not a document transaction of its own.
            remindAt: {
              default: null,
              parseHTML: (element) => element.getAttribute('data-remind-at'),
              renderHTML: (attributes) => attributes.remindAt
                ? { 'data-remind-at': attributes.remindAt }
                : {},
            },
            // 官方是「一条轴、三档」（tasks.md:11）：取消不是第二个勾选框，它把完成态让出来，
            // 并且自己记一个时间戳（`tasks.canceled.on`）。两枚属性都得进 doc JSON，取消才谈得上持久。
            cancelled: {
              default: false,
              parseHTML: (element) => element.getAttribute('data-cancelled') === 'true',
              renderHTML: (attributes) => attributes.cancelled
                ? { 'data-cancelled': 'true' }
                : {},
            },
            cancelledAt: {
              default: null,
              parseHTML: (element) => element.getAttribute('data-cancelled-at'),
              renderHTML: (attributes) => attributes.cancelledAt
                ? { 'data-cancelled-at': attributes.cancelledAt }
                : {},
            },
          };
        },
      }).configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-list-item',
        },
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Placeholder.configure({
        placeholder: '输入 / 使用命令...',
      }),
      CharacterCount,
      Typography,
      TextStyle,
      Color,
      CodeBlockLowlight.extend({
        addNodeView() {
          return ReactNodeViewRenderer(CodeBlockView);
        },
        addAttributes() {
          return {
            ...this.parent?.(),
            // The block's code theme (G1093/G1108). Official keeps theme and content on separate
            // actions so their undos stay independent; here it is one attribute, which is a
            // declared local deviation rather than an oversight.
            themeId: {
              default: 'auto',
              parseHTML: (element) => element.getAttribute('data-theme-id') ?? 'auto',
              renderHTML: (attributes) => ({ 'data-theme-id': attributes.themeId }),
            },
          };
        },
      }).configure({
        lowlight,
      }),
      Table.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            // 隔行颜色 (table.row.color.alternating). Absent means off.
            alternating: {
              default: false,
              parseHTML: (element) => element.getAttribute('data-alternating') === 'true',
              renderHTML: (attributes) =>
                attributes.alternating ? { 'data-alternating': 'true' } : {},
            },
          };
        },
      }).configure({
        resizable: true,
      }),
      TableRow,
      TableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            backgroundColor: {
              default: null,
              parseHTML: (element) =>
                element.style.backgroundColor || null,
              renderHTML: (attributes) => {
                if (!attributes.backgroundColor) return {};
                return { style: `background-color: ${attributes.backgroundColor}` };
              },
            },
            color: {
              default: null,
              parseHTML: (element) => element.style.color || null,
              renderHTML: (attributes) => {
                if (!attributes.color) return {};
                return { style: `color: ${attributes.color}` };
              },
            },
          };
        },
      }),
      TableHeader,
      Callout,
      ToggleBlock,
      GradientHighlight,
      FocusStyle,
      ShadedStyle,
      ImageBlock,
      Attachment,
      LinkPreview,
      ImageGallery,
      Drawing,
      VideoEmbed,
      Divider,
      MathBlock,
      InlineMath,
      Mention,
      BlockLink,
      BlockId,
      TaskItemId,
      BlockEmoji,
      MirrorBlock.configure({ hostDocumentId: documentId }),
      BlockLinkSuggestion,
      MentionUserSuggestion.configure({ documentId }),
      EmojiSuggestion,
      FontSize,
      WritingDirection,
      Columns,
      Column,
      TableOfContents,
      WhiteboardLink,
      WhiteboardEmbed,
      SidebarDrop,
      CardBlock,
      MarkdownShortcuts,
      SlashCommand,
      FindReplace,
      CraftKeymap,
      CommentMark.configure({
        HTMLAttributes: {
          class: 'comment-mark',
        },
      }),
      ...(collabDoc
        ? [Collaboration.configure({ document: collabDoc, field: 'default' })]
        : []),
    ],
    content: collaborative ? '' : initialContent || '',
    editable: !locked,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
        spellcheck: spelling ? 'true' : 'false',
        ...(spelling && spellingLang ? { lang: spellingLang } : {}),
      },
      handlePaste: (view, event) => {        const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
          f.type.startsWith('image/')
        );
        if (files.length === 0) {
          const text = event.clipboardData?.getData('text/plain')?.trim() ?? '';
          const { from, to, empty } = view.state.selection;
          if (
            empty &&
            view.state.schema.nodes.linkPreview &&
            /^https?:\/\/\S+$/.test(text)
          ) {
            event.preventDefault();
            view.dispatch(
              view.state.tr.replaceSelectionWith(
                view.state.schema.nodes.linkPreview.create({ url: text })
              )
            );
            return true;
          }
          return false;
        }
        event.preventDefault();
        void (async () => {
          for (const file of files) {
            try {
              const { url } = await uploadFile(file);
              view.dispatch(
                view.state.tr.replaceSelectionWith(
                  view.state.schema.nodes.imageBlock.create({
                    src: url,
                    alt: file.name,
                  })
                )
              );
            } catch {
              // upload failure: skip this image
            }
          }
        })();
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      if (locked) return;
      const rawContent = editor.getJSON();
      const content = JSON.parse(JSON.stringify(rawContent));
      const plainText = editor.getText();
      const wordCount = editor.storage.characterCount.characters();
      const contentStr = JSON.stringify(content);
      revisionRef.current += 1;
      pendingRef.current = {
        content,
        plainText,
        wordCount,
        contentStr,
        revision: revisionRef.current,
      };
      setSaveState('dirty');
      scheduleSave();
    },
  });

  useEffect(() => {
    editor?.setEditable(!locked);
  }, [editor, locked]);

  useEffect(() => {
    if (!editor) return;
    let stop: (() => void) | undefined;
    const jump = () => {
      stop?.();
      const anchor = readAnchorHash(window.location.hash);
      if (anchor) stop = jumpToAnchor(editor, anchor);
    };
    jump();
    window.addEventListener('hashchange', jump);
    return () => {
      window.removeEventListener('hashchange', jump);
      stop?.();
    };
  }, [editor, documentId]);

  useEffect(() => {
    if (editor) onEditorReady?.(editor);
    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  useEffect(() => {
    if (!editor || locked) return;
    if (collaborative && collabState === 'synced' && collabDoc && initialContent) {
      const fragment = collabDoc.getXmlFragment('default');
      if (fragment.length === 0 && editor.isEmpty) {
        // Migrating a legacy document into its room. Only the client that wins
        // the server-side claim may do it: two seeders mean two independent
        // inserts of the same body, and the CRDT merge keeps both.
        void (async () => {
          let granted = false;
          try {
            const res = await fetch('/api/collab/claim-seed', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ documentId }),
            });
            granted = res.ok && (await res.json())?.granted === true;
          } catch {
            granted = false;
          }
          if (!granted) return;
          // Re-check under the claim: another client may have seeded while the
          // request was in flight.
          if (collabDoc.getXmlFragment('default').length > 0) return;
          editor.commands.setContent(initialContent as never);
        })();
      }
      return;
    }
    if (collaborative) return;
    let cancelled = false;
    void getDraft(documentId)
      .then(async (draft) => {
        if (cancelled || !draft) return;
        if (JSON.stringify(editor.getJSON()) === draft.contentStr) {
          await deleteDraft(documentId).catch(() => {});
          return;
        }
        editor.commands.setContent(draft.content as never);
        setSaveState('dirty');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [editor, locked, documentId, setSaveState, collaborative, collabState, collabDoc, initialContent]);

  useEffect(() => {
    // 「重试」那枚按钮：还有没写出去的正文就整趟重跑；正文已经落地、只有派生表欠着，就只补派生表。
    if (editor && !locked) onSaveNowReady?.(() => {
      if (pendingRef.current) void savePending();
      else void retryDerived();
    });
    return () => onSaveNowReady?.(null);
  }, [editor, onSaveNowReady, locked, savePending, retryDerived]);

  useEffect(() => {
    if (!editor || locked) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        void savePending();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor, locked, savePending]);

  useEffect(() => {
    // DOM-level intercept for slash-command drag-and-drop.
    // PM processes the drop first (inserting text/plain as fallback), then our command overwrites it.
    if (!editor) return;
    const dom = editor.view.dom;

    let pendingSlash: { name: string } | null = null;

    const onDragOver = (e: Event) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt || !dt.types.includes('application/x-crafty-slash-command')) return;
      e.preventDefault();
      dt.dropEffect = 'copy';
    };

    const onDragStart = (e: Event) => {
      const dt = (e as DragEvent).dataTransfer;
      if (!dt) return;
      const raw = dt.getData('application/x-crafty-slash-command');
      if (!raw) return;
      try { pendingSlash = JSON.parse(raw); } catch { pendingSlash = null; }
    };

    const onDrop = (e: Event) => {
      if (!pendingSlash) return;
      const cmd = slashCommands.find((c) => c.name === pendingSlash!.name);
      pendingSlash = null;
      if (!cmd) return;

      // Let PM finish processing the drop first, then run our command.
      // PM may insert text/plain; our command replaces it with the correct block.
      requestAnimationFrame(() => {
        try {
          const { from, to } = editor.state.selection;
          const range = from === to ? { from, to: from } : { from, to };
          cmd.command(editor, range);
        } catch {}
      });
    };

    window.addEventListener('dragover', onDragOver, true);
    window.addEventListener('dragstart', onDragStart, true);
    dom.addEventListener('drop', onDrop);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      window.removeEventListener('dragover', onDragOver, true);
      window.removeEventListener('dragstart', onDragStart, true);
      dom.removeEventListener('drop', onDrop);
    };
  }, [editor]);

  // G160：正文里的待办勾选行也吃同一档「完成任务的外观」。和拼写开关同理——偏好会在编辑器建好
  // 之后才从本机镜像读到／被设置页改掉，所以写进 editable 的 data 属性由 CSS 接管，而不是建编辑器时定死。
  const completedAppearance = useCompletedTaskAppearance();

  // `editorProps` is read once, when the editor is created. The spell-check switch lives on the page,
  // so it has to be written onto the editable after the fact or toggling it would do nothing.
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    dom.setAttribute('spellcheck', spelling ? 'true' : 'false');
    if (spelling && spellingLang) dom.setAttribute('lang', spellingLang);
    else dom.removeAttribute('lang');
    dom.setAttribute('data-completed-appearance', completedAppearance);
  }, [editor, spelling, spellingLang, completedAppearance]);

  if (!editor) return null;

  if (locked) {
    return (
      <div className="relative">
        <CursorLayer editor={editor} awareness={collabAwareness} />
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="relative">
      <CursorLayer editor={editor} awareness={collabAwareness} />
      <DragHandle editor={editor} documentId={documentId} />
      <EditorBubbleMenu editor={editor} />
      <AiBubbleMenu editor={editor} />
      <TableToolbar editor={editor} />
      {collaborative && (collabState === 'error' || collabState === 'offline') && (
        <p
          role="status"
          className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          协作连接已断开，此后的修改不会同步到服务器。若你是通过分享链接编辑的，权限可能已被变更。
        </p>
      )}
      <EditorContent editor={editor} />
      <ImageGenDialogHost editor={editor} />
    </div>
  );
}
