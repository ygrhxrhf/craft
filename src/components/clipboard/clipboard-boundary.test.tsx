import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ClipboardBoundary } from './ClipboardBoundary';

/**
 * The marker attribute is the whole contract a stylesheet or a query can rely on: scope is stated
 * by the DOM, not by a class (official `ClipboardBoundary`, internals.md §十二 1).
 */
describe('the boundary element', () => {
  it('marks its own container and keeps the children inside', () => {
    const html = renderToStaticMarkup(
      <ClipboardBoundary className="contents">
        <textarea aria-label="LaTeX" />
      </ClipboardBoundary>,
    );
    expect(html).toBe('<div data-paste-boundary="true" class="contents"><textarea aria-label="LaTeX"></textarea></div>');
  });
});
