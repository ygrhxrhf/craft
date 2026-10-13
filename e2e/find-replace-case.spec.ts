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

async function openFindOnNewDoc(page: Page) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  // Probe the editor, type a body that mixes case, then open the panel via the editor keymap.
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type('ABC abc Abc aBc', { delay: 4 });
  await page.keyboard.press('Control+f');
  return page.getByTestId('find-replace-panel');
}

/**
 * G1418 in-registry shape: `match.case` is its own toggle alongside mode and scope. Off by default
 * the panel's count is case-insensitive; flipping it pins the RegExp to no `i` flag and the count
 * changes accordingly. A single regression loop toggling once each direction would never catch a
 * wiring that forgot the flag, so the test toggles twice and asserts both states.
 */
test('the case-sensitive toggle narrows and widens the count as expected', async ({ page }) => {
  await signIn(page);
  const panel = await openFindOnNewDoc(page);
  await expect(panel).toBeVisible();

  await page.getByTestId('find-replace-query').fill('abc');
  // Off: the count must reflect every match across the mixed-case body — the four substrings
  // `ABC`, `abc`, `Abc`, `aBc` all contain `abc` case-insensitively.
  await expect(panel.getByTestId('find-replace-count')).toHaveText('4 结果');
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'false');

  // On: the count drops to the lower-case 'abc' alone (4 → 1), the button flips to pressed.
  await page.getByTestId('find-replace-case').click();
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('1 结果');

  // Off again: every match returns and the count climbs back to 4.
  await page.getByTestId('find-replace-case').click();
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('4 结果');
});
