import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const keymap = readFileSync(
  new URL('../../components/editor/extensions/craft-keymap.ts', import.meta.url),
  'utf8',
);

/** G1551：`⌘D` 之后官方把焦点交给 body 并进入块选区态。 */
describe('the duplicate hands focus to the block selection (G1551)', () => {
  it('selects the new copy as a node and leaves the editor', () => {
    const body = keymap.slice(keymap.indexOf('function duplicateTopBlock'));
    expect(body).toContain('NodeSelection.create(after.doc, duplicateStart)');
    expect(body).toContain('view.dom.blur()');
  });
});
