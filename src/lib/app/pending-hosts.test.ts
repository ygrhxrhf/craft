import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pendingLabel } from './pending-states';

/**
 * G300: the two creating sentences lost their only host when QuickActions.tsx went away with G15.
 * The surviving hosts are icon-only, so each one carries the sentence three ways — the spinner is
 * visible, `aria-busy` marks the control, and a live region announces the collected wording. The
 * label must come from `pendingLabel`, not a locally written string.
 */
function read(...segments: string[]): string {
  return readFileSync(join(process.cwd(), 'src', 'components', 'sidebar', ...segments), 'utf8');
}

describe('the creating sentences have a live host again (G300)', () => {
  const header = read('SidebarHeader.tsx');
  const folder = read('NewFolderButton.tsx');

  it('renders the collected sentence through pendingLabel in both hosts', () => {
    expect(header).toContain("pendingLabel('creatingDocuments')");
    expect(folder).toContain("pendingLabel('creatingFolders')");
    expect(header).not.toContain('正在创建文档');
    expect(folder).not.toContain('正在创建文件夹');
  });

  it('announces the sentence from a polite live region, not from the button label', () => {
    for (const source of [header, folder]) {
      expect(source).toMatch(/role="status" aria-live="polite"/);
      expect(source).toContain('sr-only');
    }
    // The accessible name stays the action name: a screen reader hears what the button does, and
    // the live region separately reports the progress.
    expect(header).toContain('aria-label="新建文档"');
    expect(folder).toContain('aria-label="新建文件夹"');
  });

  it('marks the control busy and busy-guards a double click', () => {
    for (const source of [header, folder]) {
      expect(source).toContain('aria-busy={creating || undefined}');
      expect(source).toContain('disabled={creating}');
      expect(source).toMatch(/if \(creating\) return;/);
      expect(source).toContain('animate-spin');
    }
  });

  it('keeps the folder button visible while it is busy', () => {
    // The section header reveals this control on hover only; hiding it mid-flight would take the
    // progress away with the pointer.
    expect(folder).toMatch(/\$\{creating \? 'opacity-100' : 'opacity-0'\}/);
  });

  it('uses the exact collected wording', () => {
    expect(pendingLabel('creatingDocuments')).toBe('正在创建文档');
    expect(pendingLabel('creatingFolders')).toBe('正在创建文件夹');
  });
});
