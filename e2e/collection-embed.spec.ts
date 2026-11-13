import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * `gap.md` G1614 —— 正文里的集合块要**直接渲染集合内容**，不是一枚指回集合屏的入口卡。
 * 这条用例走真实视口：从插入面板「合集 → 表格」建集合与块，屏上先读到「暂无条目」，
 * 再到集合屏加一行写个值，回到文档时那一行**就在块里的表格上**，刷新后仍在。
 */
const email = 'craft-test@example.com';
const password = 'test1234';

test.setTimeout(300_000);

// dev 服务器的子进程在堆占用越过阈值时会自行重启（Next 16 的默认行为），重启窗口里
// server action 与保存请求会瞬时失败。这类网络噪声不是页面缺陷，从控制台断言里排掉。
const TRANSIENT = /ERR_CONNECTION|Failed to fetch|WebSocket|net::ERR_|Load failed/i;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // 登录后 dev 端首次编译可能要几十秒（同 hydration-platform-hint 的做法）。
  await page.waitForURL(/\/documents/, { timeout: 90_000 });
}

/** 重启窗口里 goto 会直接 ERR_CONNECTION_REFUSED，给一次重试。 */
async function gotoWithRetry(page: Page, url: string) {
  await page.goto(url).catch(async () => {
    await page.waitForTimeout(3_000);
    await page.goto(url);
  });
}

/**
 * 新建一篇文档并从插入面板「合集」组插入一种集合块。按需编译时首次点击可能被吞掉
 *（页面上「Rendering…」角标）；**块一旦出现就不再点**——再点会新建第二个集合，
 * 落盘的是后一个，手里攥着的 id 就过期了。
 */
async function insertCollectionBlock(page: Page, label: string) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const documentUrl = page.url();
  await page.getByRole('button', { name: '插入', exact: true }).click();
  const panel = page.getByTestId('insert-panel');
  const entry = panel.getByText(label, { exact: true });
  const block = page.locator('[data-collection-block]').first();
  for (let attempt = 0; attempt < 3 && (await block.count()) === 0; attempt++) {
    if (!(await panel.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: '插入', exact: true }).click();
      await expect(panel).toBeVisible({ timeout: 12_000 });
    }
    await entry.click();
    await expect(block)
      .toHaveCount(1, { timeout: 45_000 })
      .catch(() => {});
  }
  await expect(block).toHaveCount(1, { timeout: 30_000 });
  return { documentUrl, block };
}

/**
 * 等块里读到指定文案；若卡在「载入中…」或「无法读取集合」，点块头自己的「刷新集合」
 * 重取一次 —— 这是界面本就提供的恢复路径，不额外引入概念。
 */
async function expectEmbedText(block: Locator, text: string) {
  const target = block.getByText(text, { exact: true });
  const refresh = block.getByRole('button', { name: '刷新集合' });
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      await expect(target).toBeVisible({ timeout: 15_000 });
      return;
    } catch {
      if (await refresh.isVisible().catch(() => false)) await refresh.click();
    }
  }
  await expect(target).toBeVisible({ timeout: 15_000 });
}

test('a collection block renders its rows inline and keeps them after a reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && !TRANSIENT.test(msg.text())) errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await signIn(page);

  // 1) 新建文档 → 插入面板「合集」组里的「表格」。
  const { documentUrl, block } = await insertCollectionBlock(page, '表格');
  await expect(block).toHaveAttribute('data-view', 'table');

  // 2) 新集合 0 行 ⇒ 块内是「暂无条目」，块头是集合本名与视图档，另有一枚刷新入口。
  await expectEmbedText(block, '暂无条目');
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 60_000 });
  await expect(block.getByText('表格集合', { exact: true })).toBeVisible();
  await expect(block.getByRole('button', { name: '刷新集合' })).toBeVisible();
  // 落盘之后再读 id：此刻 DOM 上的块与文档里持久化的那一个才是同一个。
  const collectionId = await block.getAttribute('data-collection-block');
  expect(collectionId, '集合块没带上集合 id').toBeTruthy();

  // 3) 到集合屏加一行并写个值（集合屏首列是拖拽手柄，值落在第 2 个 td）。
  await gotoWithRetry(page, `/collections/${collectionId}`);
  const main = page.getByRole('main');
  const addRow = main.getByRole('button', { name: '新建', exact: true });
  await expect(addRow).toBeVisible({ timeout: 60_000 });
  const stamp = `内联${Date.now()}`;
  for (let attempt = 0; attempt < 4; attempt++) {
    if ((await page.locator('tbody tr[data-row-id]').count()) >= 1) break;
    await addRow.click();
    try {
      await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1, { timeout: 12_000 });
    } catch {
      // dev 按需编译窗口吞掉的一次点击 —— 再点一次
    }
  }
  await expect(page.locator('tbody tr[data-row-id]')).toHaveCount(1, { timeout: 30_000 });
  const cell = page.locator('tbody tr[data-row-id]').first().locator('td').nth(1);
  await cell.click();
  const input = cell.locator('input[type="text"]');
  await input.fill(stamp);
  await input.press('Enter');
  await expect(page.getByText(stamp, { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // 4) 回到文档：那一行在**块里的表格**上（不是入口卡），刷新后仍在。
  await gotoWithRetry(page, documentUrl);
  const again = page.locator('[data-collection-block][data-view="table"]').first();
  await expect(again).toBeVisible({ timeout: 60_000 });
  await expectEmbedText(again, stamp);
  await expect(again.locator('table tbody tr[data-row-id]')).toHaveCount(1);

  await page.reload();
  const afterReload = page.locator('[data-collection-block][data-view="table"]').first();
  await expect(afterReload).toBeVisible({ timeout: 60_000 });
  await expectEmbedText(afterReload, stamp);
  await page.screenshot({ path: 'screenshots/tmp-collection-embed.png', fullPage: true });

  expect(errors, `控制台报错：${errors.join(' | ')}`).toEqual([]);
});

/**
 * 图库档：块里是卡片网格而不是表格。集合屏的画廊档只有「新建条目」这一张虚线卡（卡片本身
 * 只读，没有单元格入口），所以加一行后回文档核对的是那张卡：主列空白 ⇒ 标题「未命名」。
 */
test('a gallery embed renders the row as a card', async ({ page }) => {
  await signIn(page);

  const { documentUrl, block } = await insertCollectionBlock(page, '图库');
  await expect(block).toHaveAttribute('data-view', 'gallery');
  await expectEmbedText(block, '暂无条目');
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 60_000 });
  const collectionId = await block.getAttribute('data-collection-block');
  expect(collectionId, '集合块没带上集合 id').toBeTruthy();

  await gotoWithRetry(page, `/collections/${collectionId}`);
  const addRow = page.getByRole('main').getByRole('button', { name: '新建条目', exact: true });
  await expect(addRow).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('main').locator('article')).toHaveCount(0, { timeout: 15_000 });
  await addRow.click();
  await expect(page.getByRole('main').locator('article')).toHaveCount(1, { timeout: 30_000 });

  await gotoWithRetry(page, documentUrl);
  const again = page.locator('[data-collection-block][data-view="gallery"]').first();
  await expect(again).toBeVisible({ timeout: 60_000 });
  // 卡片档不是表格：块内是 article 卡，不是 table。
  await expect(again.locator('table')).toHaveCount(0);
  await expect(again.locator('article')).toHaveCount(1);
  await expectEmbedText(again, '未命名');

  await page.reload();
  const afterReload = page.locator('[data-collection-block][data-view="gallery"]').first();
  await expect(afterReload).toBeVisible({ timeout: 60_000 });
  await expect(afterReload.locator('article')).toHaveCount(1);
  await expectEmbedText(afterReload, '未命名');
});

/**
 * 看板档：没有单选列时块里给官方的原句，而不是空白或入口卡。集合屏的看板在 0 行时也只
 * 答这一句（不出现「新建」），所以守卫句必须排在「暂无条目」之前。
 */
test('a kanban embed without a select column answers the official sentence', async ({ page }) => {
  await signIn(page);

  const { block } = await insertCollectionBlock(page, 'Kanban');
  await expect(block).toHaveAttribute('data-view', 'kanban');
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 60_000 });

  const guard = '添加一个支持的属性并按其分组以使用 Kanban 视图。';
  // 0 行且没有单选列：块里是官方原句，不是「暂无条目」。
  await expectEmbedText(block, guard);
  await expect(block.getByText('暂无条目')).toHaveCount(0);

  await page.reload();
  const again = page.locator('[data-collection-block][data-view="kanban"]').first();
  await expect(again).toBeVisible({ timeout: 60_000 });
  await expectEmbedText(again, guard);
});
