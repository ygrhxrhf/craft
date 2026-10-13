import { describe, expect, it } from 'vitest';

import { planTrailingClick } from './trailing-click';

/**
 * Clicking the blank space under the body (G220): the click lands on the trailing empty block,
 * and one is appended when the last block is not empty.
 */
describe('planning a trailing click', () => {
  it('does nothing special for a click on content', () => {
    expect(
      planTrailingClick({ clickY: 100, contentBottom: 200, lastBlockIsEmpty: false }),
    ).toEqual({ trailing: false, appendEmptyBlock: false });
  });

  it('lands on the existing empty block when the document already ends with one', () => {
    expect(
      planTrailingClick({ clickY: 300, contentBottom: 200, lastBlockIsEmpty: true }),
    ).toEqual({ trailing: true, appendEmptyBlock: false });
  });

  it('appends an empty block when the last block is not empty', () => {
    expect(
      planTrailingClick({ clickY: 300, contentBottom: 200, lastBlockIsEmpty: false }),
    ).toEqual({ trailing: true, appendEmptyBlock: true });
  });

  it('treats a click exactly on the bottom edge as content, not trailing', () => {
    expect(
      planTrailingClick({ clickY: 200, contentBottom: 200, lastBlockIsEmpty: false }).trailing,
    ).toBe(false);
  });
});
