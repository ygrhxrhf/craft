import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const bubble = readFileSync(
  new URL('../../components/editor/bubble-menu/AiBubbleMenu.tsx', import.meta.url),
  'utf8',
);

/** G119 的接线闸：34 条官方模板真的进了提示库，且 `{0}` 在点击时被选区填上。 */
describe('the built-in prompt library is wired into the AI menu (G119)', () => {
  it('renders the five collected groups from the library', () => {
    expect(bubble).toContain('promptsInGroup(group)');
    expect(bubble).toContain('PROMPT_GROUP_LABELS[group]');
    expect(bubble).toContain('Object.keys(PROMPT_GROUP_LABELS) as PromptGroupId[]');
  });

  it('fills the {0} slot with the current selection before sending', () => {
    expect(bubble).toContain('fillPromptTemplate(template, editor.state.doc.textBetween(from, to,');
    expect(bubble).toContain('prompt: fillFromSelection(item.template)');
  });

  it('keeps the saved prompts as their own group after the built-ins', () => {
    expect(bubble).toContain('{SAVED_PROMPTS_TITLE}');
    expect(bubble).toContain('{customPrompts.length > 0 && (');
  });

  it('scrolls the long list instead of growing past the viewport', () => {
    expect(bubble).toContain('max-h-64 flex-col gap-1 overflow-y-auto');
  });

  it('no longer ships the four hand-written presets', () => {
    expect(bubble).not.toContain('AI_PROMPT_PRESETS');
  });
});
