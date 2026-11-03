import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  IDEA_PROGRESS,
  IDEA_STARTER,
  IDEA_SUGGESTIONS,
  ideaProgressFor,
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
