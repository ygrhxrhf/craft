import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * G489：官方键盘分发是**单一入口且挂在 document 的 capture 阶段**
 * （`document.addEventListener("keydown", tEe, opts, true)`）⇒ 官方快捷键先于任何组件自己的
 * keydown 被处理。本地同口径：shell 的和弦分发挂 document＋capture，而不是 window＋冒泡。
 */
describe('the shell chord dispatcher (G489)', () => {
  const source = readFileSync(
    join(process.cwd(), 'src/components/editor/shell-shortcuts.tsx'),
    'utf8',
  );

  it('listens on document in the capture phase, like the official dispatcher', () => {
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.removeEventListener('keydown', onKeyDown, true)");
    // 冒泡阶段的旧通路撤掉：它要等组件先放行，官方不是这个次序。
    expect(source).not.toContain("window.addEventListener('keydown'");
    expect(source).not.toContain("window.removeEventListener('keydown'");
  });

  it('keeps the IME guard and the scope check in front of the chord lookup', () => {
    expect(source).toContain('isImeComposing(event)');
    expect(source).toContain('shellShortcutAllowed(candidate.id, pathname)');
  });

  it('is the only shell-level keydown listener left in the component', () => {
    const listeners = source.match(/addEventListener\('keydown'/g) ?? [];
    expect(listeners).toHaveLength(1);
  });
});
