import { describe, expect, it } from 'vitest';

import { KeyContextStack, type KeyLayer } from './key-context-stack';

/**
 * The key-context stack (G1478). Two stacks, not one table: the layer pushed last is consulted
 * first, an inactive layer is skipped, and the first layer that matches consumes the key.
 */
function layer(name: string, ids: string[], active = true): KeyLayer<string> {
  return { name, isActive: () => active, bindings: new Map(ids.map((id) => [id, `${name}:${id}`])) };
}

describe('the stack resolves top-down', () => {
  it('gives the key to the layer pushed last', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER']));
    stack.push(layer('table', ['ENTER']));
    expect(stack.resolve('ENTER')).toEqual({ layer: 'table', binding: 'table:ENTER' });
  });

  it('falls through to a lower layer when the top one does not answer', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER']));
    stack.push(layer('table', ['TAB']));
    expect(stack.resolve('ENTER')).toEqual({ layer: 'base', binding: 'base:ENTER' });
  });

  it('skips an inactive layer entirely', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER']));
    stack.push(layer('table', ['ENTER'], false));
    expect(stack.resolve('ENTER')).toEqual({ layer: 'base', binding: 'base:ENTER' });
  });

  it('returns null when nothing answers, so the key is left to the browser', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER']));
    expect(stack.resolve('ESCAPE')).toBeNull();
  });

  it('reports nothing when every layer is inactive', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER'], false));
    expect(stack.resolve('ENTER')).toBeNull();
  });
});

describe('pushing and popping', () => {
  it('tracks the stack size and order, bottom first', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', []));
    stack.push(layer('table', []));
    expect(stack.size).toBe(2);
    expect(stack.names()).toEqual(['base', 'table']);
  });

  it('pops by name and ignores a name that is not on the stack', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', []));
    stack.push(layer('table', []));
    stack.pop('table');
    expect(stack.names()).toEqual(['base']);
    stack.pop('never-pushed');
    expect(stack.names()).toEqual(['base']);
  });

  it('restores the lower layer once the top one pops', () => {
    const stack = new KeyContextStack<string>();
    stack.push(layer('base', ['ENTER']));
    stack.push(layer('table', ['ENTER']));
    expect(stack.resolve('ENTER')?.layer).toBe('table');
    stack.pop('table');
    expect(stack.resolve('ENTER')?.layer).toBe('base');
  });
});
