import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ATOM_NODE_NAMES,
  caretInsideAtom,
  countAtomicInlines,
  dayAtomHref,
  dayAtomLabel,
  isAtomNodeName,
  normalizeTagAtomName,
  parseDayAtomDate,
  tagAtomHref,
} from './inline-atoms';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/**
 * G580：原子内联元素的权威四类 `math / day / mention / tag`；光标落在原子内时 Backspace 让位。
 */
describe('the four atomic inline kinds (G580)', () => {
  it('names math, day, mention and tag — nothing else', () => {
    expect([...ATOM_NODE_NAMES]).toEqual(['mathBlock', 'inlineMath', 'dayAtom', 'mention', 'tagAtom']);
    expect(isAtomNodeName('mention')).toBe(true);
    expect(isAtomNodeName('dayAtom')).toBe(true);
    expect(isAtomNodeName('tagAtom')).toBe(true);
    // 普通文本块不是原子。
    expect(isAtomNodeName('paragraph')).toBe(false);
    expect(isAtomNodeName('heading')).toBe(false);
  });

  it('treats the caret as inside an atom when the parent or a neighbour is one', () => {
    const atom = (name: string) => ({ type: { name } });
    expect(caretInsideAtom('dayAtom', null, null)).toBe(true);
    expect(caretInsideAtom('paragraph', atom('tagAtom'), atom('text'))).toBe(true);
    expect(caretInsideAtom('paragraph', null, atom('mention'))).toBe(true);
    expect(caretInsideAtom('paragraph', atom('text'), atom('text'))).toBe(false);
    expect(caretInsideAtom('paragraph', null, null)).toBe(false);
  });

  it('does not read a block with only an atom as empty', () => {
    // 一个只有一枚原子、没有文字的段落：文本长度 0，但**不是**空块。
    const withAtom = {
      childCount: 1,
      child: () => ({ isText: false, type: { name: 'tagAtom' } }),
    };
    expect(countAtomicInlines(withAtom)).toBe(1);
    const plain = {
      childCount: 2,
      child: (i: number) => ({ isText: true, type: { name: i === 0 ? 'text' : 'text' } }),
    };
    expect(countAtomicInlines(plain)).toBe(0);
  });
});

describe('the day atom (G580)', () => {
  it('accepts only real calendar days in the strict format', () => {
    expect(parseDayAtomDate('2026.09.27')).toBe('2026.09.27');
    expect(parseDayAtomDate('2026-9-7')).toBe('2026.09.07');
    // 不存在的日子 / 错误形态一律不认。
    expect(parseDayAtomDate('2026.02.30')).toBeNull();
    expect(parseDayAtomDate('26.09.27')).toBeNull();
    expect(parseDayAtomDate('today')).toBeNull();
    expect(parseDayAtomDate(undefined)).toBeNull();
  });

  it('builds the same day:// deep link shape as the official generator', () => {
    expect(dayAtomHref('2026.09.27')).toBe('day://2026.09.27');
    expect(dayAtomHref('2026-09-27')).toBe('day://2026.09.27');
    expect(dayAtomHref('nope')).toBe('');
    expect(dayAtomLabel('2026.09.27')).toBe('2026.09.27');
  });
});

describe('the tag atom (G580)', () => {
  it('strips a leading # and surrounding whitespace, rejects empty names', () => {
    expect(normalizeTagAtomName('  #项目/设计 ')).toBe('项目/设计');
    expect(normalizeTagAtomName('##tag')).toBe('tag');
    expect(normalizeTagAtomName('   ')).toBeNull();
    expect(normalizeTagAtomName('#')).toBeNull();
    expect(normalizeTagAtomName(null)).toBeNull();
  });

  it('points at the tag page when it knows the id', () => {
    expect(tagAtomHref('t-1')).toBe('/tags/t-1');
    expect(tagAtomHref(null)).toBe('/tags');
  });
});

describe('the editor wires both atoms and the backspace guard (G580)', () => {
  it('registers the two nodes', () => {
    const editor = read('src/components/editor/Editor.tsx');
    expect(editor).toContain("import { DayAtom } from './extensions/day-atom';");
    expect(editor).toContain("import { TagAtom } from './extensions/tag-atom';");
    expect(editor).toContain('      DayAtom,');
    expect(editor).toContain('      TagAtom,');
  });

  it('lets Backspace through inside an atom', () => {
    const keymap = read('src/components/editor/extensions/craft-keymap.ts');
    expect(keymap).toContain('caretInsideAtom($from.parent.type.name, $from.nodeBefore, $from.nodeAfter)');
    // 守卫必须排在块首那条链之前（不然先被链吃掉）。
    const guard = keymap.indexOf('caretInsideAtom($from.parent.type.name');
    const chain = keymap.indexOf('nextBackspaceStep({');
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(chain);
  });

  it('counts real atoms instead of hardcoding zero', () => {
    const keymap = read('src/components/editor/extensions/craft-keymap.ts');
    expect(keymap).not.toContain('atomicInlines: 0');
    expect(keymap).toContain('atomicInlines: countAtomicInlines($from.parent)');
  });

  it('offers both atoms in the slash menu', () => {
    const slash = read('src/components/editor/slash-menu/slash-commands.ts');
    expect(slash).toContain('insertDayAtom()');
    expect(slash).toContain('insertTagAtom({ name: cleaned, tagId: existing?.id ?? null })');
  });
});
