import * as Y from 'yjs';

/**
 * 播种守卫：y-sync 绑定编辑器时会把**脚手架段落**写进房间（初始空段，可能还带一枚
 * trailing 空段），于是新导入（或任何只有 `Document.content`、房间还没播种）的文档
 * 从第一帧起就不是 `length === 0`。只看长度会把「还没播种」误判成「已有正文」：
 * 播种整条跳过，空脚手架镜像再回写覆盖导入内容。
 *
 * 判据：**每个子节点都是没有子节点的段落**（属性一律不看——blockId 一类默认属性会挂上）。
 * 只要有一块带文字、标题、列表等，就算有正文。
 */
export function isEffectivelyEmptyFragment(fragment: Y.XmlFragment): boolean {
  if (fragment.length === 0) return true;
  for (let index = 0; index < fragment.length; index += 1) {
    const child = fragment.get(index);
    const blankParagraph = child instanceof Y.XmlElement && child.nodeName === 'paragraph' && child.length === 0;
    if (!blankParagraph) return false;
  }
  return true;
}