/**
 * G70：Idea Starter。文案逐字取自 `feature-catalog.md` 的 `ideastarter.*`（popup / suggestion /
 * loading / toast 四组）；六种建议类型各有四条专属进度句，外加 default 四句。
 */
import type { PmNode } from '@/lib/import/markdown';

export const IDEA_STARTER = {
  title: '你想从什么开始？',
  subtitle: '我们知道空白页面让人无从下手。描述你的需求，我们来帮你搭建结构。',
  placeholder: '描述你想创建的内容…',
  create: '创建',
  close: '关闭',
  success: '文档已创建！',
  errorTitle: '无法创建文档',
  errorSubtitle: '请重试',
} as const;

export type IdeaType = 'guide' | 'list' | 'meeting' | 'project' | 'travel' | 'weekly';

export interface IdeaSuggestion {
  id: IdeaType;
  label: string;
}

export const IDEA_SUGGESTIONS: readonly IdeaSuggestion[] = [
  { id: 'guide', label: '博客文章' },
  { id: 'list', label: '任务清单' },
  { id: 'meeting', label: '会议记录' },
  { id: 'project', label: '项目文档' },
  { id: 'travel', label: '旅行计划' },
  { id: 'weekly', label: '头脑风暴' },
];

export const IDEA_DEFAULT_PROGRESS = [
  '正在创建文档…',
  '正在创建结构…',
  '正在添加引导部分…',
  '正在准备模板…',
] as const;

export const IDEA_PROGRESS: Record<IdeaType, readonly string[]> = {
  guide: ['正在规划内容…', '正在添加关键部分…', '正在构建叙事结构…', '正在创建框架…'],
  list: ['正在整理任务…', '正在创建待办事项…', '正在添加优先级部分…', '正在创建清单…'],
  meeting: ['正在创建议程…', '正在添加讨论部分…', '正在整理行动事项…', '正在准备模板…'],
  project: ['正在创建行动计划…', '正在规划关键里程碑…', '正在添加引导部分…', '正在制定路线图…'],
  travel: ['正在规划行程…', '正在添加目的地部分…', '正在创建行李清单…', '正在规划旅程…'],
  weekly: ['正在捕捉灵感…', '正在创建思考空间…', '正在整理头脑风暴…', '正在创建灵感画布…'],
};

export function ideaProgressFor(type: IdeaType | null): readonly string[] {
  return (type && IDEA_PROGRESS[type]) || IDEA_DEFAULT_PROGRESS;
}

/** The four sentences are a carousel, so the run has a floor: 420ms per step (G70). */
export const IDEA_PROGRESS_STEP_MS = 420;

export function ideaProgressRunMs(sentences: number): number {
  return Math.max(0, sentences - 1) * IDEA_PROGRESS_STEP_MS;
}

/**
 * G349: the loading title has two states — `ideastarter.loading.title.default`「正在创建文档」and
 * `loading.title.type`「正在创建[0]」where `[0]` is the type name. A type that was not recognised
 * (or never picked) keeps the default sentence.
 */
export const IDEA_LOADING_TITLE = {
  default: '正在创建文档',
  type: '正在创建[0]',
} as const;

export function ideaLoadingTitle(type: IdeaType | null): string {
  if (!type) return IDEA_LOADING_TITLE.default;
  const label = IDEA_SUGGESTIONS.find((item) => item.id === type)?.label;
  if (!label) return IDEA_LOADING_TITLE.default;
  return IDEA_LOADING_TITLE.type.replace('[0]', label);
}

/** 官方那枚隐形的 `default` 类型：没有结构，只有描述本身（空白页识别不出类型时走这里）。 */
export type IdeaKind = IdeaType | 'default';

export function ideaKind(type: IdeaType | null): IdeaKind {
  return type ?? 'default';
}

/**
 * G349: what counts as a blank page — the only document the official popup opens on. Any non-space
 * text, or an atomic block (image, table, collection…), makes the page not blank.
 */
export function isBlankDocumentContent(content: unknown): boolean {
  const nodes = Array.isArray(content) ? content : [(content ?? {}) as Record<string, unknown>];
  const stack = [...nodes];
  while (stack.length) {
    const node = stack.pop() as Record<string, unknown>;
    if (typeof node.text === 'string' && node.text.trim()) return false;
    if (typeof node.type === 'string' && node.type !== 'doc' && node.type !== 'text') {
      // Atomic leaves (image/table/collection/whiteboard…) are content even with no text.
      const children = Array.isArray(node.content) ? node.content : [];
      if (children.length === 0 && !['paragraph', 'text', 'bulletList', 'orderedList', 'listItem', 'taskList', 'taskItem', 'heading'].includes(node.type)) {
        return false;
      }
    }
    if (Array.isArray(node.content)) stack.push(...(node.content as Record<string, unknown>[]));
  }
  return true;
}

const heading = (level: number, text: string): PmNode => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

const paragraph = (text: string): PmNode => ({
  type: 'paragraph',
  content: text ? [{ type: 'text', text }] : undefined,
});

const bulletList = (items: string[]): PmNode => ({
  type: 'bulletList',
  content: items.map((text) => ({
    type: 'listItem',
    content: [paragraph(text)],
  })),
});

/** 每种类型落成一棵可编辑的骨架；描述非空时作为开头的引导段。 */
export function ideaSkeleton(type: IdeaType | null, description: string): PmNode {
  const intro = description.trim();
  const lead = intro ? [paragraph(intro)] : [];

  const bodies: Record<IdeaType, PmNode[]> = {
    guide: [
      heading(2, '引言'),
      paragraph(''),
      heading(2, '关键要点'),
      bulletList(['要点一', '要点二', '要点三']),
      heading(2, '结语'),
      paragraph(''),
    ],
    list: [
      heading(2, '待办事项'),
      bulletList(['第一项', '第二项', '第三项']),
      heading(2, '优先级'),
      paragraph(''),
    ],
    meeting: [
      heading(2, '议程'),
      bulletList(['议题一', '议题二']),
      heading(2, '讨论'),
      paragraph(''),
      heading(2, '行动事项'),
      bulletList(['跟进一', '跟进二']),
    ],
    project: [
      heading(2, '目标'),
      paragraph(''),
      heading(2, '里程碑'),
      bulletList(['里程碑一', '里程碑二']),
      heading(2, '风险'),
      paragraph(''),
    ],
    travel: [
      heading(2, '行程'),
      paragraph(''),
      heading(2, '目的地'),
      bulletList(['目的地一', '目的地二']),
      heading(2, '行李清单'),
      bulletList(['证件', '衣物', '充电器']),
    ],
    weekly: [
      heading(2, '想法'),
      bulletList(['想法一', '想法二', '想法三']),
      heading(2, '主题'),
      paragraph(''),
      heading(2, '下一步'),
      paragraph(''),
    ],
  };

  const body = type ? bodies[type] : [];
  const content = [...lead, ...body];
  return { type: 'doc', content: content.length ? content : [paragraph('')] };
}

export function ideaTitle(type: IdeaType | null, description: string): string {
  const typed = description.trim().slice(0, 60);
  if (typed) return typed;
  return (type && IDEA_SUGGESTIONS.find((item) => item.id === type)?.label) ?? '无标题';
}
