import { describe, expect, it } from 'vitest';

import { backdropBackground, parseBackdrop } from './backdrop';
describe('parseBackdrop（G706）', () => {
  it('clears `none` and empty values', () => {
    expect(parseBackdrop('none')).toBeNull();
    expect(parseBackdrop('')).toBeNull();
    expect(parseBackdrop(undefined)).toBeNull();
  });

  it('parses a bare colour pair', () => {
    expect(parseBackdrop('#C5E1F4 #C5E1F4')).toEqual({ kind: 'color', light: '#C5E1F4', dark: '#C5E1F4' });
    expect(parseBackdrop('#FF0000')).toEqual({ kind: 'color', light: '#FF0000' });
  });

  it('parses the stringified gradient JSON the CLI writes', () => {
    const value = JSON.stringify({
      type: 'gradient',
      gradientColors: { startColor: '#ff0000', endColor: '#00ff00' },
      direction: 'top-to-bottom',
      size: 'full',
    });
    expect(parseBackdrop(value)).toEqual({
      kind: 'gradient',
      startColor: '#ff0000',
      endColor: '#00ff00',
      direction: 'top-to-bottom',
      size: 'full',
    });
    expect(parseBackdrop('{"type":"solid"}')).toBeNull();
    expect(parseBackdrop('{broken')).toBeNull();
  });

  it('parses the preset gradient expression, stops possibly dual', () => {
    expect(parseBackdrop('gradient(#C5E1F4 #C5E1F4, #F0F8FF #F0F8FF, radial)')).toEqual({
      kind: 'gradient',
      startColor: '#C5E1F4 #C5E1F4',
      endColor: '#F0F8FF #F0F8FF',
      direction: 'radial',
      size: 'full',
    });
    expect(parseBackdrop('gradient(#111, #222, top-to-bottom)')).toBeNull();
  });

  it('parses an image expression and decodes percent-encoded urls', () => {
    expect(parseBackdrop('image("https://a/b.png", "tok")')).toEqual({ kind: 'image', url: 'https://a/b.png' });
    expect(parseBackdrop('image("https%3A%2F%2Fa%2Fb.png", "tok")')).toEqual({ kind: 'image', url: 'https://a/b.png' });
    expect(parseBackdrop('image(noquotes)')).toBeNull();
  });
});

describe('backdropBackground（G706）', () => {
  it('emits a light/dark pair as light-dark(), one value as itself', () => {
    const backdrop = parseBackdrop('#FF0000 #0000FF');
    expect(backdropBackground(backdrop!)).toBe('light-dark(#FF0000, #0000FF)');
    expect(backdropBackground(parseBackdrop('#FF0000')!)).toBe('#FF0000');
    // A pair whose halves agree collapses to one colour.
    expect(backdropBackground(parseBackdrop('#FF0000 #FF0000')!)).toBe('#FF0000');
  });

  it('emits radial vs linear per direction', () => {
    const radial = parseBackdrop('gradient(#AABBCC, #DDEEFF, radial)')!;
    expect(backdropBackground(radial)).toBe('radial-gradient(circle, #AABBCC, #DDEEFF)');
    const linear = parseBackdrop('gradient(#AABBCC #000001, #DDEEFF #111112, top-to-bottom)')!;
    expect(backdropBackground(linear)).toBe(
      'linear-gradient(to bottom, light-dark(#AABBCC, #000001), light-dark(#DDEEFF, #111112))',
    );
  });

  it('renders an image as a cover background', () => {
    expect(backdropBackground({ kind: 'image', url: 'https://a/b.png' })).toBe(
      'url("https://a/b.png") center / cover no-repeat',
    );
    expect(backdropBackground(null)).toBeUndefined();
  });
});
