import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../../src', import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(entry) && ! /\.test\.(ts|tsx)$/.test(entry) ? [path] : [];
  });
}

const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

/**
 * 浏览器原生弹层在这一层是**禁区**：它无法表达"提交了什么"，也拿不到宿主弹层的样式与
 * 焦点管理。台账 G460 的立项理由就是这一条。
 */
describe('no native browser dialogs survive in src', () => {
  it('has no window.confirm / window.prompt, and no bare quoted prompt(...) call', () => {
    const offenders = sources(SRC)
      .filter((path) => {
        const text = readFileSync(path, 'utf8');
        return (
          /window\.(prompt|confirm)\(/.test(text) ||
          /[^(.\w](prompt|confirm)\(\s*['"`]/.test(text)
        );
      })
      .map((path) => relative(SRC, path));
    expect(offenders).toEqual([]);
  });
});

describe('the imperative dialog is wired', () => {
  it('mounts one host above every route', () => {
    expect(read('components/providers/Providers.tsx')).toMatch(/<DialogHost \/>/);
  });

  it('binds the store state to the promise bridge', () => {
    const store = read('lib/store/use-dialog-store.ts');
    expect(store).toMatch(/createPromiseBridge<DialogConfig, DialogSubmission>/);
    expect(store).toMatch(/event.type === 'open'/);
  });

  it('resolves a close as a cancellation instead of leaving it dangling', () => {
    const host = read('components/dialog/DialogHost.tsx');
    expect(host).toMatch(/if \(!next\) cancel\(\);/);
    expect(host).toMatch(/submit\(\{ kind: 'prompt', value \}\)/);
    expect(host).toContain('取消');
  });

  it('routes every former browser dialog through the imperative API', () => {
    for (const path of [
      'components/editor/tabs/VersionDialog.tsx',
      'components/editor/slash-menu/slash-commands.ts',
      'components/editor/bubble-menu/BubbleMenu.tsx',
      'components/editor/extensions/image-block-view.tsx',
      'components/editor/panels/PageStylePanel.tsx',
    ]) {
      expect(read(path)).toMatch(/from '@\/lib\/dialog\/show'/);
    }
  });

  it('keeps the empty-string submission distinct from cancelling', () => {
    const bubble = read('components/editor/bubble-menu/BubbleMenu.tsx');
    expect(bubble).toMatch(/if \(url === null\) return;/);
    expect(bubble).toMatch(/if \(url === ''\) \{[\s\S]*unsetLink\(\)/);
  });
});

describe('the clipboard boundary is wired', () => {
  it('attaches one stop reference to all three clipboard events', () => {
    const boundary = read('components/clipboard/ClipboardBoundary.tsx');
    expect(boundary).toMatch(
      /for \(const type of CLIPBOARD_EVENTS\) node\.addEventListener\(type, stop\)/,
    );
    expect(boundary).toMatch(/data-paste-boundary="true"/);
  });

  it('wraps every editable surface that lives inside the editor', () => {
    for (const path of [
      'components/editor/extensions/math-block-view.tsx',
      'components/editor/extensions/mirror-block-view.tsx',
      'components/editor/extensions/searchable-select.tsx',
    ]) {
      expect(read(path)).toMatch(/from '@\/components\/clipboard\/ClipboardBoundary'/);
      expect(read(path)).toMatch(/<ClipboardBoundary className="contents">/);
    }
  });
});
