import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { NodeViewProps } from '@tiptap/react';

import { CardBlockView } from './card-block-view';

function render(bgColor: string | null) {
  const props = { node: { attrs: { bgColor, emoji: null } } } as unknown as NodeViewProps;
  return renderToStaticMarkup(<CardBlockView {...props} />);
}

/**
 * A card with no chosen colour follows the theme (G1483) instead of painting a fixed white, which
 * would stay white in the dark theme. A chosen colour is still painted as given.
 */
describe('the card background', () => {
  it('uses the theme surface when no colour was chosen', () => {
    const html = render('#ffffff');
    expect(html).toContain('bg-card');
    expect(html).not.toContain('background-color');
  });

  it('paints a chosen colour exactly', () => {
    expect(render('#ffeeaa')).toContain('background-color:#ffeeaa');
  });
});
