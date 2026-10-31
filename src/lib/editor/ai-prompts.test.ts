import { describe, expect, it } from 'vitest';
import { AI_PROMPT_PRESETS } from './ai-prompts';

describe('AI prompt library (G39)', () => {
  it('carries the collected quick-action labels', () => {
    expect(AI_PROMPT_PRESETS.map((preset) => preset.label)).toEqual([
      '分析写作风格',
      '找出需要详细解释的部分',
      '改为自信的语气',
      '改为友好的语气',
    ]);
  });

  it('gives every preset a non-empty instruction', () => {
    for (const preset of AI_PROMPT_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.prompt.trim().length).toBeGreaterThan(0);
    }
  });
});
