import { describe, expect, it } from 'vitest';
import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';

import { plainFallbackLowlight } from './plain-fallback-lowlight';

const lowlight = plainFallbackLowlight(createLowlight({ javascript }));

describe('无 grammar 语言不再回落自动检测（G1180）', () => {
  it('claims every language is registered, so the suggestion plugin takes the highlight() path', () => {
    expect(lowlight.registered('python')).toBe(true);
    expect(lowlight.registered('ada')).toBe(true);
    expect(lowlight.registered('')).toBe(true);
  });

  it('renders an unregistered language as plain text (no auto-detected tokens)', () => {
    const result = lowlight.highlight('ada', 'function Foo is begin null; end Foo;') as {
      children: Array<{ type: string; value?: string; children?: unknown[] }>;
    };
    expect(result.children).toHaveLength(1);
    expect(result.children[0].type).toBe('text');
    expect(result.children[0].value).toContain('function Foo');
  });

  it('still highlights a registered language', () => {
    const result = lowlight.highlight('javascript', 'const a = 1') as { children: Array<{ type: string; children?: unknown[] }> };
    expect(result.children.some((child) => child.type === 'element')).toBe(true);
  });

  it('handles an empty language and empty code without crashing', () => {
    const empty = lowlight.highlight('', '') as { children: unknown[] };
    expect(empty.children).toEqual([]);
    const bare = lowlight.highlight('', 'plain') as { children: Array<{ type: string }> };
    expect(bare.children[0].type).toBe('text');
  });

  it('passes other lowlight members through', () => {
    expect(lowlight.listLanguages()).toContain('javascript');
  });
});