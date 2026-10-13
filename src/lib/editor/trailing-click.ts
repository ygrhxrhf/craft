/**
 * Clicking the blank space under the body (G220). The rule: the click lands on the last empty
 * block; if the document's last block is not empty, a new empty one is added and the caret goes
 * there. That is why a one-block document becomes two blocks on a trailing click.
 */

export interface TrailingClickPlan {
  /** Whether the click was in the trailing blank area rather than on content. */
  trailing: boolean;
  /** Whether a new empty block has to be appended. */
  appendEmptyBlock: boolean;
}

/**
 * Decide what a click does. `contentBottom` is the bottom of the last block; a click below it is
 * trailing. `lastBlockIsEmpty` says whether the document already ends with an empty block.
 */
export function planTrailingClick(input: {
  clickY: number;
  contentBottom: number;
  lastBlockIsEmpty: boolean;
}): TrailingClickPlan {
  const trailing = input.clickY > input.contentBottom;
  return { trailing, appendEmptyBlock: trailing && !input.lastBlockIsEmpty };
}
