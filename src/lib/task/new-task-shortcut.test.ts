import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isNewTaskShortcut } from './new-task-shortcut';

// G1573: Ctrl/⌘-J opens the new-task popup on the tasks screen.
describe('new task shortcut (G1573)', () => {
  it('matches Ctrl or Cmd + J without other modifiers', () => {
    expect(isNewTaskShortcut({ key: 'j', ctrlKey: true })).toBe(true);
    expect(isNewTaskShortcut({ key: 'J', metaKey: true })).toBe(true);
    expect(isNewTaskShortcut({ key: 'j', ctrlKey: true, shiftKey: true })).toBe(false);
    expect(isNewTaskShortcut({ key: 'j', ctrlKey: true, altKey: true })).toBe(false);
    expect(isNewTaskShortcut({ key: 'j' })).toBe(false);
  });

  it('is wired into the tasks screen with a popup', () => {
    const source = readFileSync(
      join(process.cwd(), 'src', 'app', '(app)', 'tasks', 'TasksView.tsx'),
      'utf8',
    );
    expect(source).toContain('isNewTaskShortcut');
    expect(source).toContain('task-quick-popup');
    expect(source).toContain('placeholder="新任务"');
  });
});
