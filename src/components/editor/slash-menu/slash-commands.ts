import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
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
  Globe,
  Sparkles,
  PenLine,
  Sigma,
  Video,
  Presentation,
  Network,
  Music,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import type { ComponentType } from 'react';
import { readDefaultLanguage, readDefaultTheme } from '@/lib/editor/code-preferences';
import { promptDialog } from '@/lib/dialog/show';
import { uploadFile } from '@/lib/upload-client';
import { createWhiteboard } from '@/actions/whiteboard/whiteboard';
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
    name: '有序列表',
    description: '编号列表',
    icon: ListOrdered,
    keywords: ['numbered', 'ordered', 'list', '有序', '编号'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    name: '待办事项',
    description: '可勾选的任务列表',
    icon: CheckSquare,
    keywords: ['todo', 'task', 'checkbox', '待办', '任务', '清单'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
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
  {
    name: '全部展开',
    description: '展开文档中的全部折叠块',
    icon: UnfoldVertical,
    keywords: ['expand all', '全部展开', '展开所有折叠块'],
    category: '列表',
    command: (editor, range) => {
      editor.chain().focus().deleteRange(range).expandAllToggleBlocks().run();
    },
  },
  {
    name: '全部收起',
    description: '收起文档中的全部折叠块',
    icon: FoldVertical,
    keywords: ['collapse all', '全部收起', '收起所有折叠块'],
    category: '列表',
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
];

export function filterCommands(query: string): SlashCommand[] {
  const lowerQuery = query.toLowerCase().trim();

  if (!lowerQuery) return slashCommands;

  return slashCommands.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.description.toLowerCase().includes(lowerQuery) ||
      cmd.keywords.some((kw) => kw.toLowerCase().includes(lowerQuery))
  );
}

export function getCommandCategories(): string[] {
  const categories = new Set<string>();
  slashCommands.forEach((cmd) => categories.add(cmd.category));
  return Array.from(categories);
}
