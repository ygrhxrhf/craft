import { expect, test } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

/**
 * G240: starring is an offline-kernel write. The row the tree menus show must come from the
 * local mirror (so the label flips without waiting for the server), the favorites view must
 * state the privacy line Craft states, and both directions must survive a reload -- which is
 * what separates a pushed applyLocal from an optimistic overlay.
 */
test('收藏 writes through the offline kernel and reads back on the favorites view', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const sidebar = page.locator('aside');
  const title = `收藏离线写 ${Date.now()}`;

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(title);
  await page.waitForTimeout(1_500);
  await page.keyboard.press('Control+s');
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  // The tree refetches on navigation, so reload to get the row.
  await page.goto('/documents');
  const row = sidebar.getByText(title, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });

  await row.click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: '添加到收藏' }).click();

  await page.goto('/favorites');
  await expect(page.getByText('只有你可以查看收藏的项目')).toBeVisible();
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 20_000 });

  // The menu label comes from the mirror, not from a server round trip.
  await page.goto('/documents');
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: '取消收藏' }).click();

  await page.goto('/favorites');
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
});

/** G46: the ledger keeps two names for the unfiled collection -- the row is 未归档, the view is 未分类. */
test('the sidebar row and the page it opens carry their own official names', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const sidebar = page.locator('aside');
  await expect(sidebar.getByRole('link', { name: '未归档', exact: true })).toBeVisible();

  await sidebar.getByRole('link', { name: '未归档', exact: true }).click();
  await expect(page).toHaveURL(/\/inbox/);
  await expect(page.locator('main').getByText('未分类', { exact: true }).first()).toBeVisible();
});
