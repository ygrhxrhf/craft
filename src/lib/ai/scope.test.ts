import { describe, expect, it } from 'vitest';

import { hasAiScope, parseAiScope, renderScopePrompt } from './context';

describe('the AI location chain (G97)', () => {
  it('reads the top-level fields the caller posts', () => {
    const scope = parseAiScope({
      spaceId: 'space-1',
      rootBlockId: 'root-1',
      documentId: 'doc-1',
      blockIds: ['b1', 'b2'],
      folderId: 'folder-1',
    });
    expect(scope).toEqual({
      spaceId: 'space-1',
      rootBlockId: 'root-1',
      documentId: 'doc-1',
      blockIds: ['b1', 'b2'],
      folderId: 'folder-1',
    });
    expect(hasAiScope(scope)).toBe(true);
  });

  it('lets the explicit `scope` object win over the flat fields', () => {
    const scope = parseAiScope({ documentId: 'flat', scope: { documentId: 'nested' } });
    expect(scope.documentId).toBe('nested');
    expect(scope.folderId).toBeNull();
  });

  it('dedupes and trims the selected block ids, dropping blanks and junk', () => {
    const scope = parseAiScope({ blockIds: [' b1 ', 'b1', '', 7, null, 'b2'] });
    expect(scope.blockIds).toEqual(['b1', 'b2']);
  });

  it('treats a bare {action,text} body as no scope and renders nothing extra', () => {
    const scope = parseAiScope({ action: 'rewrite', text: 'hello' });
    expect(hasAiScope(scope)).toBe(false);
    expect(renderScopePrompt(scope)).toBe('');
    expect(renderScopePrompt(parseAiScope(null))).toBe('');
  });

  it('renders the chain plus the selected blocks', () => {
    const prompt = renderScopePrompt(
      parseAiScope({
        spaceId: 's1',
        documentId: 'd1',
        rootBlockId: 'r1',
        blockIds: ['b1', 'b2'],
      }),
    );
    expect(prompt).toContain('spaceId="s1"');
    expect(prompt).toContain('documentId="d1"');
    expect(prompt).toContain('rootBlockId="r1"');
    expect(prompt).toContain('<block id="b1" />');
    expect(prompt).toContain('<block id="b2" />');
  });

  it('omits the selected-blocks envelope when nothing is selected', () => {
    expect(renderScopePrompt(parseAiScope({ documentId: 'd1' }))).not.toContain('selectedBlocks');
  });
});