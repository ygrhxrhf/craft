import { expect, test, type Locator, type Page } from '@playwright/test';

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
  await page.fill('#name', `视图删除 ${Date.now()}`);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.waitForURL(/\/collections\//);
  await expect(page.getByRole('main')).toBeVisible();
}

const dialog = (page: Page): Locator => page.locator('[data-testid="imperative-dialog"]');
const tabs = (page: Page) => page.getByRole('tab');

/**
 * G1538：集合视图可删。官方文案逐字「删除视图」`collections.delete.view`。
 *
 * ☆ 一处产品取舍（本仓自己的决定，非官方）：**最后一个视图不可删**——集合详情页要靠一个激活视图
 * 才能渲染，删到零个会留下一个打不开的集合。故只剩一个视图时菜单项置灰。
 */
test('a collection view can be deleted, and the last one cannot', async ({ page }) => {
  await signIn(page);
  await createCollection(page);

  const main = page.getByRole('main');
  await expect(tabs(page)).toHaveCount(1);

  // 只剩一个视图 ⇒ 删除项置灰（否则集合会失去唯一承载面）
  await main.getByRole('button', { name: '视图操作' }).click();
  await expect(page.getByRole('menuitem', { name: '删除视图' })).toBeDisabled();
  await page.keyboard.press('Escape');

  // 建第二个视图（官方「添加视图」族，本地已有入口）
  await main.getByRole('button', { name: '视图', exact: true }).click();
  await page.getByRole('menuitem', { name: '看板' }).click();
  await expect(tabs(page)).toHaveCount(2, { timeout: 20_000 });
  await expect(tabs(page).nth(1)).toHaveText('看板');
  await page.screenshot({ path: 'screenshots/tmp-view-delete-before.png', fullPage: true });

  // 删掉当前激活视图 ⇒ 确认框要报出删的是哪一个，删完 Tab 少一个、集合仍然打得开
  // （新集合的激活视图叫「默认视图」，名字来自 `createCollection`）
  await main.getByRole('button', { name: '视图操作' }).click();
  await page.getByRole('menuitem', { name: '删除视图' }).click();
  await expect(dialog(page)).toContainText('删除视图');
  await expect(dialog(page)).toContainText('你确定要删除“默认视图”吗？');
  await page.screenshot({ path: 'screenshots/tmp-view-delete-confirm.png', fullPage: true });
  await dialog(page).getByRole('button', { name: '删除', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);

  await expect(tabs(page)).toHaveCount(1, { timeout: 20_000 });
  await expect(tabs(page).first()).toHaveText('看板');
  await expect(main).toBeVisible();

  // 刷新后仍然只有一个视图（软删真的落了库）
  await page.reload();
  await expect(tabs(page)).toHaveCount(1, { timeout: 20_000 });
  await expect(tabs(page).first()).toHaveText('看板');
  await page.screenshot({ path: 'screenshots/tmp-view-delete-after.png', fullPage: true });
});
