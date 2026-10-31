import { describe, expect, it, vi } from 'vitest';
import { runAllToggles } from './toggle-all-command';

function editor() {
  return {
    commands: {
      expandAllToggleBlocks: vi.fn(),
      collapseAllToggleBlocks: vi.fn(),
    },
  };
}

describe('runAllToggles', () => {
  it('runs expand and collapse on the active editor', () => {
    const target = editor();
    expect(runAllToggles(target, true)).toBe(true);
    expect(target.commands.expandAllToggleBlocks).toHaveBeenCalledTimes(1);
    expect(target.commands.collapseAllToggleBlocks).not.toHaveBeenCalled();

    expect(runAllToggles(target, false)).toBe(true);
    expect(target.commands.collapseAllToggleBlocks).toHaveBeenCalledTimes(1);
  });

  it('does nothing without an editor', () => {
    expect(runAllToggles(null, true)).toBe(false);
  });
});
