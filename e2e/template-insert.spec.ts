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
  await expect(page.getByRole('status')).toHaveText('已保存', { timeout: 20_000 });

  // The button lives under 信息 → 动作, the same sub-page the version-history test walks.
  await page.getByRole('button', { name: '信息', exact: true }).click();
  await page.getByRole('button', { name: '动作', exact: true }).click();
  await page.getByRole('button', { name: '另存为模板' }).click();
  await expect(page.getByRole('button', { name: '已保存为模板' })).toBeVisible();

  // A fresh document, so anything in it came from the insertion.
  await newDocument(page);
  const target = page.locator('[contenteditable="true"]').first();
  await target.click();
  await page.keyboard.type('/', { delay: 60 });

  const option = page
    .locator('[role="option"] div.font-medium')
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
