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

async function blankDocument(page: Page) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  return editor;
}

/**
 * G1552 (which withdrew G615): official Craft's `Shift-Enter` inserts a line break **inside** the
 * block — four independent runs read `<br>` 0→1 and the block text gained an inline break, with
 * the key not consumed. Plain `Enter` still splits into a new block; that control keeps the first
 * assertion from passing for the wrong reason.
 */
test('Shift+Enter inserts a line break while plain Enter still splits the block', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);
  await editor.click();

  await page.keyboard.type('abc');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('def');

  // One hard break: the two runs stay inside the same paragraph.
  await expect(editor.locator('p br')).toHaveCount(1);
  await expect(editor.locator('p').first()).toContainText('abcdef');

  // Control: the key path itself is alive. Paragraph count is the lever — a fresh, unsaved
  // document has no block ids yet, so `[data-block-id]` counts 0 even after a real split.
  const blocksBefore = await editor.locator('p').count();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => editor.locator('p').count(), { timeout: 10_000 })
    .toBeGreaterThan(blocksBefore);
});
