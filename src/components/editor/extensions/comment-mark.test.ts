import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { Transform } from '@tiptap/pm/transform';
import { commentMarkRanges } from './comment-mark';

// 无 DOM：与 comment-mark 扩展同名的 mark 类型足以驱动 getMarksBetween 的 attrs 匹配。
const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', group: 'block' },
    text: {},
  },
  marks: {
    commentMark: { attrs: { threadId: { default: null } }, inclusive: false },
  },
});

function docOf(segments: { text: string; threadId?: string }[]) {
  const paragraph = schema.nodes.paragraph.create(
    null,
    segments.map(({ text, threadId }) =>
      schema.text(text, threadId ? [schema.marks.commentMark.create({ threadId })] : []),
    ),
  );
  return schema.nodes.doc.create(null, paragraph);
}

function removeThread(doc: ReturnType<typeof docOf>, threadId: string) {
  const transform = new Transform(doc);
  for (const { from, to, mark } of commentMarkRanges(doc, threadId)) {
    transform.removeMark(from, to, mark);
  }
  return transform.doc;
}

function threadsOf(doc: ReturnType<typeof docOf>) {
  const out: string[] = [];
  doc.descendants((node) => {
    for (const mark of node.marks) {
      if (mark.type.name === 'commentMark') out.push(mark.attrs.threadId as string);
    }
  });
  return out;
}

describe('commentMarkRanges', () => {
  it('只找出指定线程的标记范围', () => {
    const doc = docOf([
      { text: '甲', threadId: 'T1' },
      { text: '乙' },
      { text: '丙', threadId: 'T2' },
    ]);
    expect(commentMarkRanges(doc, 'T1')).toHaveLength(1);
    expect(commentMarkRanges(doc, 'T2')).toHaveLength(1);
    expect(commentMarkRanges(doc, 'T3')).toEqual([]);
  });

  it('摘掉线程标记后正文不变，其它线程标记仍在', () => {
    const doc = docOf([
      { text: '甲', threadId: 'T1' },
      { text: '乙' },
      { text: '丙', threadId: 'T2' },
    ]);
    const next = removeThread(doc, 'T1');
    expect(next.textContent).toBe('甲乙丙');
    expect(threadsOf(next)).toEqual(['T2']);
  });

  it('同一线程跨多段时全部摘掉', () => {
    const doc = schema.nodes.doc.create(null, [
      schema.nodes.paragraph.create(
        null,
        schema.text('一', [schema.marks.commentMark.create({ threadId: 'T1' })]),
      ),
      schema.nodes.paragraph.create(
        null,
        schema.text('二', [schema.marks.commentMark.create({ threadId: 'T1' })]),
      ),
    ]);
    expect(commentMarkRanges(doc, 'T1')).toHaveLength(2);
    expect(threadsOf(removeThread(doc, 'T1'))).toEqual([]);
  });
});
