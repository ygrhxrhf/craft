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

function switchOf(page: Page, group: string) {
  // Each group holds one 电子邮件通知 switch, so address it through its own heading.
  return page.getByRole('heading', { name: group, exact: true })
    .locator('xpath=..')
    .getByRole('switch');
}

async function openNotifications(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: '通知', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveCount(3);

  // The account is shared with other specs, so normalize before asserting rather
  // than assuming the switches are on.
  for (const group of ['评论和提及', '提醒', '每日电子邮件']) {
    const toggle = switchOf(page, group);
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await toggle.click();
  }
  for (const group of ['评论和提及', '提醒', '每日电子邮件']) {
    await expect(switchOf(page, group)).toHaveAttribute('aria-checked', 'true');
  }
}

async function reopenNotifications(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: '通知', exact: true }).click();
  await expect(page.getByRole('switch')).toHaveCount(3);
}

test('the comments switch comes back off after a reload, and its neighbours are untouched', async ({ page }) => {
  await signIn(page);
  await openNotifications(page);

  const comments = switchOf(page, '评论和提及');
  await expect(comments).toHaveAttribute('aria-checked', 'true');
  await comments.click();
  await expect(comments).toHaveAttribute('aria-checked', 'false');

  // The reload re-reads the row, so this is the stored value rather than a local paint.
  await reopenNotifications(page);
  await expect(switchOf(page, '评论和提及')).toHaveAttribute('aria-checked', 'false');
  await expect(switchOf(page, '提醒')).toHaveAttribute('aria-checked', 'true');
  await expect(switchOf(page, '每日电子邮件')).toHaveAttribute('aria-checked', 'true');

  await switchOf(page, '评论和提及').click();
  await expect(switchOf(page, '评论和提及')).toHaveAttribute('aria-checked', 'true');
});

test('the daily switch comes back off on its own after a reload', async ({ page }) => {
  await signIn(page);
  await openNotifications(page);

  const daily = switchOf(page, '每日电子邮件');
  await daily.click();
  await expect(daily).toHaveAttribute('aria-checked', 'false');

  await reopenNotifications(page);
  await expect(switchOf(page, '每日电子邮件')).toHaveAttribute('aria-checked', 'false');
  await expect(switchOf(page, '评论和提及')).toHaveAttribute('aria-checked', 'true');

  await switchOf(page, '每日电子邮件').click();
  await expect(switchOf(page, '每日电子邮件')).toHaveAttribute('aria-checked', 'true');
});
