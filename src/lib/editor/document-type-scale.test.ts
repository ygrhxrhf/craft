import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * G1556: the five document style slots are a measured ladder, not a Tailwind rem guess —
 * `Ctrl-Shift-1/2/3/4/5` land on title/subtitle/heading/strong/body, and the interaction lab read
 * each step's computed font size, weight and line height off both sides.
 */
const css = readFileSync(fileURLToPath(new URL('../../app/globals.css', import.meta.url)), 'utf8');
const editorRules = css.slice(css.indexOf('.tiptap {'), css.indexOf('/* ── Blockquote ──'));

const SLOTS: [string, string[]][] = [
  ['.tiptap {', ['font-size: 15px;', 'line-height: 23px;']],
  ['h1 {', ['font-size: 23px;', 'font-weight: 700;', 'line-height: 28px;']],
  ['h2 {', ['font-size: 20px;', 'font-weight: 700;', 'line-height: 24px;']],
  ['h3 {', ['font-size: 18px;', 'font-weight: 600;', 'line-height: 22px;']],
  ['h4 {', ['font-size: 16px;', 'font-weight: 700;']],
];

describe('the document style slots carry the measured sizes', () => {
  it.each(SLOTS)('%s sets the official declarations', (selector, declarations) => {
    const at = editorRules.indexOf(selector);
    expect(at, `missing ${selector}`).toBeGreaterThan(-1);
    const body = editorRules.slice(at, editorRules.indexOf('}', at));
    for (const declaration of declarations) {
      expect(body, `${selector} lacks ${declaration}`).toContain(declaration);
    }
  });

  it('drops the rem ladder the panel used to render', () => {
    for (const stale of ['1.875rem', '1.5rem', '1.25rem', '1.0625rem']) {
      expect(editorRules, `headings still sized in ${stale}`).not.toContain(`font-size: ${stale};`);
    }
  });
});
