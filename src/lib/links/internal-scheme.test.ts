import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { craftSchemeRoute, internalRoute, parseCraftScheme } from './internal-scheme';

describe('the craft:// scheme (G121)', () => {
  it('recognises documents, folders and the three reserved folder names', () => {
    expect(parseCraftScheme('craft://doc/abc')).toEqual({ kind: 'doc', id: 'abc' });
    expect(parseCraftScheme('craft://folder/f1')).toEqual({ kind: 'folder', id: 'f1' });
    expect(parseCraftScheme('craft://folder/starred')).toEqual({ kind: 'folder-reserved', name: 'starred' });
    expect(parseCraftScheme('craft://folder/all-docs')).toEqual({ kind: 'folder-reserved', name: 'all-docs' });
  });

  it('recognises the four task views, tags and calendar', () => {
    expect(parseCraftScheme('craft://tasks/today')).toEqual({ kind: 'tasks', view: 'today' });
    expect(parseCraftScheme('craft://tasks')).toEqual({ kind: 'tasks', view: 'inbox' });
    expect(parseCraftScheme('craft://tags')).toEqual({ kind: 'tags' });
    expect(parseCraftScheme('craft://calendar')).toEqual({ kind: 'calendar' });
    expect(parseCraftScheme('https://example.com')).toBeNull();
  });

  it('maps to local routes, leaving credit unrouted', () => {
    expect(craftSchemeRoute('craft://doc/abc')).toBe('/documents/abc');
    expect(craftSchemeRoute('craft://folder/starred')).toBe('/favorites');
    expect(craftSchemeRoute('craft://folder/all-docs')).toBe('/documents');
    expect(craftSchemeRoute('craft://tasks/upcoming')).toBe('/tasks/upcoming');
    expect(craftSchemeRoute('craft://tags')).toBe('/tags');
    expect(craftSchemeRoute('craft://credit')).toBeNull();
    expect(internalRoute({ kind: 'tasks', view: 'all' })).toBe('/tasks/all');
  });

  it('is handled by the editor link click', () => {
    const editor = readFileSync(join(process.cwd(), 'src/components/editor/Editor.tsx'), 'utf8');
    expect(editor).toContain('craftSchemeRoute(href)');
  });
});
