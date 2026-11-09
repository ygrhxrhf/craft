import { describe, expect, it } from 'vitest';

import { marqueeHits, type ItemRect, type Rect } from './marquee';
import { hitTest, type HitGeometry } from './hit-test';

/** A deterministic PRNG so a failing case is reproducible from its output alone. */
function random(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) & 0x7f_ff_ff_ff;
    return state / 0x7f_ff_ff_ff;
  };
}

/** A grid: `columns × rows` cards, uniform pitch, in row-major order. */
function gridItems(columns: number, rows: number): ItemRect[] {
  const items: ItemRect[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      items.push({
        id: `c${row}-${column}`,
        left: 20 + column * 228,
        top: 100 + row * 278,
        width: 208,
        height: 260,
      });
    }
  }
  return items;
}

/** A waterfall: each item goes in the shortest column, so tops are not aligned across columns. */
function waterfallItems(columns: number, count: number): ItemRect[] {
  const items: ItemRect[] = [];
  const heights = new Array(columns).fill(100);
  for (let index = 0; index < count; index += 1) {
    let shortest = 0;
    for (let column = 1; column < columns; column += 1) {
      if (heights[column] < heights[shortest]) shortest = column;
    }
    const height = 120 + (index % 5) * 40;
    items.push({ id: `w${index}`, left: 20 + shortest * 228, top: heights[shortest], width: 208, height });
    heights[shortest] += height + 20;
  }
  return items;
}

// G1136: the pruned paths must agree exactly with the flat scan — they differ only in cost.
describe('the typed hit tester agrees with the flat scan', () => {
  const cases: { name: string; geometry: HitGeometry }[] = [
    { name: 'cards', geometry: { layout: 'cards', items: gridItems(4, 3) } },
    { name: 'list', geometry: { layout: 'list', items: gridItems(1, 8) } },
    { name: 'waterfall', geometry: { layout: 'waterfall', items: waterfallItems(3, 11) } },
    {
      name: 'cards with a folder region',
      geometry: {
        layout: 'cards',
        items: gridItems(4, 3),
        folders: [{ id: 'folder-a', left: 20, top: 20, width: 208, height: 60 }],
      },
    },
  ];

  for (const { name, geometry } of cases) {
    it(`matches the flat scan on 200 random bands — ${name}`, () => {
      const next = random(geometry.items.length * 7919 + 13);
      const all = [...(geometry.folders ?? []), ...geometry.items];

      for (let attempt = 0; attempt < 200; attempt += 1) {
        const band: Rect = {
          left: next() * 1100 - 100,
          top: next() * 1200 - 100,
          width: next() * 500,
          height: next() * 500,
        };
        // The flat scan is the reference; the typed tester must not add or drop a hit.
        expect(new Set(hitTest(band, geometry))).toEqual(new Set(marqueeHits(band, all)));
      }
    });
  }

  it('keeps the folder region in the result whichever type the documents use', () => {
    const folders = [{ id: 'folder-a', left: 0, top: 0, width: 100, height: 100 }];
    const band = { left: 0, top: 0, width: 10, height: 10 };
    for (const layout of ['list', 'cards', 'waterfall'] as const) {
      expect(hitTest(band, { layout, items: [], folders })).toEqual(['folder-a']);
    }
  });

  it('reports hits in the caller’s order, so the last hit is the same anchor a flat scan gives', () => {
    const items = gridItems(3, 2);
    const band = { left: 0, top: 0, width: 1_000, height: 1_000 };
    expect(hitTest(band, { layout: 'cards', items })).toEqual(items.map((item) => item.id));
    expect(hitTest(band, { layout: 'waterfall', items })).toEqual(items.map((item) => item.id));
  });

  it('does not count a band that only grazes a card edge', () => {
    const items = gridItems(2, 1);
    const grazing = { left: 0, top: 0, width: 20, height: 10 };
    expect(hitTest(grazing, { layout: 'cards', items })).toEqual([]);
  });
});
