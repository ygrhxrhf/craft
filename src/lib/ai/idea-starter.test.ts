import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  IDEA_LOADING_TITLE,
  IDEA_PROGRESS,
  IDEA_PROGRESS_STEP_MS,
  IDEA_STARTER,
  IDEA_SUGGESTIONS,
  ideaKind,
  ideaLoadingTitle,
  ideaProgressFor,
  ideaProgressRunMs,
  isBlankDocumentContent,
  ideaSkeleton,
  ideaTitle,
} from './idea-starter';

const flat = (node: ReturnType<typeof ideaSkeleton>) =>
  (node.content ?? []).map((block) => block.content?.map((child) => child.text ?? '').join('') ?? '');

/** G70：六种建议类型各有四条进度句，文案逐字取自 `ideastarter.*`。 */
describe('the Idea Starter copy (G70)', () => {
  it('keeps the five popup strings', () => {
    expect(IDEA_STARTER).toEqual({
      title: '你想从什么开始？',
      subtitle: '我们知道空白页面让人无从下手。描述你的需求，我们来帮你搭建结构。',
      placeholder: '描述你想创建的内容…',
      create: '创建',
      close: '关闭',
      success: '文档已创建！',
      errorTitle: '无法创建文档',
      errorSubtitle: '请重试',
    });
  });

  it('lists the six suggestion types', () => {
    expect(IDEA_SUGGESTIONS.map((item) => item.label)).toEqual([
      '博客文章', '任务清单', '会议记录', '项目文档', '旅行计划', '头脑风暴',
    ]);
  });

  it('gives every type its own four progress sentences', () => {
    for (const suggestion of IDEA_SUGGESTIONS) {
      const lines = IDEA_PROGRESS[suggestion.id];
      expect(lines, suggestion.id).toHaveLength(4);
      expect(new Set(lines).size, suggestion.id).toBe(4);
    }
    expect(ideaProgressFor('travel')[0]).toBe('正在规划行程…');
    expect(ideaProgressFor('meeting')[2]).toBe('正在整理行动事项…');
  });

  it('builds a type-specific skeleton and keeps the description as the lead paragraph', () => {
    const meeting = ideaSkeleton('meeting', '周会记录');
    expect(flat(meeting).slice(0, 3)).toEqual(['周会记录', '议程', '']);
    expect(flat(meeting)).toContain('行动事项');
    expect(flat(ideaSkeleton('travel', ''))).toContain('行李清单');
    expect(flat(ideaSkeleton('weekly', ''))).toContain('想法');
  });

  it('titles the document from the description, falling back to the type label', () => {
    expect(ideaTitle('guide', '  我的博客  ')).toBe('我的博客');
    expect(ideaTitle('project', '')).toBe('项目文档');
  });

  it('is mounted on the documents screen and backed by a server action', () => {
    const quick = readFileSync(new URL('../../components/document/QuickActions.tsx', import.meta.url), 'utf8');
    expect(quick).toContain('<IdeaStarterDialog');
    const action = readFileSync(new URL('../../actions/ai/idea-starter.ts', import.meta.url), 'utf8');
    expect(action).toContain('serializeDocument(content, \'text\')');
    expect(action).toContain('emitSyncEventSafe');
  });
});

/**
 * G349：空白页那一份弹层是独立的——标题两态（认不出类型保持「正在创建文档」）、七类文档
 * （六种建议 + 隐形的 default），并且生成结果写进**当前这篇**文档。
 */
describe('the blank-page popup (G349)', () => {
  it('switches the loading title between its two states', () => {
    expect(IDEA_LOADING_TITLE).toEqual({ default: '正在创建文档', type: '正在创建[0]' });
    expect(ideaLoadingTitle(null)).toBe('正在创建文档');
    expect(ideaLoadingTitle('list')).toBe('正在创建任务清单');
    expect(ideaLoadingTitle('travel')).toBe('正在创建旅行计划');
  });

  it('keeps the invisible default kind for a type nobody picked', () => {
    expect(ideaKind(null)).toBe('default');
    expect(ideaKind('guide')).toBe('guide');
    expect(ideaProgressFor(null)).toEqual([
      '正在创建文档…',
      '正在创建结构…',
      '正在添加引导部分…',
      '正在准备模板…',
    ]);
    // The default kind invents no sections — only what the user described.
    expect(flat(ideaSkeleton(null, '周三下午两点')).length).toBe(1);
    expect(flat(ideaSkeleton(null, ''))[0]).toBe('');
  });

  it('calls a page blank only when there is nothing on it', () => {
    const doc = (content: unknown[]) => ({ type: 'doc', content });
    expect(isBlankDocumentContent(doc([{ type: 'paragraph' }]))).toBe(true);
    expect(isBlankDocumentContent(doc([{ type: 'paragraph', content: [{ text: '  ' }] }]))).toBe(true);
    expect(isBlankDocumentContent(doc([{ type: 'paragraph', content: [{ text: '正文' }] }]))).toBe(false);
    expect(isBlankDocumentContent(doc([{ type: 'imageBlock', attrs: { src: 'x' } }]))).toBe(false);
    expect(isBlankDocumentContent(doc([]))).toBe(true);
  });

  it('gives the carousel a floor the local instant path still honours', () => {
    // 四句轮播＝三段间隔；空白页这一路本地生成是即时的，靠这个时长让进度真看得见。
    expect(ideaProgressRunMs(4)).toBe(3 * IDEA_PROGRESS_STEP_MS);
    expect(ideaProgressRunMs(1)).toBe(0);
    const dialog = readFileSync(
      new URL('../../components/ai/IdeaStarterDialog.tsx', import.meta.url),
      'utf8',
    );
    expect(dialog).toContain('ideaProgressRunMs(progress.length)');
  });

  it('opens itself on a blank page and writes into that page', () => {
    const shell = readFileSync(
      new URL('../../components/editor/DocumentEditor.tsx', import.meta.url),
      'utf8',
    );
    expect(shell).toContain('isBlankDocumentContent(doc.content)');
    expect(shell).toContain('onApply={applyIdeaPlan}');
    expect(shell).toContain('setContent(content as JSONContent)');
    // The popup waits for the editor, so 创建 can't be pressed against a null editor.
    expect(shell).toContain('if (!editor) return;');
    expect(shell).toContain('{editor && (');
    const dialog = readFileSync(
      new URL('../../components/ai/IdeaStarterDialog.tsx', import.meta.url),
      'utf8',
    );
    expect(dialog).toContain('busy ? ideaLoadingTitle(type) : IDEA_STARTER.title');
    expect(dialog).toContain('ideaSkeleton(type, description)');
  });
});
