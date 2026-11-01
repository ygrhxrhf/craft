import { expect, test, type Page } from '@playwright/test';

/**
 * G332/G333/G361/G365/G369: the task date field opens a popover whose top box parses dates.
 * A future phrase previews and commits; a past date is dropped without feedback; clearing
 * clears the field. These are the three behaviours the ledger measured on the official box.
 */
const email = 'craft-date-popover@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', '日期弹层测试');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 20_000 });
}

test('the task date popover parses, rejects the past and clears', async ({ page }) => {
  await signIn(page);

  const title = `日期弹层-${Date.now()}`;
  await page.goto('/tasks/all');
  await page.fill('input[placeholder="添加任务，按回车确认…"]', title);
  await page.keyboard.press('Enter');

  const row = page.locator('div.group', { hasText: title }).first();
  await expect(row).toBeVisible();

  // Open the schedule box.
  const chip = row.getByRole('button', { name: '设置计划日期' });
  await chip.click();
  const panel = page.getByTestId('task-date-popover');
  const box = panel.locator('input[aria-label="日期"]');
  await expect(box).toBeVisible();

  // A future phrase commits on Enter.
  await box.fill('下周五');
  await page.keyboard.press('Enter');
  await expect(chip).toContainText('计划');
  await expect(chip).not.toHaveText(/^计划$/);

  // A past date is silently dropped: the chip keeps its value.
  const before = await chip.textContent();
  await box.fill('2020-01-01');
  await page.keyboard.press('Enter');
  await expect(chip).toHaveText(before ?? '');

  // Clearing the box clears the field.
  await box.fill('');
  await page.keyboard.press('Enter');
  await expect(chip).toHaveText(/^计划$/);
});

/**
 * G362/G373/G374: reminder and repeat are two sub-rows of the date popover, and the reminder
 * row switches the popover into a time state where the date box disappears.
 */
test('the date popover carries reminder and repeat sub-rows', async ({ page }) => {
  await signIn(page);

  const title = `日期子行-${Date.now()}`;
  await page.goto('/tasks/all');
  await page.fill('input[placeholder="添加任务，按回车确认…"]', title);
  await page.keyboard.press('Enter');

  const row = page.locator('div.group', { hasText: title }).first();
  await row.getByRole('button', { name: '设置计划日期' }).click();

  const panel = page.getByTestId('task-date-popover');
  await panel.locator('input[aria-label="日期"]').fill('下周五');
  await page.keyboard.press('Enter');
  // The commit reloads the task list; let the row settle before the sub-rows.
  await page.waitForTimeout(1500);

  // Reminder opens a time state: the date box and the 今天 row are gone (G373).
  await page.getByRole('button', { name: /提醒我/ }).click();
  await expect(panel.locator('input[aria-label="日期"]')).toHaveCount(0);
  await expect(panel.locator('input[aria-label="小时"]')).toBeVisible();

  // Close, then reopen for the repeat sub-row (G374 offers date-aware labels).
  await page.getByRole('heading', { name: '任务收件箱' }).click();
  await row.getByRole('button', { name: '设置计划日期' }).click();
  await page.getByRole('button', { name: /重复…/ }).click();
  await expect(page.getByRole('button', { name: /每周 \(周/ })).toBeVisible();
});
