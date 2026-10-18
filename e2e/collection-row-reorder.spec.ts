import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

async function createCollection(page: Page): Promise<void> {
  await page.goto('/collections');
  await page.getByRole('button', { name: /新建集合/ }).first().click();
  await page.fill('#name', `条目排序 ${Date.now()}`);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.waitForURL(/\/collections\//);
  await expect(page.getByRole('main')).toBeVisible();
}

/** 往第 `index` 行的首个可见列写一个值——行标签（拖拽手柄的可及名）就取这一列。 */
async function fillFirstCell(page: Page, index: number, value: string): Promise<void> {
  const cell = page.locator('tbody tr[data-row-id]').nth(index).locator('td').nth(1);
  await cell.click();
  const input = cell.locator('input[type="text"]');
  await input.fill(value);
  await input.press('Enter');
}

/** 屏上从上到下的行标签。 */
async function rowLabels(page: Page): Promise<string[]> {
  return page
    .locator('tbody tr[data-row-id] button[aria-label^="拖动排序"]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
}

/**
 * G1539：集合条目拖拽重排。
 *
 * 顺序的权威是每行的 `order` 列（0 基、列表顺序即顺序），拖放只把 order 变了的行推给服务端。
 * 带排序/分组的视图上不提供拖拽——屏上顺序由排序决定，拖了也看不见。
 */
test('a collection row can be dragged to a new position, and the order survives a reload', async ({
  page,
}) => {
  await signIn(page);
  await createCollection(page);

  const main = page.getByRole('main');
  const stamp = Date.now();
  const first = `甲${stamp}`;
  const second = `乙${stamp}`;

  // 新集合初始 0 行，要两行得点两次「新建」。首访集合时 dev 按需编译，落在编译窗口里的
  // 一次点击可能不生效（`collection-filter.spec.ts` 也记了同一现象）⇒ 重试，最后再等结果。
  const addRow = main.getByRole('button', { name: '新建', exact: true });
  await expect(addRow).toBeVisible({ timeout: 20_000 });
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await page.locator('tbody tr[data-row-id]').count()) >= 2) break;
    await addRow.click();
    try {
      await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2, { timeout: 12_000 });
    } catch {
      // 还没到两行 —— 再点一次
    }
  }
  await expect(page.locator('tbody tr[data-row-id]'), '「新建」没加出第二行').toHaveCount(2, {
    timeout: 30_000,
  });
  await fillFirstCell(page, 0, first);
  await fillFirstCell(page, 1, second);

  // 手柄就在首列，可及名带行标签，读得出"现在谁在上"
  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${first}`, `拖动排序 ${second}`]);
  await page.screenshot({ path: 'screenshots/tmp-row-reorder-before.png', fullPage: true });

  // 把第一行拖到第二行上 ⇒ moveRow(from=0, to=1)：其余行顺移，两行互换
  const rows = page.locator('tbody tr[data-row-id]');
  await page.getByRole('button', { name: `拖动排序 ${first}` }).dragTo(rows.nth(1));

  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${second}`, `拖动排序 ${first}`]);
  await page.screenshot({ path: 'screenshots/tmp-row-reorder-after.png', fullPage: true });

  // 刷新后顺序不变：写的是 order 列，不是本地乐观态
  await page.reload();
  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${second}`, `拖动排序 ${first}`]);

  // 带排序的视图上不提供手柄（宁可没有，也不要"拖了没反应"）
  await main.getByRole('button', { name: '排序', exact: true }).click();
  await main.getByRole('button', { name: '添加排序' }).click();
  await expect(page.locator('tbody tr[data-row-id] button[aria-label^="拖动排序"]')).toHaveCount(0, {
    timeout: 20_000,
  });

  // 刷新后排序配置仍保持，拖拽手柄继续隐藏
  await page.reload();
  await expect(page.locator('tbody tr[data-row-id] button[aria-label^="拖动排序"]')).toHaveCount(0, {
    timeout: 20_000,
  });
});

/**
 * 筛选只减少屏上行数，不改顺序的来源：重排必须按**全集**算。
 * 旧实现拿筛选后的子集去 renumber，可见行会被压成 0..k-1，与隐藏行撞号 ——
 * 撤掉筛选后顺序就不再是用户拖出来的那个。
 */
test('a filtered view reorders the whole collection, not just the visible rows', async ({ page }) => {
  await signIn(page);
  await createCollection(page);

  const main = page.getByRole('main');
  const stamp = Date.now();
  const first = `甲${stamp}`;
  const middle = `乙${stamp}`;
  const last = `丙${stamp}`;

  const addRow = main.getByRole('button', { name: '新建', exact: true });
  await expect(addRow).toBeVisible({ timeout: 20_000 });
  for (let attempt = 0; attempt < 5; attempt++) {
    if ((await page.locator('tbody tr[data-row-id]').count()) >= 3) break;
    await addRow.click();
    try {
      await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(3, { timeout: 12_000 });
    } catch {
      // 还没到三行 —— 再点一次
    }
  }
  await expect(page.locator('tbody tr[data-row-id]'), '「新建」没加出第三行').toHaveCount(3, {
    timeout: 30_000,
  });
  await fillFirstCell(page, 0, first);
  await fillFirstCell(page, 1, middle);
  await fillFirstCell(page, 2, last);

  // 筛掉中间那行：屏上只剩 first 与 last，手柄仍在（筛选不在 canReorder 的判据里）
  await main.getByRole('button', { name: '添加筛选器' }).click();
  await main.getByRole('button', { name: '添加条件' }).click();
  const filterRow = page.getByTestId('filter-row').first();
  await filterRow.locator('select').first().selectOption({ label: '名称' });
  await filterRow.getByTestId('filter-operator').selectOption('string_doesNotContain');
  await filterRow.getByTestId('filter-value').fill(middle);
  await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(2, { timeout: 20_000 });

  // 把 first 拖到 last 的位置：全集下标 0 -> 2
  await page
    .getByRole('button', { name: `拖动排序 ${first}` })
    .dragTo(page.locator('tbody tr[data-row-id]').nth(1));

  // 先等屏上顺序真的换过来（`handleDrop` 是 push 完才 refresh，抢在推送前 reload 会读到旧序）
  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${last}`, `拖动排序 ${first}`]);

  await page.reload();
  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${last}`, `拖动排序 ${first}`]);

  // 撤掉筛选：被藏起来的中间行必须回到它原来的位置，即 middle / last / first
  await main.getByRole('button', { name: '添加筛选器' }).click();
  await page.getByTestId('filter-row').first().getByRole('button').click();
  await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(3, { timeout: 20_000 });
  await expect
    .poll(() => rowLabels(page), { timeout: 20_000 })
    .toEqual([`拖动排序 ${middle}`, `拖动排序 ${last}`, `拖动排序 ${first}`]);
});
