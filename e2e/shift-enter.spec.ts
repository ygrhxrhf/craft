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
 * G615: official Craft's `Shift-Enter` is inert on a document page — measured twice on two
 * blocks with the `<br>` count staying at 0 while a plain `Enter` control still added a block
 * (`gap.md` G615). This build used to insert `<br>` because StarterKit's default HardBreak binds
 * that key. The second half is the same-cell control: if `Enter` also stopped producing blocks,
 * the first assertion would be passing for the wrong reason.
 */
test('Shift+Enter changes nothing while plain Enter still splits the block', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);
  await editor.click();

  await page.keyboard.type('abc');
  await page.keyboard.press('Shift+Enter');
  await page.keyboard.type('def');

  // No hard break was inserted: the two runs of text share one paragraph.
  await expect(editor.locator('br')).toHaveCount(0);
  await expect(editor).toContainText('abcdef');

  // Control: the key path itself is alive. Paragraph count is the lever — a fresh, unsaved
  // document has no block ids yet, so `[data-block-id]` counts 0 even after a real split.
  const blocksBefore = await editor.locator('p').count();
  await page.keyboard.press('Enter');
  await expect
    .poll(() => editor.locator('p').count(), { timeout: 10_000 })
    .toBeGreaterThan(blocksBefore);
});
