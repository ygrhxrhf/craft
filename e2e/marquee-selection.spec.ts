import { expect, test, type Page } from '@playwright/test';

import { INTRO_SEEN_KEY, INTRO_VERSIONS } from '../src/lib/onboarding/versioned-intro';

const email = 'craft-test@example.com';
const password = 'test1234';
const LATEST_INTRO = INTRO_VERSIONS[INTRO_VERSIONS.length - 1].version;

/** A fresh context would otherwise open on the version carousel, whose overlay eats the press. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ([key, version]) => {
      try {
        window.localStorage.setItem(key, version);
      } catch {
        // An opaque origin has no storage; the real document runs this again.
      }
    },
    [INTRO_SEEN_KEY, LATEST_INTRO],
  );

  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
  // Force the grid, whatever an earlier run left in this browser profile.
  await page.getByRole('button', { name: '网格', exact: true }).click();
  await expect(page.locator('[data-testid="browse-content"] a[data-item-id]').first()).toBeVisible();
});

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The first few cards of the top row — the row the drag runs across. */
async function firstRow(page: Page): Promise<Box[]> {
  const boxes = await page
    .locator('[data-testid="browse-content"] a[data-item-id]')
    .evaluateAll((elements) =>
      elements.slice(0, 8).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      }),
    );
  const top = Math.round(boxes[0]?.y ?? 0);
  return boxes.filter((box) => Math.round(box.y) === top);
}

/** The parsed count from the selection bar, or null when the bar is not up. */
async function selectedCount(page: Page): Promise<number | null> {
  const label = page.getByText(/^已选 \d+ 项$/);
  if (!(await label.count())) return null;
  const text = (await label.first().textContent()) ?? '';
  const match = /已选 (\d+) 项/.exec(text);
  return match ? Number(match[1]) : null;
}

/** `scrollTop` of the same ancestor the marquee layer listens on (the nearest scrolling one). */
async function scrollTop(page: Page): Promise<number> {
  return page.evaluate(() => {
    let node: HTMLElement | null = document.querySelector('[data-testid="browse-content"]');
    while (node) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') return node.scrollTop;
      node = node.parentElement;
    }
    return -1;
  });
}

/** The scrolling ancestor's viewport rect plus whether it overflows at all. */
async function scrollBounds(page: Page) {
  return page.evaluate(() => {
    let node: HTMLElement | null = document.querySelector('[data-testid="browse-content"]');
    while (node) {
      const overflow = getComputedStyle(node).overflowY;
      if (overflow === 'auto' || overflow === 'scroll') {
        const rect = node.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          overflow: node.scrollHeight > node.clientHeight,
        };
      }
      node = node.parentElement;
    }
    return null;
  });
}

/** Drags from the gap right of the first card across the next two. */
async function dragAcrossRow(page: Page, targetIndex: number) {
  const row = await firstRow(page);
  expect(row.length, 'the grid needs at least three cards in its top row').toBeGreaterThanOrEqual(3);
  const start = { x: row[0].x + row[0].width + 10, y: row[0].y + row[0].height / 2 };
  const end = {
    x: row[targetIndex].x + row[targetIndex].width / 2,
    y: row[targetIndex].y + row[targetIndex].height / 2,
  };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  // The first leg has to clear the 5px start threshold before anything happens.
  await page.mouse.move(start.x + 12, start.y, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 12 });
  return end;
}

/**
 * G1555/G1135: a drag starting on empty space is a marquee. The hits must land in the grid's
 * selection — early on they only went to a data attribute, and the container was the toolbar, so
 * the marquee selected nothing at all.
 */
test('a marquee drag selects the cards it covers and keeps them on release', async ({ page }) => {
  await dragAcrossRow(page, 2);

  await expect(page.getByTestId('marquee-band')).toBeVisible();
  await expect(page.getByTestId('browse-selection-bar')).toBeVisible();
  // Two cards are inside the band: the one right of the start gap and the one it ends on.
  await expect(page.getByText(/^已选 \d+ 项$/)).toHaveText('已选 2 项');

  const checked = page.locator('[data-testid="browse-content"] [role="checkbox"][aria-checked="true"]');
  await expect(checked).toHaveCount(2);

  await page.mouse.up();
  // G1555 ③: the band goes away, the selection it produced stays.
  await expect(page.getByTestId('marquee-band')).toBeHidden();
  await expect(page.getByText(/^已选 2 项$/)).toBeVisible();
  await expect(checked).toHaveCount(2);
});

/** G1129: the list layout keeps its rows and grows checkboxes — it must not jump to the grid. */
test('the list layout keeps its rows and grows a checkbox per hit', async ({ page }) => {
  await page.getByRole('button', { name: '列表', exact: true }).click();
  const rows = page.locator('[data-testid="browse-list"] a[data-item-id]');
  await expect(rows.first()).toBeVisible();

  // Rows span the container edge to edge, so the only blank space beside them is the page
  // container's own side padding — the press surface the official scroll element provides.
  const content = (await page.getByTestId('browse-content').boundingBox())!;
  const first = (await rows.first().boundingBox())!;
  const third = (await rows.nth(2).boundingBox())!;
  const start = { x: content.x - 8, y: first.y + first.height / 2 };
  const end = { x: third.x + third.width / 2, y: third.y + third.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 12 });

  await expect(page.getByTestId('marquee-band')).toBeVisible();
  await expect(page.locator('[data-testid="browse-list"]')).toBeVisible();
  await expect(page.getByTestId('browse-selection-bar')).toBeVisible();
  await expect(page.getByText(/^已选 \d+ 项$/)).toHaveText('已选 3 项');
  await expect(page.locator('[data-testid="browse-list"] [role="checkbox"][aria-checked="true"]')).toHaveCount(3);
  await page.mouse.up();
  await expect(page.getByTestId('marquee-band')).toBeHidden();
  await expect(page.getByText(/^已选 3 项$/)).toBeVisible();
  await expect(rows.first()).toBeVisible();
});

/** The waterfall layout is its own hit algorithm (G1136) and its own card geometry. */
test('the waterfall layout selects the cards a vertical band covers', async ({ page }) => {
  await page.getByRole('button', { name: '瀑布', exact: true }).click();
  const cards = page.locator('[data-testid="browse-waterfall"] a[data-item-id]');
  await expect(cards.first()).toBeVisible();

  // One card sitting in the first three columns; a band drawn through the gaps between them.
  const content = (await page.getByTestId('browse-content').boundingBox())!;
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );
  const columns = [...new Set(boxes.map((box) => Math.round(box.x)))].sort((a, b) => a - b);
  expect(columns.length, 'the waterfall needs at least three columns').toBeGreaterThanOrEqual(3);
  const top = (column: number) => boxes.filter((box) => Math.round(box.x) === column).sort((a, b) => a.y - b.y)[0];
  const first = top(columns[0]);
  const second = top(columns[1]);

  const start = { x: content.x - 8, y: first.y + 10 };
  const end = { x: second.x + second.width / 2, y: second.y + second.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y, { steps: 4 });
  await page.mouse.move(end.x, end.y, { steps: 12 });

  await expect(page.getByTestId('marquee-band')).toBeVisible();
  await expect(page.getByTestId('browse-selection-bar')).toBeVisible();
  await expect(page.getByText(/^已选 \d+ 项$/)).toHaveText('已选 2 项');
  await expect(page.locator('[data-testid="browse-waterfall"] [role="checkbox"][aria-checked="true"]')).toHaveCount(2);
  await page.mouse.up();
});

/** G1135 ③: holding the drag past the bottom edge scrolls the list and keeps re-testing hits. */
test('holding the band past the bottom edge auto-scrolls the browse list', async ({ page }) => {
  // A short viewport guarantees the rows overflow the scroller whatever this profile holds.
  await page.setViewportSize({ width: 1_100, height: 420 });
  const bounds = await scrollBounds(page);
  expect(bounds, 'browse screen must expose a scrolling ancestor').not.toBeNull();
  expect(bounds!.overflow, 'a 420px-tall viewport should overflow with any real document count').toBe(true);

  const content = (await page.getByTestId('browse-content').boundingBox())!;
  const before = await scrollTop(page);
  // Start in the page's left gutter, beside the first row: a press on a card is vetoed (G1135 ①).
  const start = { x: content.x - 8, y: content.y + 20 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 12, start.y + 20, { steps: 4 });
  await expect(page.getByTestId('marquee-band')).toBeVisible();
  // Park below the scroller's bottom edge — 60px past is 0.3 of the 200px ramp, so ~4px per frame.
  await page.mouse.move(start.x + 12, bounds!.bottom + 60, { steps: 8 });

  await expect
    .poll(async () => (await scrollTop(page)) - before, { timeout: 5_000 })
    .toBeGreaterThan(0);

  await expect(page.getByTestId('marquee-band')).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId('marquee-band')).toBeHidden();
});

/** Escape abandons the gesture in flight; what the drag already picked is left as it stands. */
test('Escape cancels the band without clearing what it already picked', async ({ page }) => {
  await dragAcrossRow(page, 2);
  await expect(page.getByTestId('marquee-band')).toBeVisible();
  const before = await selectedCount(page);

  await page.keyboard.press('Escape');
  await expect(page.getByTestId('marquee-band')).toBeHidden();
  await expect(page.getByText(/^已选 \d+ 项$/)).toHaveText(`已选 ${before} 项`);

  await page.mouse.up();
  await expect(page.getByTestId('marquee-band')).toBeHidden();
});
