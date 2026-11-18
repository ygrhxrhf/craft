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

/**
 * G11 专注模式：三块面板收起、退出后布局还原。断言按"节点数"而不是"可见性"来核侧栏——
 * 侧栏折叠时是 `w-0 opacity-0`（仍在 DOM 里），用 toBeHidden 会把"折叠"误判成"专注生效"。
 */
test('focus mode hides the app chrome and restores it on exit', async ({ page }) => {
  await signIn(page);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);

  const aside = page.locator('aside[aria-label="导航侧栏"]');
  const topbar = page.locator('[data-testid="document-topbar"]');
  await expect(aside).toHaveCount(1);
  await expect(topbar).toBeVisible();

  // 右侧栏先打开着，才能验"退出后还原"而不是"退出后再点一次"。
  await openEditorPanel(page, '插入');
  const panel = page.getByTestId('insert-panel');
  await expect(panel).toBeVisible();

  await page.getByRole('button', { name: '专注模式' }).click();

  await expect(aside).toHaveCount(0);
  await expect(topbar).toBeHidden();
  await expect(panel).toHaveCount(0);

  const exitBar = page.getByTestId('focus-exit');
  await expect(exitBar).toHaveText(/^退出专注模式 • /);

  // 退出走快捷键（判据里的"退出快捷键"）：不点横条，键位必须同样生效。
  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.press('Control+.');
  await expect(aside).toHaveCount(1);
  await expect(topbar).toBeVisible();
  await expect(panel).toBeVisible();
  await expect(exitBar).toHaveCount(0);
});
