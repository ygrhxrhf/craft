import { expect, test, type Page } from '@playwright/test';
import { openEditorPanel } from './editor-panel';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

async function openInsertPanel(page: Page) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await openEditorPanel(page, '插入');
}

/**
 * The panel's shape is a collected fact, not a local style choice: `interactions.md:110` captured
 * it twice at byte-identical length — ten flat entries, one 「合集」 group title, three tail rows.
 * The negative half matters as much as the positive one: this build's panel used to be *every*
 * slash command under seven group headers, so 「标题 1」 and 「无序列表」 still being reachable here
 * is exactly the regression this batch exists to remove.
 */
test('the insert panel is the official sixteen entries with one group title', async ({ page }) => {
  await signIn(page);
  await openInsertPanel(page);

  const panel = page.getByTestId('insert-panel');
  await expect(panel.getByText('将任何项目拖放到文档中')).toBeVisible();

  for (const label of [
    '文本',
    '页面',
    '卡片',
    '文件附件',
    '图片',
    '插入 Unsplash 图片',
    '代码块',
    '公式（TeX）',
    'Mermaid 图表',
    '白板',
    '图库',
    'Kanban',
    '插入 线',
    '插入分页符',
    '插入表格',
  ]) {
    await expect(panel.getByText(label, { exact: true }).first(), `missing official entry: ${label}`).toBeVisible();
  }

  // One group title, verbatim.
  await expect(panel.getByText('合集', { exact: true })).toHaveCount(1);

  // Entries this build cannot produce are shown, disabled, and marked — not silently dropped.
  const missing = panel.getByRole('button', { name: /本地暂未实现/ });
  expect(await missing.count()).toBeGreaterThan(0);
  for (const button of await missing.all()) {
    await expect(button).toBeDisabled();
  }

  // Negative: the slash menu's items are not the panel's items.
  await expect(panel.getByText('标题 1', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('无序列表', { exact: true })).toHaveCount(0);
  await expect(panel.getByText('全部展开', { exact: true })).toHaveCount(0);
});
