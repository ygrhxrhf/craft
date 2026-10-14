import { describe, expect, it } from 'vitest';

import { PATH_SEPARATOR, ancestryPath, locationPathLabel, pathLabel } from './location-path';

/**
 * The 「位置」 breadcrumb (G203): the document's ancestry, root first, emoji and name joined by
 * ` / `.
 */
const node = (id: string, title: string, parentId: string | null, icon: string | null = null) => ({
  id,
  title,
  parentId,
  icon,
});

describe('the ancestry chain', () => {
  const tree = [
    node('root', 'How to use Craft', null, '👋'),
    node('mid', '中继', 'root'),
    node('doc', '当前文档', 'mid'),
  ];

  it('walks up root-first, excluding the document itself', () => {
    expect(ancestryPath(tree, 'doc').map((n) => n.id)).toEqual(['root', 'mid']);
  });

  it('is empty for a document at the root', () => {
    expect(ancestryPath(tree, 'root')).toEqual([]);
  });

  it('stops at a dangling parent rather than failing', () => {
    expect(ancestryPath([node('doc', 'x', 'missing')], 'doc')).toEqual([]);
  });

  it('stops at a cycle rather than looping', () => {
    const cyclic = [node('a', 'A', 'b'), node('b', 'B', 'a')];
    expect(ancestryPath(cyclic, 'a').map((n) => n.id)).toEqual(['b']);
  });
});

describe('the labels', () => {
  it('prefixes the emoji when there is one', () => {
    expect(pathLabel(node('r', 'How to use Craft', null, '👋'))).toBe('👋 How to use Craft');
    expect(pathLabel(node('r', '无图标', null))).toBe('无图标');
  });

  it('falls back to the list wording for an empty name', () => {
    expect(pathLabel(node('r', '', null))).toBe('无标题文档');
  });

  it('joins the chain with the collected separator', () => {
    const tree = [
      node('root', 'How to use Craft', null, '👋'),
      node('mid', '中继', 'root'),
      node('doc', '当前文档', 'mid'),
    ];
    expect(locationPathLabel(tree, 'doc')).toBe(`👋 How to use Craft${PATH_SEPARATOR}中继`);
  });

  it('says 未分类 when the document belongs to nothing', () => {
    expect(locationPathLabel([node('root', 'R', null)], 'root')).toBe('未分类');
  });

  it('names the folder when the document has no ancestors', () => {
    const docs = [{ id: 'doc', title: 'D', icon: null, parentId: null, folderId: 'f1' }];
    const folders = [{ id: 'f1', name: '工作', icon: '💼' }];
    expect(locationPathLabel(docs, 'doc', folders)).toBe('💼 工作');
    expect(locationPathLabel(docs, 'doc', [{ id: 'f1', name: '无图标夹', icon: null }])).toBe('无图标夹');
  });

  it('falls back to 未分类 when the folder id points at nothing', () => {
    const docs = [{ id: 'doc', title: 'D', icon: null, parentId: null, folderId: 'gone' }];
    expect(locationPathLabel(docs, 'doc', [])).toBe('未分类');
  });

  it('prefers the ancestor chain over the folder', () => {
    const docs = [
      node('root', '根页', null, '👋'),
      { id: 'doc', title: 'D', icon: null, parentId: 'root', folderId: 'f1' },
    ];
    expect(locationPathLabel(docs, 'doc', [{ id: 'f1', name: '工作', icon: null }])).toBe('👋 根页');
  });
});
