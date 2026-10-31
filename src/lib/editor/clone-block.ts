import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * G573: a duplicated block must not reuse the original's `blockId` — two blocks with one id
 * make deep links ambiguous and let the anchor library point at the wrong one. Every node in
 * the copy that carries an id gets a fresh one; everything else is preserved verbatim.
 */
export function cloneWithFreshBlockIds(node: PMNode): PMNode {
  const attrs =
    node.attrs && typeof node.attrs.blockId === 'string' && node.attrs.blockId
      ? { ...node.attrs, blockId: crypto.randomUUID() }
      : node.attrs;

  // Text nodes cannot be rebuilt through `type.create`, and they carry no id anyway.
  if (node.isText) return node;
  if (node.isLeaf || node.childCount === 0) {
    return node.type.create(attrs, null, node.marks);
  }

  const children: PMNode[] = [];
  node.forEach((child) => children.push(cloneWithFreshBlockIds(child)));
  return node.type.create(attrs, children, node.marks);
}
