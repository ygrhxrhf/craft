import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  ListX,
  CheckSquare,
  ChevronRight,
  FoldVertical,
  UnfoldVertical,
  Quote,
  Code,
  Image,
  Table,
  Minus,
  AlertCircle,
  Info,
  AlertTriangle,
  CheckCircle,
  StickyNote,
  FileText,
  AtSign,
  CreditCard,
  LayoutGrid,
  LayoutTemplate,
  Columns2,
  Copy,
  Flag,
  CalendarDays,
  Tag,
  Globe,
  Sparkles,
  PenLine,
  Sigma,
  Video,
  Presentation,
  Network,
  Music,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import type { ComponentType } from 'react';
import { readDefaultLanguage, readDefaultTheme } from '@/lib/editor/code-preferences';
import { parseTableShortcut, type TableShortcutSize } from '@/lib/editor/nx-m-table';
import { ALIGNMENT_CONTROLS } from '@/lib/editor/format-commands';
import { promptDialog } from '@/lib/dialog/show';
import { normalizeTagAtomName } from '@/lib/editor/inline-atoms';
import { uploadFile } from '@/lib/upload-client';
import { createWhiteboard } from '@/actions/whiteboard/whiteboard';
import { createCollection } from '@/actions/collection/collection';
import { COLLECTION_EMBED_LABELS, type CollectionEmbedView } from '@/lib/collection/embed-block';
import { requestImageGen } from '@/components/editor/ai/ImageGenDialog';
import { useTemplatePickerStore } from '@/lib/store/use-template-picker-store';

export interface SlashCommand {
  name: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  keywords: string[];
  category: string;
  command: (editor: Editor, range: { from: number; to: number }) => void;
}

import { useTaskDateMenuStore } from '@/lib/store/use-task-date-menu-store';
import { useRemindRequestStore } from '@/lib/store/use-remind-request-store';

export const slashCommands: SlashCommand[] = [
  // ── 基础块 ──
  {
    name: '文本',
    description: '普通文本段落',
    icon: Type,
    keywords: ['text', 'paragraph', '文本', '段落'],
    category: '基础块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    name: '标题 1',
    description: '大标题',
    icon: Heading1,
    keywords: ['h1', 'title', 'heading 1', '标题', '大标题'],
    category: '基础块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    name: '标题 2',
    description: '副标题',
    icon: Heading2,
    keywords: ['h2', 'subtitle', 'heading 2', '副标题'],
    category: '基础块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    name: '标题 3',
    description: '三级标题',
    icon: Heading3,
    keywords: ['h3', 'heading 3', '标题 3'],
    category: '基础块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    name: '标题 4',
    description: '四级标题',
    icon: Heading4,
    keywords: ['h4', 'heading 4', '标题 4'],
    category: '基础块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 4 }).run();
    },
  },

  // ── 列表 ──
  // G1615：官方「列表」组逐字五项、按此序：编号列表／待办列表／取消列表格式／无序列表／折叠列表。
  // 首项默认落 `numbered`（不是本地的 bullet）。
  {
    name: '编号列表',
    description: '编号列表',
    icon: ListOrdered,
    keywords: ['numbered', 'ordered', 'list', '列表', '编号'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    name: '待办列表',
    description: '可勾选的任务列表',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'checkbox', '待办', '任务', '清单'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    name: '取消列表格式',
    description: '把当前块恢复为普通文本',
    icon: ListX,
    keywords: ['clear list', 'remove list', '取消列表', '列表格式'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      if (editor.isActive('taskList')) editor.chain().focus().toggleTaskList().run();
      if (editor.isActive('toggleBlock')) editor.chain().focus().unsetToggleBlock().run();
      // 嵌套列表要逐层提出，`liftListItem` 一次只降一层。
      let guard = 0;
      while ((editor.isActive('bulletList') || editor.isActive('orderedList')) && guard < 10) {
        editor.chain().focus().liftListItem('listItem').run();
        guard += 1;
      }
    },
  },
  {
    name: '无序列表',
    description: '项目符号列表',
    icon: List,
    keywords: ['bullet', 'list', 'unordered', '列表', '无序'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    name: '折叠列表',
    description: '可展开/折叠的内容',
    icon: ChevronRight,
    keywords: ['toggle', 'collapse', 'fold', '折叠', '展开'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setToggleBlock().run();
    },
  },

  // ── 折叠操作（G1615：不属于「列表」组，官方列表组只有五项） ──
  {
    name: '全部展开',
    description: '展开文档中的全部折叠块',
    icon: UnfoldVertical,
    keywords: ['expand all', '全部展开', '展开所有折叠块'],
    category: '折叠操作',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).expandAllToggleBlocks().run();
    },
  },
  {
    name: '全部收起',
    description: '收起文档中的全部折叠块',
    icon: FoldVertical,
    keywords: ['collapse all', '全部收起', '收起所有折叠块'],
    category: '折叠操作',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).collapseAllToggleBlocks().run();
    },
  },

  // ── 高级块 ──
  {
    name: '引用',
    description: '引用文本块',
    icon: Quote,
    keywords: ['quote', 'blockquote', '引用'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    name: '代码块',
    description: '代码片段（支持语法高亮）',
    icon: Code,
    keywords: ['code', 'snippet', '代码', '代码块'],
    category: '高级块',
    command: (editor, range) => {
      // A fresh block takes the remembered defaults (G1166) rather than the node defaults.
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .toggleCodeBlock()
        .updateAttributes('codeBlock', {
          language: readDefaultLanguage(),
          themeId: readDefaultTheme(),
        })
        .run();
    },
  },
  {
    name: 'Mermaid 图表',
    description: '插入 Mermaid 图表',
    icon: Network,
    keywords: ['mermaid', 'diagram', 'chart', '图表', '流程图'],
    category: '高级块',
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'codeBlock',
          attrs: { language: 'mermaid', themeId: readDefaultTheme() },
          content: [{ type: 'text', text: 'graph TD\n  A[开始] --> B[结束]' }],
        })
        .run();
    },
  },
  {
    name: '表格',
    description: '插入表格',
    icon: Table,
    keywords: ['table', '表格'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    // G1596：官方斜线菜单含「提醒我…」，本地此前只在块 ⋯ 菜单里。
    name: '提醒我…',
    description: '为当前区块设置提醒',
    icon: AlertCircle,
    keywords: ['remind', 'reminder', '提醒', '提醒我'],
    category: '高级块',
    command: (_editor, range) => {
      _editor.chain().focus().deleteRange(range).run();
      useRemindRequestStore.getState().ask();
    },
  },
  {
    name: '插入分页符',
    description: '分页符',
    icon: Minus,
    keywords: ['page break', '分页符', '分页'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider('pageSeparator').run();
    },
  },
  {
    name: '分隔线 - 极细',
    description: '最细的水平分隔线',
    icon: Minus,
    keywords: ['divider', 'separator', 'hr', 'line', '分隔线', '分割线', '极细'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider('extraLight').run();
    },
  },
  {
    name: '分隔线 - 细',
    description: '细水平分隔线',
    icon: Minus,
    keywords: ['divider', 'separator', 'hr', 'line', '分隔线', '分割线', '细'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider('light').run();
    },
  },
  {
    name: '分隔线 - 常规',
    // 官方把四档各列为一条命令（G31），`---` 这档是默认档；输入速记只在默认档这条上提示，
    // 免得四条各挂一遍签名串把面板变成文档页。
    description: '水平分隔线（也可输入 --- / ..- / .-- / =-- 直接成档）',
    icon: Minus,
    keywords: ['divider', 'separator', 'hr', 'line', '分隔线', '分割线'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider('regular').run();
    },
  },
  {
    name: '分隔线 - 粗',
    description: '最重的水平分隔线',
    icon: Minus,
    keywords: ['divider', 'separator', 'hr', 'line', '分隔线', '分割线', '粗'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setDivider('strong').run();
    },
  },
  {
    name: '从模板插入',
    description: '选择一个模板并把它的内容插到当前位置',
    icon: LayoutTemplate,
    keywords: ['模板', 'template'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      useTemplatePickerStore.getState().openTemplatePicker({
        editor,
        at: { from: range.from, to: range.from },
      });
    },
  },

  // ── Callout ──
  {
    name: '信息提示',
    description: '蓝色信息 Callout',
    icon: Info,
    keywords: ['callout', 'info', 'alert', 'notice', '提示', '信息'],
    category: 'Callout',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'info' }).run();
    },
  },
  {
    name: '警告提示',
    description: '黄色警告 Callout',
    icon: AlertTriangle,
    keywords: ['callout', 'warning', 'warn', '警告', '提醒'],
    category: 'Callout',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'warning' }).run();
    },
  },
  {
    name: '错误提示',
    description: '红色错误 Callout',
    icon: AlertCircle,
    keywords: ['callout', 'error', 'danger', '错误', '危险'],
    category: 'Callout',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'error' }).run();
    },
  },
  {
    name: '成功提示',
    description: '绿色成功 Callout',
    icon: CheckCircle,
    keywords: ['callout', 'success', 'done', '成功', '完成'],
    category: 'Callout',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'success' }).run();
    },
  },
  {
    name: '备注',
    description: '紫色备注 Callout',
    icon: StickyNote,
    keywords: ['callout', 'note', '备注', '注释'],
    category: 'Callout',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCallout({ type: 'note' }).run();
    },
  },

  // ── 媒体 ──
  {
    name: 'AI 生成图像',
    description: '用 AI 生成一张图片插入文档',
    icon: Sparkles,
    keywords: ['ai', 'image gen', 'dalle', '生成', '绘图', 'ai 图像'],
    category: '媒体',
    command: (_editor, _range) => {
      requestImageGen();
    },
  },
  {
    name: '绘图',
    description: '插入一块可绘制图形与草图的画板',
    icon: PenLine,
    keywords: ['drawing', 'sketch', 'draw', '绘图', '画板', '草图', '手写'],
    category: '媒体',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertDrawing().run();
    },
  },
  {
    name: '图片',
    description: '上传图片或嵌入图片',
    icon: Image,
    keywords: ['image', 'photo', 'picture', '图片', '照片'],
    category: '媒体',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setImageBlock({}).run();
    },
  },
  {
    name: '文件附件',
    description: '上传文件附件',
    icon: FileText,
    keywords: ['file', 'attachment', 'upload', '文件', '附件'],
    category: '媒体',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        try {
          const { url } = await uploadFile(file);
          editor
            .chain()
            .focus()
            .setAttachment({ url, name: file.name, size: file.size })
            .run();
        } catch (err) {
          alert(err instanceof Error ? err.message : '上传失败');
        }
      };
      input.click();
    },
  },

  // ── 嵌入 ──
  {
    name: '图片网格',
    description: '多图自动布局的网格',
    icon: LayoutGrid,
    keywords: ['gallery', 'grid', '网格', '图库', '自动布局'],
    category: '媒体',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setImageGallery({}).run();
    },
  },
  {
    name: '网页链接',
    description: '生成富链接预览卡片',
    icon: Globe,
    keywords: ['link', 'preview', 'web', '链接', '网页', '书签'],
    category: '嵌入',
    command: async (editor, range) => {
      // ☆ 原来这句 `deleteRange` 没有 `.run()`，链根本没执行 ⇒ 斜杠文本留在正文里；
      //   弹层改成异步后更要先把 range 清掉，await 之后的选区才是干净的。
      editor.chain().focus().deleteRange(range).run();
      const url = await promptDialog({ title: '输入网页 URL', placeholder: 'https://…', confirmLabel: '插入' });
      if (url) {
        editor.chain().focus().setLinkPreview({ url }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    },
  },
  {
    name: '卡片',
    description: '圆角卡片容器，可容纳多个块',
    icon: CreditCard,
    keywords: ['card', '卡片', '容器'],
    category: '布局',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setCardBlock({}).run();
    },
  },
  {
    name: '@提及',
    description: '提及另一个文档',
    icon: AtSign,
    keywords: ['mention', 'link', '提及', '引用文档'],
    category: '嵌入',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setParagraph().run();
    },
  },
  {
    name: '目录',
    description: '列出文档标题，点击可跳转',
    icon: List,
    keywords: ['toc', 'table of contents', 'outline', '目录', '大纲'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertTableOfContents().run();
    },
  },
  {
    name: '分栏',
    description: '把内容并排分成两栏',
    icon: Columns2,
    keywords: ['columns', 'column', 'layout', '分栏', '栏', '两栏'],
    category: '布局',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertColumns(2).run();
    },
  },
  {
    name: '公式',
    description: '独立一行的 LaTeX 公式',
    icon: Sigma,
    keywords: ['math', 'latex', 'katex', 'formula', '公式', '数学'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setMathBlock({ latex: '' }).run();
    },
  },
  {
    name: '行内公式',
    description: '嵌在文字里的 LaTeX 公式',
    icon: Sigma,
    keywords: ['math', 'inline', 'latex', '行内公式', '公式'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setInlineMath({ latex: '' }).run();
    },
  },
  // G580：官方四类原子内联元素里的 `day` 与 `tag`——与 `行内公式`／`提及` 同类，Backspace
  // 落在它们内部时让位默认行为。
  {
    name: '日期',
    description: '插入指向某天每日笔记的日期',
    icon: CalendarDays,
    keywords: ['day', 'date', 'daily note', '日期', '每日笔记', '今天'],
    category: '嵌入',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).insertDayAtom().run();
    },
  },
  {
    name: '标签',
    description: '插入一枚标签，点击进入该标签',
    icon: Tag,
    keywords: ['tag', 'label', '标签', '话题'],
    category: '嵌入',
    command: async (editor, range) => {
      const name = await promptDialog({
        title: '标签',
        placeholder: '标签名，例如 项目/设计',
        confirmLabel: '插入',
      });
      const cleaned = normalizeTagAtomName(name);
      if (!cleaned) return;
      editor.chain().focus().deleteRange(range).run();
      // 已有同名标签就带上 id，点它才能落到那枚标签的浏览页。
      // 动态引入：这个模块被纯逻辑测试直接 import，静态引入会把 next-auth 一并拉进来。
      const tags = await import('@/actions/tag/tag')
        .then((mod) => mod.getTags())
        .catch(() => []);
      const existing = tags.find((tag) => tag.name === cleaned) ?? null;
      editor.chain().focus().insertTagAtom({ name: cleaned, tagId: existing?.id ?? null }).run();
    },
  },
  {
    name: '镜像块',
    description: '只读引用另一篇文档里的块',
    icon: Copy,
    keywords: ['mirror', 'copy', 'reference', '镜像', '引用', '同步'],
    category: '高级块',
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertMirrorBlock({ sourceDocumentId: null, title: null })
        .run();
    },
  },
  {
    name: '视频嵌入',
    description: '嵌入 YouTube / Vimeo 视频',
    icon: Video,
    keywords: ['video', 'youtube', 'vimeo', '视频', '嵌入'],
    category: '嵌入',
    command: async (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const src = await promptDialog({ title: '输入视频 URL', placeholder: 'https://…', confirmLabel: '嵌入' });
      if (src) {
        editor.chain().focus().setVideoEmbed({ src }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    },
  },
  {
    name: '音频',
    description: '嵌入一段音频',
    icon: Music,
    keywords: ['audio', 'music', '音频', '音乐'],
    category: '嵌入',
    command: async (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const src = await promptDialog({ title: '输入音频 URL', placeholder: 'https://…', confirmLabel: '嵌入' });
      if (src) {
        editor.chain().focus().setAudioEmbed({ src }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    },
  },
  {
    name: 'HTML 嵌入',
    description: '在沙箱里渲染一段 HTML',
    icon: Code,
    keywords: ['html', 'embed', 'HTML', '嵌入'],
    category: '嵌入',
    command: async (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const html = await promptDialog({ title: '输入 HTML', placeholder: '<div>…</div>', confirmLabel: '嵌入' });
      if (html) {
        editor.chain().focus().setHtmlEmbed({ html }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    },
  },
  {
    name: '网页嵌入',
    description: '用 iframe 嵌入一个网页',
    icon: Globe,
    keywords: ['embed', 'iframe', '网页', '嵌入'],
    category: '嵌入',
    command: async (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const src = await promptDialog({ title: '输入网页 URL', placeholder: 'https://…', confirmLabel: '嵌入' });
      if (src) {
        editor.chain().focus().setVideoEmbed({ src }).run();
      } else {
        editor.chain().focus().setParagraph().run();
      }
    },
  },
  {
    name: '白板',
    description: '在文档里嵌入一块可缩放的白板',
    icon: Presentation,
    keywords: ['whiteboard', 'board', 'canvas', '白板', '画布'],
    category: '嵌入',
    command: async (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      try {
        const board = (await createWhiteboard()) as {
          id: string;
          name: string;
          icon: string | null;
        };
        editor
          .chain()
          .focus()
          .setWhiteboardEmbed({ whiteboardId: board.id, title: board.name, icon: board.icon })
          .run();
      } catch (err) {
        alert(err instanceof Error ? err.message : '创建白板失败');
      }
    },
  },
  // G1614：官方三条「插入集合」——建出的都是同一个集合对象，只是初始视图不同。
  {
    name: '插入表格集合',
    description: '新建一个表格视图的集合',
    icon: Table,
    keywords: ['collection', 'table', '集合', '表格集合'],
    category: '嵌入',
    command: async (editor, range) => {
      await insertCollectionBlock(editor, range, 'table');
    },
  },
  {
    name: '插入画廊集合',
    description: '新建一个画廊视图的集合',
    icon: Image,
    keywords: ['collection', 'gallery', '集合', '画廊集合'],
    category: '嵌入',
    command: async (editor, range) => {
      await insertCollectionBlock(editor, range, 'gallery');
    },
  },
  {
    name: '插入看板集合',
    description: '新建一个看板视图的集合',
    icon: LayoutGrid,
    keywords: ['collection', 'kanban', '集合', '看板集合'],
    category: '嵌入',
    command: async (editor, range) => {
      await insertCollectionBlock(editor, range, 'kanban');
    },
  },
  {
    name: '设定截止日期',
    description: '设定任务块的截止日期',
    icon: Flag,
    keywords: ['deadline', 'due', '截止', '截止日期'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      useTaskDateMenuStore.getState().open('deadline');
    },
  },
  {
    name: '计划任务',
    description: '给任务块安排一个计划日期',
    icon: CalendarDays,
    keywords: ['schedule', 'plan', '计划', '计划任务', '排期'],
    category: '高级块',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      useTaskDateMenuStore.getState().open('schedule');
    },
  },
];

/**
 * G1616 —— 斜杠菜单的「对齐」组：官方过滤「对齐」回**四项**（居中对齐／两端对齐／右对齐／左对齐）。
 * 本地这四档能力本就在（`ALIGNMENT_CONTROLS`，右侧格式面板用），只是斜杠菜单没有入口 ⇒ 这里从
 * 那张表派生，避免两份名册各写一遍。★ 官方回的是 4 项，「默认」第五档不在斜杠组里，故只取有
 * `value` 的四档。对齐是**属性**不是块型——按 Enter 后块型仍是段落。
 */
const ALIGN_SLASH_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

for (const control of ALIGNMENT_CONTROLS) {
  if (control.value === null) continue;
  slashCommands.push({
    name: control.label,
    description: `将当前块${control.label}`,
    icon: ALIGN_SLASH_ICONS[control.value] ?? AlignLeft,
    // 官方那四项的名字都要能被「对齐」这一个词筛出来。
    keywords: ['align', 'alignment', '对齐', control.label],
    category: '对齐',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).setTextAlign(control.value!).run();
    },
  });
}

/**
 * G1617 —— `/颜色` 在官方回**一项**「默认颜色」（`style.color.default`），是"单档占位项"：
 * 它就是清掉文字颜色的那一档。本地颜色只在右侧格式面板的色板里，斜杠菜单没有入口 ⇒ 补这一项。
 * 过滤词「颜色」要能筛到它，故 keywords 含「颜色」。
 */
slashCommands.push({
  name: '默认颜色',
  description: '清除文字颜色，恢复默认',
  icon: Palette,
  keywords: ['color', 'default', '颜色', '默认颜色', '清除颜色'],
  category: '颜色',
  command: (editor, range) => {
    editor.chain().focus().deleteRange(range).unsetColor().run();
  },
});

/**
 * G336：快捷面板里 `12x3` 这种输入本身就是一条候选。只在真解析成尺寸时多给这一条，
 * 官方抑制的那些（≤9 的正方形、任一边为 0）在解析层就回 `null`，这里自然什么都不加。
 *
 * 标签逐字照官方构造器 `H3(t,e)` 的 `label: \`${t}x${e}\``（bundle `index-DiTmKH3z.js`）；
 * `description` 官方节点没有，这里填静态表格命令同一句「插入表格」。
 */
function tableShortcutCommand(size: TableShortcutSize): SlashCommand {
  return {
    name: `${size.rows}x${size.cols}`,
    description: '插入表格',
    icon: Table,
    keywords: ['表格', 'table'],
    category: '高级块',
    command: (editor, range) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: size.rows, cols: size.cols, withHeaderRow: true })
        .run();
    },
  };
}

export function filterCommands(query: string): SlashCommand[] {
  const lowerQuery = query.toLowerCase().trim();

  const matched = lowerQuery
    ? slashCommands.filter(
        (cmd) =>
          cmd.name.toLowerCase().includes(lowerQuery) ||
          cmd.description.toLowerCase().includes(lowerQuery) ||
          cmd.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
      )
    : slashCommands;

  const size = parseTableShortcut(query);
  if (!size) return matched;
  return [tableShortcutCommand(size), ...matched];
}

export function getCommandCategories(): string[] {
  const categories = new Set<string>();
  slashCommands.forEach((cmd) => categories.add(cmd.category));
  return Array.from(categories);
}

/**
 * G1614：三条「插入集合」共用的一条通路——先建集合对象（初始视图按档），再在正文里
 * 落一枚指回它的 collection 块。建失败时与白板那枚一样给一句提示，不静默吞掉。
 */
async function insertCollectionBlock(
  editor: Editor,
  range: { from: number; to: number },
  view: CollectionEmbedView,
) {
  editor.chain().focus().deleteRange(range).run();
  try {
    const name = `${COLLECTION_EMBED_LABELS[view]}集合`;
    const created = await createCollection({ name, viewType: view });
    editor
      .chain()
      .focus()
      .setCollectionBlock({ collectionId: created.id, title: created.name, view })
      .run();
  } catch (err) {
    alert(err instanceof Error ? err.message : '创建集合失败');
  }
}
