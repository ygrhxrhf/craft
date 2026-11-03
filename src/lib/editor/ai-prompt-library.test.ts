import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  BUILTIN_PROMPTS,
  fillPromptTemplate,
  promptsInGroup,
  PROMPT_GROUP_LABELS,
} from './ai-prompt-library';

const catalog = JSON.parse(
  readFileSync(join(process.cwd(), 'docs/craft-ref/features/_harvest/zh-Hans.json'), 'utf8'),
) as Record<string, string>;

/**
 * G119: every title and template is the collected sentence, verbatim — including the
 * three trailing spaces and the `write.template` / `write.template.template` key trap.
 */
describe('the built-in prompt library (G119)', () => {
  it('carries all 34 template actions, each with its catalog title and body', () => {
    expect(BUILTIN_PROMPTS).toHaveLength(34);
    for (const prompt of BUILTIN_PROMPTS) {
      const key = `assistant.prompt.${prompt.id}`;
      expect(prompt.label, key).toBe(catalog[key]);
      expect(prompt.template, `${key}.template`).toBe(catalog[`${key}.template`]);
    }
  });

  it('splits the 34 actions into the five collected groups', () => {
    expect(Object.keys(PROMPT_GROUP_LABELS)).toEqual([
      'tone',
      'length',
      'write',
      'translate',
      'structure',
    ]);
    expect(promptsInGroup('tone')).toHaveLength(3);
    expect(promptsInGroup('length')).toHaveLength(2);
    expect(promptsInGroup('write')).toHaveLength(8);
    expect(promptsInGroup('translate')).toHaveLength(9);
    expect(promptsInGroup('structure')).toHaveLength(12);
  });

  it('keeps the ambiguous write.template action distinct from its template body', () => {
    const entry = BUILTIN_PROMPTS.find((item) => item.id === 'write.template');
    expect(entry?.label).toBe('创建有关此主题的模板');
    expect(entry?.template).toBe(catalog['assistant.prompt.write.template.template']);
  });

  it('uses {0} as the content slot and never the human-visible [0] form', () => {
    for (const prompt of BUILTIN_PROMPTS) {
      expect(prompt.template, prompt.id).toContain('{0}');
      expect(prompt.template, prompt.id).not.toContain('[0]');
    }
  });

  it('fills every slot with the selected text, preserving the tail spaces', () => {
    const friendly = BUILTIN_PROMPTS.find((item) => item.id === 'change.tone.friendly');
    expect(friendly?.template.endsWith(' ')).toBe(true);
    expect(fillPromptTemplate(friendly!.template, '正文')).toBe(
      '改为友好的语气: \n ---\n正文 \n --- ',
    );
    expect(fillPromptTemplate('--- {0} --- {0} ---', 'X')).toBe('--- X --- X ---');
  });
});
