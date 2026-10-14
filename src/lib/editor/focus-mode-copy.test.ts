import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  EXIT_FOCUS_MODE_KEY,
  EXIT_FOCUS_MODE_PREFIX,
  FOCUS_MODE,
  FOCUS_MODE_KEY,
  TOGGLE_FOCUS_MODE,
  TOGGLE_FOCUS_MODE_KEY,
} from './focus-mode-copy';

const catalog = readFileSync(new URL('../../../docs/craft-ref/features/feature-catalog.md', import.meta.url), 'utf8');
const editorSource = readFileSync(
  new URL('../../components/editor/DocumentEditor.tsx', import.meta.url),
  'utf8',
);
const sidebarSource = readFileSync(new URL('../../components/sidebar/Sidebar.tsx', import.meta.url), 'utf8');

describe('专注模式的官方串（G11）', () => {
  it.each([
    [FOCUS_MODE, FOCUS_MODE_KEY],
    [TOGGLE_FOCUS_MODE, TOGGLE_FOCUS_MODE_KEY],
    [`${EXIT_FOCUS_MODE_PREFIX}[0]`, EXIT_FOCUS_MODE_KEY],
  ] as const)('- %s  \\`%s\\` 逐字在台账里', (text, key) => {
    expect(catalog).toContain(`- ${text}  \`${key}\``);
  });
});

describe('专注模式真的把三块面板收起来（G11 判据）', () => {
  it('顶栏、右侧栏各自读旗标，不做任何"恢复"写入', () => {
    expect(editorSource).toContain("focusActive && 'hidden'");
    expect(editorSource).toContain('{!focusActive && (isCompact || activeTab) && (');
  });

  it('侧栏整块不挂载，旗标为真时没有 aside', () => {
    expect(sidebarSource).toContain('if (focusActive) return null;');
    expect(sidebarSource).toContain("useFocusStore((state) => state.active)");
  });

  it('进入有入口（不止键位），退出横条用官方那条串', () => {
    expect(editorSource).toContain('aria-label={FOCUS_MODE}');
    expect(editorSource).toContain('${EXIT_FOCUS_MODE_PREFIX}');
    expect(editorSource).toContain('data-testid="focus-exit"');
  });
});
