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

async function newDocument(page: Page): Promise<void> {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
}

/**
 * G19 从模板插入 (`commands.insert.template.inline`): the path is slash → picker → body at the
 * caret. The last assertion is the one that would break first if the slash query were cleared
 * *after* the pick instead of before: it would be stranded in the document.
 */
test('from a template, the body lands at the caret and the slash query is already gone', async ({ page }) => {
  await signIn(page);
  const marker = `模板正文 ${Date.now()}`;

  // A template can only be inserted if one exists, so make one the way the app does.
  await newDocument(page);
  const sourceTitle = `插入模板测试 ${Date.now()}`;
  await page.getByPlaceholder('页面标题').fill(sourceTitle);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(marker, { delay: 5 });
  // 保存徽标要按位置取：编辑器页上 `role="status"` 不止一个——侧栏「新建文档」「新建文件夹」
  // 各带一枚 sr-only 播报区，树一渲染出来就会命中，裸 getByRole('status') 会三枚齐中。
  await expect(page.locator('[data-testid="document-topbar"] [role="status"]')).toHaveText('所有更改已保存', {
    timeout: 20_000,
  });

  // 这枚按钮在「信息」面板的动作段里。G204 之后信息面板是单列到底，没有「动作／页面信息」
  // 两个子页签了（document-location.spec 同批记过），所以这里直接点，不再先切一档。
  await openEditorPanel(page, '信息');
  await page.getByRole('button', { name: '另存为模板' }).click();
  await expect(page.getByRole('button', { name: '已保存为模板' })).toBeVisible();

  // A fresh document, so anything in it came from the insertion.
  await newDocument(page);
  const target = page.locator('[contenteditable="true"]').first();
  await target.click();
  // 斜杠菜单在 G1544/G1613 之后是两段式：光打 `/` 只列分组入口，叶子项要带查询词才出来；
  // 行标题的载体也换成了 `span`，不再是 `div.font-medium`（editor.spec 同批改过同一处，这里漏了）。
  await page.keyboard.type('/从模板插入', { delay: 25 });

  const option = page
    .locator('[role="option"] span')
    .filter({ hasText: /^从模板插入$/ })
    .first();
  await expect(option, 'slash entry missing: 从模板插入').toBeVisible({ timeout: 10_000 });
  await option.click();

  const picker = page.getByTestId('template-picker');
  await expect(picker).toBeVisible();
  await expect(picker).toContainText('模板');
  await picker.getByText(`${sourceTitle} 模板`, { exact: true }).click();

  await expect(target).toContainText(marker, { timeout: 15_000 });
  await expect(target).not.toContainText('从模板插入');
});
