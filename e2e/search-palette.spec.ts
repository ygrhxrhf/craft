import { expect, test, type Page } from '@playwright/test';

// A palette of its own. The visual matrix owns craft-visual@ and nothing else writes to it,
// while this spec has to create a collection row before there is anything to find -- and a
// collection cell in the shared account would move 集合 shots in the visual baseline.
const USER = { email: 'craft-palette@example.com', password: 'test1234', name: '弹层搜索账号' };

const DOC = '弹层搜索文档P1';
const COLLECTION = '弹层搜索集合P1';
const CELL = '弹层搜索针P1';

// Owned by the visual account. Searching it from this account has to come back empty.
const FOREIGN = '视觉基线';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', USER.email);
  await page.fill('input[type="password"]', USER.password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', USER.name);
  await page.fill('#email', USER.email);
  await page.fill('#password', USER.password);
  await page.fill('#confirmPassword', USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 25_000 });
}

async function ensureDocument(page: Page) {
  await page.goto('/documents');
  if (await page.locator(`a:has-text("${DOC}")`).count()) return;

  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.getByPlaceholder('页面标题').fill(DOC);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 20_000 });
}

/** One row, one filled 名称 cell -- the default property a new collection ships with. */
async function ensureCollectionRow(page: Page) {
  await page.goto('/collections');
  const card = page.locator(`a:has-text("${COLLECTION}")`).first();
  if (await card.count()) {
    await card.click();
  } else {
    await page.getByRole('button', { name: /新建集合/ }).first().click();
    await page.fill('#name', COLLECTION);
    await page.getByRole('button', { name: /^创建$/ }).click();
    await page.waitForURL(/\/collections\//);

    await page.getByRole('main').getByRole('button', { name: '新建', exact: true }).click();
    await expect(page.getByRole('main').locator('tbody tr')).toHaveCount(1);

    const row = page.getByRole('main').locator('tbody tr').first();
    await row.getByText('-', { exact: true }).first().click();
    const input = row.locator('input[type="text"]');
    await input.fill(CELL);
    // Enter commits the cell (onBlur does too, but the row could be left open on purpose).
    await input.press('Enter');
  }

  await expect(page.getByRole('main').getByText(CELL, { exact: true })).toBeVisible({ timeout: 20_000 });
}

/**
 * Rejections that reach the browser. `searchAll` once threw on every call while the palette
 * showed 未找到结果: the caller has `try/finally` with no `catch`, so nothing on screen said
 * "broken". A rejected action still arrives here, so this is the one channel that cannot be
 * mistaken for an empty result set.
 */
function trackErrors(page: Page): string[] {
  const seen: string[] = [];
  page.on('pageerror', (e) => seen.push(String(e.message ?? e)));
  return seen;
}

async function openPalette(page: Page, query: string) {
  await page.goto('/documents');
  await page.keyboard.press('ControlOrMeta+K');
  await page.getByPlaceholder('搜索文档、内容…').fill(query);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
  await ensureDocument(page);
  await ensureCollectionRow(page);
});

test('the palette finds my document by its title', async ({ page }) => {
  const errors = trackErrors(page);
  await openPalette(page, DOC);
  await expect(page.getByRole('option', { name: new RegExp(DOC) })).toBeVisible();
  expect(errors).toEqual([]);
});

test('the palette finds my collection row by its cell text', async ({ page }) => {
  const errors = trackErrors(page);
  await openPalette(page, CELL);
  await expect(page.getByRole('option', { name: new RegExp(CELL) })).toBeVisible();
  expect(errors).toEqual([]);
});

/**
 * `browse.search.create.doc` =「创建 [0]」. The row keeps the query verbatim, and selecting it
 * lands on a real document titled with that query.
 */
test('a query offers the official create-document row and it lands on a real document', async ({ page }) => {
  const title = `创建行测试 ${Date.now()}`;
  await openPalette(page, title);

  const createRow = page.getByTestId('palette-create-doc');
  await expect(createRow).toBeVisible();
  await expect(createRow).toHaveText(`创建 ${title}`);

  await createRow.click();
  await page.waitForURL(/\/documents\//, { timeout: 20_000 });
  await expect(page.locator('input[placeholder="页面标题"]')).toHaveValue(title, { timeout: 20_000 });
});

test('another account rows never appear in my palette', async ({ page }) => {
  const errors = trackErrors(page);
  await openPalette(page, CELL);
  // Without a round trip that visibly lands, what follows proves nothing: the empty state
  // renders during the 200ms debounce, so a dead search path shows zero options too.
  await expect(page.getByRole('option', { name: new RegExp(CELL) })).toBeVisible();

  await page.getByPlaceholder('搜索文档、内容…').fill(FOREIGN);
  // Disappearance is the only reading that can follow a second response rather than precede it.
  await expect(page.getByRole('option', { name: new RegExp(CELL) })).toHaveCount(0);
  expect(errors).toEqual([]);
});
