import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

const panel = read('../../components/settings/AssistantPanel.tsx');
const settings = read('../../components/settings/SettingsPanels.tsx');
const bubble = read('../../components/editor/bubble-menu/AiBubbleMenu.tsx');
const actions = read('../../actions/user/custom-prompts.ts');
const tables = read('../sync/tables.ts');

/**
 * G120 的接线闸：存储双写、读时迁移、条数超限 4 秒 error toast、长度静默截断，
 * 以及两处承载面（设置面板 / 提示库）都真的挂上了。
 */
describe('custom prompts are wired end to end (G120)', () => {
  it('mounts the assistant panel where the old placeholder stood', () => {
    expect(settings).toContain("import { AssistantPanel } from './AssistantPanel';");
    expect(settings).toContain("case 'assistant':");
    expect(settings).toContain('return <AssistantPanel />;');
    expect(settings).not.toContain('助手未启用。');
  });

  it('keeps the 4-second error toast for the count overflow', () => {
    expect(panel).toContain('timeout: CUSTOM_PROMPT_LIMIT_TOAST_MS');
    expect(panel).toContain("type: 'error'");
    expect(bubble.length).toBeGreaterThan(0);
  });

  it('does not cap the textarea length, because the cut is silent on save', () => {
    expect(panel).not.toContain('maxLength');
    expect(panel).toContain('MAX_PROMPT_CHARS');
  });

  it('writes both stored shapes and migrates legacy reads', () => {
    expect(actions).toContain('prompts: JSON.stringify(state.prompts)');
    expect(actions).toContain('promptObjects: JSON.stringify(state.promptObjects)');
    expect(actions).toContain('if (state.migrated)');
  });

  it('syncs the prompts as user settings, never in the document payload', () => {
    const userRow = tables
      .split('\n')
      .find((line) => line.includes("{ table: 'user',"));
    expect(userRow).toContain("'prompts'");
    expect(userRow).toContain("'promptObjects'");
    const docCols = /DOC_META_COLS = \[([\s\S]*?)\]/.exec(tables)?.[1] ?? '';
    expect(docCols).not.toContain('prompts');
  });

  it('offers the saved prompts in the AI prompt library', () => {
    expect(bubble).toContain('getCustomPrompts()');
    expect(bubble).toContain('{customPrompts.map((item) => (');
    expect(bubble).toContain('runPrompt({ id: item.id, label: item.prompt, prompt: item.prompt })');
  });
});
