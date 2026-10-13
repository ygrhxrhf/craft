import { describe, expect, it } from 'vitest';

import {
  MARKDOWN_SHORTCUTS,
  shortcutFor,
  startingNumber,
} from './markdown-input-table';

/**
 * The official markdown input table (keyboard.md §20.14.6). The four facts that differ from a
 * naive H1–H4 / markdown-shortcut reading: `####` is Strong, `+` is a toggle, a numbered entry
 * carries its starting ordinal, and leading whitespace is allowed.
 */
describe('the style entries', () => {
  it('maps one to four hashes to title, subtitle, heading and strong', () => {
    expect(shortcutFor('#')?.kind).toBe('title');
    expect(shortcutFor('##')?.kind).toBe('subtitle');
    expect(shortcutFor('###')?.kind).toBe('heading');
    // Four hashes are Strong, not a fourth heading level.
    expect(shortcutFor('####')?.kind).toBe('strong');
  });

  it('maps the three bullet characters to a bullet list', () => {
    for (const trigger of ['-', '*', '•']) {
      expect(shortcutFor(trigger)?.kind, trigger).toBe('bullet');
    }
  });

  it('maps + to a toggle list', () => {
    expect(shortcutFor('+')?.kind).toBe('toggle');
  });

  it('maps the task triggers', () => {
    expect(shortcutFor('[ ]')?.kind).toBe('todo');
    expect(shortcutFor('-[]')?.kind).toBe('todo');
    expect(shortcutFor('[x]')?.kind).toBe('todoChecked');
  });

  it('maps > and | to focusing the block', () => {
    expect(shortcutFor('>')?.kind).toBe('focusBlock');
    expect(shortcutFor('|')?.kind).toBe('focusBlock');
  });
});

describe('numbered entries', () => {
  it('matches by pattern and carries the starting ordinal', () => {
    expect(shortcutFor('1.')?.kind).toBe('numbered');
    expect(shortcutFor('7.')?.startsAtNumber).toBe(true);
    expect(startingNumber('7.')).toBe(7);
    expect(startingNumber('42.')).toBe(42);
  });

  it('does not treat a bare number as a numbered entry', () => {
    expect(startingNumber('7')).toBeNull();
    expect(shortcutFor('7')).toBeNull();
  });
});

describe('leading whitespace', () => {
  it('is allowed, as the official patterns all use ^\\s*', () => {
    expect(shortcutFor('  #')?.kind).toBe('title');
    expect(startingNumber('   7.')).toBe(7);
  });

  it('returns null for a line that matches nothing', () => {
    expect(shortcutFor('hello')).toBeNull();
    expect(shortcutFor('')).toBeNull();
  });
});

describe('the table itself', () => {
  it('lists every entry with a trigger and a kind', () => {
    expect(MARKDOWN_SHORTCUTS.length).toBeGreaterThan(10);
    for (const entry of MARKDOWN_SHORTCUTS) {
      expect(entry.trigger.length, entry.kind).toBeGreaterThan(0);
    }
  });
});
