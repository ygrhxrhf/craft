import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  appendCustomPrompt,
  CREATE_CUSTOM_PROMPT,
  customPromptLimitDesc,
  CUSTOM_PROMPT_LIMIT_DESC,
  MAX_CUSTOM_PROMPTS,
  MAX_PROMPT_CHARS,
  readCustomPromptState,
  removeCustomPrompt,
  sanitizePromptText,
  SAVED_PROMPTS_TITLE,
} from './custom-prompts';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function catalogValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  return line ? /^-\s+(.+?)\s+`/.exec(line.trim())?.[1] ?? null : null;
}

function objects(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    prompt: `提示 ${index + 1}`,
  }));
}

describe('the custom-prompt contract (G120)', () => {
  it('takes the panel titles from the catalog', () => {
    expect(catalogValue('preferences.assistant.saved.prompts')).toBe(SAVED_PROMPTS_TITLE);
    expect(catalogValue('assistant.create.custom.prompt')).toBe(CREATE_CUSTOM_PROMPT);
  });

  it('fills the catalog limit sentence with the official numbers', () => {
    expect(catalogValue('preferences.assistant.saved.prompts.limit.desc')).toBe(
      CUSTOM_PROMPT_LIMIT_DESC,
    );
    expect(customPromptLimitDesc()).toBe('最多可保存 20 条提示词，每条最多 1000 个字符。');
    expect(MAX_CUSTOM_PROMPTS).toBe(20);
    expect(MAX_PROMPT_CHARS).toBe(1000);
  });

  it('cuts an over-long prompt silently instead of rejecting it', () => {
    const long = '字'.repeat(1200);
    expect(sanitizePromptText(long)).toHaveLength(1000);
    const result = appendCustomPrompt(
      { promptObjects: [] },
      long,
      () => 'new-id',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.promptObjects[0].prompt).toHaveLength(1000);
    expect(result.promptObjects[0].id).toBe('new-id');
  });

  it('refuses the 21st prompt instead of trimming the list', () => {
    const state = { promptObjects: objects(MAX_CUSTOM_PROMPTS) };
    const result = appendCustomPrompt(state, '再来一条', () => 'overflow');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('limit');
    expect(result.promptObjects).toHaveLength(MAX_CUSTOM_PROMPTS);
  });

  it('rejects whitespace-only prompts', () => {
    const result = appendCustomPrompt({ promptObjects: [] }, '   ', () => 'blank');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('empty');
  });

  it('migrates the legacy string list into objects on read', () => {
    const state = readCustomPromptState({ prompts: JSON.stringify(['旧提示一', '旧提示二']) });
    expect(state.migrated).toBe(true);
    expect(state.promptObjects).toEqual([
      { id: 'legacy-1', prompt: '旧提示一' },
      { id: 'legacy-2', prompt: '旧提示二' },
    ]);
    expect(state.prompts).toEqual(['旧提示一', '旧提示二']);
  });

  it('prefers the object list over the legacy list, including an emptied one', () => {
    const parsed = readCustomPromptState({
      prompts: ['旧提示'],
      promptObjects: JSON.stringify([{ id: 'a', prompt: '新提示' }]),
    });
    expect(parsed.migrated).toBe(false);
    expect(parsed.promptObjects).toEqual([{ id: 'a', prompt: '新提示' }]);

    const emptied = readCustomPromptState({ prompts: ['旧提示'], promptObjects: [] });
    expect(emptied.migrated).toBe(false);
    expect(emptied.promptObjects).toEqual([]);
  });

  it('validates the stored shape and drops malformed entries', () => {
    const state = readCustomPromptState({
      promptObjects: [
        { id: 'ok', prompt: '可用' },
        { id: 'bad', prompt: 42 },
        { prompt: '   ' },
        null,
        { prompt: '缺 id' },
      ],
    });
    expect(state.promptObjects.map((item) => item.prompt)).toEqual(['可用', '缺 id']);
    expect(state.promptObjects[1].id).toBe('prompt-5');
  });

  it('removes a prompt and re-derives both stored shapes', () => {
    const state = { promptObjects: objects(2) };
    const next = removeCustomPrompt(state, 'p1');
    expect(next.promptObjects.map((item) => item.id)).toEqual(['p2']);
    expect(next.prompts).toEqual(['提示 2']);
  });
});
