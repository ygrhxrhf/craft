import { describe, expect, it } from 'vitest';
import * as Y from 'yjs';

import { isEffectivelyEmptyFragment } from './empty-fragment';

function paragraph(children: Array<Y.XmlElement | Y.XmlText> = [], attrs: Record<string, string> = {}): Y.XmlElement {
  const element = new Y.XmlElement('paragraph');
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  for (const child of children) element.insert(0, [child]);
  return element;
}

describe('播种守卫的空房间判据', () => {
  it('treats a zero-block room as empty', () => {
    const doc = new Y.Doc();
    expect(isEffectivelyEmptyFragment(doc.getXmlFragment('default'))).toBe(true);
  });

  it('treats the single empty paragraph y-sync writes on bind as empty', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    fragment.insert(0, [paragraph()]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(true);
  });

  it('still counts an empty paragraph that carries default attributes as empty', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    fragment.insert(0, [paragraph([], { blockId: 'abc', indent: '0' })]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(true);
  });

  it('counts a paragraph with text as a body', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    fragment.insert(0, [paragraph([new Y.XmlText('正文')])]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(false);
  });

  it('counts a single heading (or other block type) as a body', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    const heading = new Y.XmlElement('heading');
    fragment.insert(0, [heading]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(false);
  });

  it('still counts a run of blank scaffold paragraphs (incl. the trailing one) as empty', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    fragment.insert(0, [paragraph(), paragraph()]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(true);
  });

  it('counts a mixed run as a body as soon as one block is not a blank paragraph', () => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment('default');
    fragment.insert(0, [paragraph(), paragraph([new Y.XmlText('正文')])]);
    expect(isEffectivelyEmptyFragment(fragment)).toBe(false);
  });
});