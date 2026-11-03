import { describe, expect, it } from 'vitest';

import { resetTaskState } from './duplicate-reset';

const doc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: '说明' }] },
    { type: 'taskList', content: [
      { type: 'taskItem', attrs: { checked: true, cancelled: false }, content: [{ type: 'paragraph' }] },
      { type: 'taskItem', attrs: { checked: false, cancelled: true, cancelledAt: '2026-01-01' }, content: [] },
    ] },
  ],
} as any;

describe('duplicate resets task state (G106)', () => {
  it('turns every copied task back to unchecked / not cancelled', () => {
    const copy = resetTaskState(doc);
    const items = copy.content[1].content as Array<{ attrs: Record<string, unknown> }>;
    expect(items[0].attrs).toMatchObject({ checked: false });
    expect(items[1].attrs).toMatchObject({ checked: false, cancelled: false, cancelledAt: null });
  });

  it('leaves other blocks alone and does not mutate the source', () => {
    const copy = resetTaskState(doc);
    expect(copy.content[0]).toEqual(doc.content[0]);
    expect(doc.content[1].content[0].attrs.checked).toBe(true);
  });
});
