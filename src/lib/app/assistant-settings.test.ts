import { describe, expect, it } from 'vitest';

import {
  ASSISTANT_SETTING_KEYS,
  MAX_PROMPT_CHARS,
  MAX_SAVED_PROMPTS,
  canAddPrompt,
  isPromptWithinLimit,
  savedPromptsLimitLabel,
} from './assistant-settings';

/**
 * Assistant settings (G162): the two prompt limits and the keys the panel and chat panel share.
 */
describe('the saved-prompt limits', () => {
  it('are 20 prompts of 1000 characters', () => {
    expect(MAX_SAVED_PROMPTS).toBe(20);
    expect(MAX_PROMPT_CHARS).toBe(1000);
  });

  it('fills both slots in the description sentence', () => {
    expect(savedPromptsLimitLabel()).toBe('最多可保存 20 条提示词，每条最多 1000 个字符。');
  });

  it('allows another prompt below the cap and refuses at it', () => {
    expect(canAddPrompt(19)).toBe(true);
    expect(canAddPrompt(20)).toBe(false);
  });

  it('measures a prompt body against the character cap', () => {
    expect(isPromptWithinLimit('a'.repeat(1000))).toBe(true);
    expect(isPromptWithinLimit('a'.repeat(1001))).toBe(false);
  });
});

describe('the settings keys', () => {
  it('names the six the panel and chat panel share', () => {
    expect(ASSISTANT_SETTING_KEYS).toEqual({
      model: 'assistant.model',
      savedPrompts: 'assistant.saved.prompts',
      addPrompt: 'assistant.add.prompt',
      deletePrompt: 'assistant.delete.prompt',
      usage: 'ai.usage.and.limits',
      credits: 'view.ai.assistant.credits',
    });
  });
});
