import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { TOUCH_DRAG_CANCEL_DISTANCE, touchDragCancelled } from './touch-drag';

describe('G56 触摸拖拽', () => {
  it('越过 8px 视为滚动、撤销长按；边界之内仍算长按', () => {
    expect(TOUCH_DRAG_CANCEL_DISTANCE).toBe(8);
    expect(touchDragCancelled({ x: 0, y: 0 }, { x: 8, y: 0 })).toBe(false);
    expect(touchDragCancelled({ x: 0, y: 0 }, { x: 0, y: 8 })).toBe(false);
    expect(touchDragCancelled({ x: 0, y: 0 }, { x: 6, y: 6 })).toBe(true);
    expect(touchDragCancelled({ x: 0, y: 0 }, { x: 9, y: 0 })).toBe(true);
  });

  it('两侧入口都接在同一条触摸通路上', () => {
    const hook = readFileSync('src/lib/dnd/use-drag-arm.ts', 'utf8');
    // 触摸减是后端选择器给的，不是各组件自己判 pointerType。
    expect(hook).toContain("dragBackendFor(e.pointerType) !== 'touch'");
    expect(hook).toContain('beginTouchDrag(el, origin)');
    expect(hook).toContain('touchDragCancelled');

    for (const file of [
      'src/components/sidebar/DocumentTreeItem.tsx',
      'src/components/sidebar/FolderTreeItem.tsx',
      'src/components/sidebar/WhiteboardTree.tsx',
      'src/components/document/StarredGrid.tsx',
      'src/components/browse/TagTreeList.tsx',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('useDragArm(');
      expect(source).toContain('onPointerDown={dragArm.onPointerDown}');
    }
  });

  it('触摸会话把同一族拖拽事件派发到落点元素上', () => {
    const source = readFileSync('src/lib/dnd/touch-drag.ts', 'utf8');
    expect(source).toContain("'dragstart'");
    expect(source).toContain("'dragenter'");
    expect(source).toContain("'dragover'");
    expect(source).toContain("'drop'");
    expect(source).toContain("'dragend'");
    // 拖拽期间长按滚动要拦住，否则手指一动页面先滚。
    expect(source).toContain("document.addEventListener('touchmove', blockTouchScroll, { passive: false })");
  });
});