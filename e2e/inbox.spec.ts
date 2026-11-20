import { expect, test } from '@playwright/test';
import { expandFolderSection } from './sidebar-folders';

const email = 'craft-test@example.com';
const password = 'test1234';

/** G45/G19: a document with no folder and no parent lands in 「未分类」 as a card, and the
 *  card's right-click 「移至」 files it away — the card leaves the grid and the write survives
 *  a reload, which is what separates a local overlay from an actual applyLocal push. */
test('the inbox collects unfiled documents and files them away', async ({ page }) => {
  // The seeded account carries ~500 documents; a folder rename re-renders the tree slowly.
  test.setTimeout(300_000);
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
  // craft-test 有 57 个根夹、侧栏只渲染前 20 行——新夹按 order/createdAt 排在并列组末尾，
  // 不展开就根本不在 DOM 里（不是"还没渲染好"，等多久都不会出现）。
  await expandFolderSection(page);
  const freshFolder = sidebar.getByText('无标题文件夹', { exact: true }).last();
  await expect(freshFolder).toBeVisible({ timeout: 20_000 });
  await freshFolder.click({ button: 'right' });
  await page.getByRole('menu').getByRole('menuitem', { name: '重命名' }).click();
  const renameInput = sidebar.getByRole('textbox');
  await renameInput.fill(folderName);
  await renameInput.press('Enter');
  // 120s：重命名后树要重载（applyLocal → flushNow → bumpTree），大数据集下实测约 81s；
  // 不能用"重试一次"兜底——第一次其实已落库，重试会把另一个无标题夹改成同名，菜单里出现两份。
  await expect(sidebar.getByText(folderName, { exact: true })).toBeVisible({ timeout: 120_000 });

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(title);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);
  await page.keyboard.press('Control+s');
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  await page.goto('/inbox');
  await expect(main.getByText('未分类', { exact: true }).first()).toBeVisible();
  const inboxCard = main.getByText(title, { exact: true });
  await expect(inboxCard).toBeVisible({ timeout: 20_000 });
  // G19：卡片没有常驻按钮，唯一入口是右键菜单——「移至」展开文件夹二级列表。
  await inboxCard.click({ button: 'right' });
  const menu = page.getByRole('menu');
  await menu.getByRole('menuitem', { name: '移至', exact: true }).click();
  await expect(menu.getByRole('menuitem', { name: '未分类', exact: true })).toBeVisible();
  await menu.getByRole('menuitem', { name: folderName, exact: true }).click();
  await expect(inboxCard).toHaveCount(0, { timeout: 20_000 });

  // 「移至」经同步内核异步推上服务端：刷新可能早于那一笔落地，于是卡片又回来了。
  // 重试到服务端也确认离开为止（同 member-remove-offline 的写法），而不是赌一次刷新。
  await expect(async () => {
    await page.reload();
    await expect(inboxCard).toHaveCount(0, { timeout: 10_000 });
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  // The folder badge counts it: the document left 未分类 and arrived in the folder.
  // showAllRows 是组件态，刷新即回到折叠——折叠线以下的行看不见，先展开再断言。
  await expandFolderSection(page);
  const folderRow = sidebar.locator('button').filter({ hasText: folderName });
  await expect(folderRow.getByText('1 个文档')).toBeVisible({ timeout: 20_000 });
});
