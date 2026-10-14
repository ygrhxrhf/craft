import { expect, test } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

/** G45: a document with no folder and no parent lands in 「未分类」, and 「移动到…」
 *  files it away — the row leaves the list and the write survives a reload, which is
 *  what separates a local overlay from an actual applyLocal push. */
test('the inbox collects unfiled documents and files them away', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const stamp = Date.now();
  const folderName = `归档夹 ${stamp}`;
  const title = `未分类页 ${stamp}`;

  const sidebar = page.locator('aside');
  const main = page.locator('main');

  await page.getByRole('button', { name: '新建文件夹' }).click();
  const freshFolder = sidebar.getByText('无标题文件夹', { exact: true }).last();
  await expect(freshFolder).toBeVisible({ timeout: 20_000 });
  await freshFolder.click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: '重命名' }).click();
  const renameInput = sidebar.getByRole('textbox');
  await renameInput.fill(folderName);
  await renameInput.press('Enter');
  await expect(sidebar.getByText(folderName, { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(title);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);
  await page.keyboard.press('Control+s');
  await expect(page.getByText('已保存')).toBeVisible({ timeout: 20_000 });

  await page.goto('/inbox');
  await expect(main.getByText('未分类', { exact: true }).first()).toBeVisible();
  const inboxRow = main.getByText(title, { exact: true });
  await expect(inboxRow).toBeVisible({ timeout: 20_000 });

  await inboxRow.locator('xpath=../..').getByRole('button').click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: '未分类', exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: folderName, exact: true }).click();
  await expect(inboxRow).toHaveCount(0, { timeout: 20_000 });

  await page.reload();
  await expect(inboxRow).toHaveCount(0, { timeout: 20_000 });

  // The folder badge counts it: the document left 未分类 and arrived in the folder.
  const folderRow = sidebar.locator('button').filter({ hasText: folderName });
  await expect(folderRow.getByText('1 个文档')).toBeVisible({ timeout: 20_000 });
});
