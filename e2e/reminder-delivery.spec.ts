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

async function createTaskWithPastReminder(page: Page, title: string) {
  await page.goto('/tasks');
  await page.getByPlaceholder('添加任务，按回车确认…').fill(title);
  await page.keyboard.press('Enter');

  const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
  await expect(card.getByText(title, { exact: true })).toBeVisible();
  await card.getByLabel('设置提醒与重复').click();
  // G332–G373: 提醒时间是 96 槽 select，槽 0 = 基准日 00:00；无计划/截止日期时基准取 now ⇒ 必已过期。
  await card.getByLabel('提醒时间').selectOption('0');
}

async function deleteTask(page: Page, title: string) {
  await page.goto('/tasks');
  const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
  if ((await card.count()) === 0) return;
  await card.getByLabel('删除任务').click();
  await expect(page.getByText(title, { exact: true })).toHaveCount(0);
}

const bell = (page: Page) => page.getByRole('button', { name: '通知', exact: true });
const badge = (page: Page) => bell(page).locator('span');
const panel = (page: Page) => page.locator('[aria-label="通知列表"]');

async function openBell(page: Page) {
  if ((await bell(page).getAttribute('aria-expanded')) !== 'true') await bell(page).click();
  await expect(panel(page)).toBeVisible();
}

/**
 * Move the 提醒 delivery switch to `want`. /settings renders no app header, so
 * the section button is the only 通知 on that route.
 */
async function setRemindersSwitch(page: Page, want: boolean) {
  await page.goto('/settings');
  await page.getByRole('button', { name: '通知', exact: true }).click();
  const reminders = page.getByRole('heading', { name: '提醒', exact: true })
    .locator('xpath=..')
    .getByRole('switch');
  if ((await reminders.getAttribute('aria-checked')) !== String(want)) {
    await reminders.click();
  }
  await expect(reminders).toHaveAttribute('aria-checked', String(want));
}

test('a reminder that came due arrives in the bell and stays resolved across a reload', async ({ page }) => {
  await signIn(page);
  // The shared account may be left switched off by another spec, so state the
  // precondition instead of assuming it.
  await setRemindersSwitch(page, true);

  const title = `G02 到期提醒 ${Date.now()}`;
  await createTaskWithPastReminder(page, title);

  // Delivery rides the metadata poll, and the panel refetches when it reports a
  // Notification change, so wait on the row itself rather than on the badge
  // (leftover rows from earlier runs would light the badge too).
  await openBell(page);
  await expect(panel(page).getByText(title)).toBeVisible({ timeout: 30_000 });
  await expect(badge(page)).toBeVisible();

  await panel(page).getByRole('button', { name: '已解决' }).first().click();
  await expect(panel(page).getByText(title)).toHaveCount(0);

  // A reload re-pulls the rows, so only a stored resolution keeps it away.
  await page.reload();
  await openBell(page);
  await expect(panel(page).getByText(title)).toHaveCount(0);

  await deleteTask(page, title);
});

test('the reminders switch decides whether a due reminder is delivered at all', async ({ page }) => {
  await signIn(page);

  await setRemindersSwitch(page, false);

  const title = `G02 关掉的提醒 ${Date.now()}`;
  await createTaskWithPastReminder(page, title);

  // Past the reminder moment and several poll ticks, nothing was generated.
  await page.waitForTimeout(8_000);
  await openBell(page);
  await expect(panel(page).getByText(title)).toHaveCount(0);

  await setRemindersSwitch(page, true);

  await page.goto('/tasks');
  await openBell(page);
  await expect(panel(page).getByText(title)).toBeVisible({ timeout: 30_000 });

  await panel(page).getByRole('button', { name: '已解决' }).first().click();
  await deleteTask(page, title);
});
