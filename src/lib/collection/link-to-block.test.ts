import { describe, expect, it } from 'vitest';

import {
  hitLabel,
  linkToBlockValue,
  parseLinkToBlock,
  serializeLinkToBlock,
} from './link-to-block';

/** G453：集合 `linkToBlock` 落库是 `{name, url}` 快照，不是 blockId。 */
describe('the linkToBlock cell snapshot (G453)', () => {
  it('stores exactly the two official fields', () => {
    const value = linkToBlockValue('第一段', '/documents/d1#b-b1');
    expect(value).toEqual({ name: '第一段', url: '/documents/d1#b-b1' });
    expect(Object.keys(serializeLinkToBlock(value!))).toBeDefined();
    expect(JSON.parse(serializeLinkToBlock(value!))).toEqual({
      name: '第一段',
      url: '/documents/d1#b-b1',
    });
  });

  it('refuses a nameless or addressless snapshot', () => {
    expect(linkToBlockValue('   ', '/documents/d1')).toBeNull();
    expect(linkToBlockValue('x', '')).toBeNull();
  });

  it('reads back the stored JSON', () => {
    expect(parseLinkToBlock('{"name":"A","url":"/documents/d1"}')).toEqual({
      name: 'A',
      url: '/documents/d1',
    });
    expect(parseLinkToBlock({ name: 'B', url: '/documents/d2' })).toEqual({
      name: 'B',
      url: '/documents/d2',
    });
  });

  it('treats a legacy bare string or garbage as "no snapshot"', () => {
    // 老数据里这一列存的是裸文本引用，读不出 name/url 两格就按"没有快照"处理。
    expect(parseLinkToBlock('旧文本引用')).toBeNull();
    expect(parseLinkToBlock('{"name":"A"')).toBeNull();
    expect(parseLinkToBlock('{"name":"","url":"/x"}')).toBeNull();
    expect(parseLinkToBlock(null)).toBeNull();
  });

  it('is a snapshot, not a live reference: the url it keeps is the one captured', () => {
    const stored = serializeLinkToBlock({ name: '当时的名字', url: '/documents/d1#b-b1' });
    // 之后文档改名/移动，这条 url 与 name 都不会跟着变——这正是官方 `{name,url}` 的语义。
    expect(parseLinkToBlock(stored)).toEqual({ name: '当时的名字', url: '/documents/d1#b-b1' });
  });

  it('labels a picker row, with a placeholder for an empty block', () => {
    expect(hitLabel('  短文本 ')).toBe('短文本');
    expect(hitLabel('')).toBe('（空块）');
    expect(hitLabel('x'.repeat(50))).toHaveLength(41); // 40 字 + 省略号
  });
});
