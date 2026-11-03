import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ASSISTANT_DISABLED,
  assistantAvailable,
  ENABLE_ASSISTANT,
  ENABLE_ASSISTANT_DESC,
  ENABLE_IN_SETTINGS,
  parseDisabledSpaces,
  setSpaceDisabled,
  SPACE_ASSISTANT_DESC,
  VIEW_CREDITS,
} from './assistant-access';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

function catalogValue(key: string): string | null {
  const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
  return line ? /^-\s+(.+?)\s+`/.exec(line.trim())?.[1] ?? null : null;
}

describe('the assistant disable axes (G162)', () => {
  it('takes the switch copy from the catalog', () => {
    expect(catalogValue('preferences.enable.assistant')).toBe(ENABLE_ASSISTANT);
    expect(catalogValue('preferences.enable.assistant.description')).toBe(ENABLE_ASSISTANT_DESC);
    expect(catalogValue('preferences.assistant.space.desc')).toBe(SPACE_ASSISTANT_DESC);
    expect(catalogValue('preferences.view.ai.assistant.credits')).toBe(VIEW_CREDITS);
    expect(catalogValue('assistant.assistant.disabled')).toBe(ASSISTANT_DISABLED);
    expect(catalogValue('assistant.enable.assistant.in.settings')).toBe(ENABLE_IN_SETTINGS);
  });

  it('gates on both axes', () => {
    expect(assistantAvailable({ enabled: false, disabledSpaces: [] }, 's1')).toBe(false);
    expect(assistantAvailable({ enabled: true, disabledSpaces: ['s1'] }, 's1')).toBe(false);
    expect(assistantAvailable({ enabled: true, disabledSpaces: ['s1'] }, 's2')).toBe(true);
    expect(assistantAvailable({ enabled: true, disabledSpaces: ['s1'] }, null)).toBe(true);
  });

  it('disables one space without touching the others', () => {
    const off = setSpaceDisabled({ enabled: true, disabledSpaces: [] }, 's1', false);
    expect(off.disabledSpaces).toEqual(['s1']);
    expect(setSpaceDisabled(off, 's2', false).disabledSpaces).toEqual(['s1', 's2']);
    expect(setSpaceDisabled(setSpaceDisabled(off, 's2', false), 's1', true).disabledSpaces).toEqual([
      's2',
    ]);
    expect(setSpaceDisabled(off, 's1', false)).toEqual(off);
  });

  it('accepts both stored shapes and drops junk', () => {
    expect(parseDisabledSpaces('["a","a","","b"]')).toEqual(['a', 'b']);
    expect(parseDisabledSpaces(['a', 1, null, 'b'])).toEqual(['a', 'b']);
    expect(parseDisabledSpaces('not json')).toEqual([]);
    expect(parseDisabledSpaces(null)).toEqual([]);
  });

  it('is wired into the settings panel and the AI route', () => {
    const panel = readFileSync(
      new URL('../../components/settings/AssistantPanel.tsx', import.meta.url),
      'utf8',
    );
    const route = readFileSync(new URL('../../app/api/ai/route.ts', import.meta.url), 'utf8');
    const tables = readFileSync(new URL('../sync/tables.ts', import.meta.url), 'utf8');
    expect(panel).toContain('setAssistantEnabled');
    expect(panel).toContain('setSpaceAssistantEnabled');
    expect(panel).toContain('{ENABLE_ASSISTANT_DESC}');
    expect(panel).toContain('{SPACE_ASSISTANT_DESC}');
    expect(route).toContain('await assistantAvailableForUser()');
    const userRow = tables.split('\n').find((line) => line.includes("{ table: 'user',"));
    expect(userRow).toContain("'assistantEnabled'");
    expect(userRow).toContain("'assistantDisabledSpaces'");
  });
});
