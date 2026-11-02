/**
 * G626 —— 信息面板顶部的「目录」分区。官方空态文案是引导句，不是隐藏分区：
 * 「使用标题、页面或卡片创建目录。」
 *
 * 本地把标题（以及带标题的子页面卡片）当目录项；条目携带文档内位置，点按可跳过去。
 */

export const TOC_TITLE = '目录';
export const TOC_EMPTY_COPY = '使用标题、页面或卡片创建目录。';

export interface TocEntry {
  level: number;
  text: string;
  /** 块在文档里的起始位置（用于点击跳转）。 */
  pos: number;
}

interface ProseMirrorNodeLike {
  type: { name: string };
  attrs?: Record<string, unknown>;
  textContent?: string;
  nodeSize: number;
  childCount: number;
  child: (index: number) => ProseMirrorNodeLike;
}

/** 把文档里所有标题按出现顺序收成目录；没有标题返回空数组（由调用方给空态引导句）。 */
export function extractToc(doc: ProseMirrorNodeLike | null | undefined): TocEntry[] {
  const entries: TocEntry[] = [];
  if (!doc) return entries;

  const walk = (node: ProseMirrorNodeLike, offset: number) => {
    if (node.type.name === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const text = (node.textContent ?? '').trim();
      if (text) entries.push({ level, text, pos: offset });
    }
    let childOffset = offset + 1;
    for (let index = 0; index < node.childCount; index += 1) {
      const child = node.child(index);
      walk(child, childOffset);
      childOffset += child.nodeSize;
    }
  };

  walk(doc, 0);
  return entries;
}
