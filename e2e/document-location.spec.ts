import { expect, test } from '@playwright/test';
import { expandFolderSection } from './sidebar-folders';

const email = 'craft-test@example.com';
const password = 'test1234';

/** G203/G215: 「位置」 is a standing section of the info panel — 「未分类」 while the document
 *  belongs to nothing, the folder's name after it is filed away, and it re-reads in place rather
 *  than only after a reload. */
test('the location section names the folder, or 未分类', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const stamp = Date.now();
  const folderName = `位置核对 ${stamp}`;

  await page.getByRole('button', { name: '新建文件夹' }).click();
  // 同 inbox.spec：57 个根夹只渲染前 20 行，新夹在折叠线以下，不展开就取不到。
  await expandFolderSection(page);
  const freshFolder = page.locator('aside').getByText('无标题文件夹', { exact: true }).last();
  await expect(freshFolder).toBeVisible({ timeout: 20_000 });
  await freshFolder.click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: '重命名' }).click();
  const renameInput = page.locator('aside').getByRole('textbox');
  await renameInput.fill(folderName);
  await renameInput.press('Enter');
  // 改名要落库后才在「移动到…」列表里以新名出现（树重载在 dev 大数据集下慢，给足时间）。
  await expect(page.locator('aside').getByText(folderName, { exact: true })).toBeVisible({
    timeout: 120_000,
  });

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(`位置页 ${stamp}`);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);

  const location = page.locator('section').filter({ hasText: '位置' }).first();
  await page.getByRole('button', { name: '信息', exact: true }).click();
  await expect(location).toContainText('未分类', { timeout: 20_000 });

  // G204 之后信息面板是单列，动作项直接排在面板里，没有「动作／页面信息」子页签。
  await page.getByRole('button', { name: '移动到…', exact: true }).click();
  const targets = page
    .locator('div.rounded-lg.border')
    .filter({ has: page.getByRole('button', { name: '取消', exact: true }) });
  // The move list repeats the folder name the sidebar row also carries, so aim inside the panel.
  await expect(targets.getByText('未分类', { exact: true })).toBeVisible();
  await targets.getByRole('button').filter({ hasText: folderName }).click();

  // 位置段是常驻内容，移动后就地改写，不用切回别的页签。
  await expect(location).not.toContainText('未分类');
  await expect(location).toContainText(folderName);
});
