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

const GROUPS = ['未归档', '今天', '即将进行', '所有任务'] as const;

/**
 * G46: the four official groups are routes, not stacked sections — `/tasks/inbox` is this page's
 * official ref and `/tasks/all` was observed on screen, so each click has to land on its own URL
 * and mark itself current. The labels are the verbatim `browse.sidebar.inbox` / `tasks.today` /
 * `tasks.upcoming` / `tasks.all.tasks` strings, which the unit test pins against the ledger; what
 * this test pins is that they are *reachable* and that they route.
 */
test('the tasks page offers the four official groups and routes each one', async ({ page }) => {
  await signIn(page);
  await page.goto('/tasks');

  const nav = page.getByTestId('task-groups');
  for (const label of GROUPS) {
    await expect(nav.getByText(label, { exact: true }), `missing group: ${label}`).toBeVisible();
  }
  await expect(nav.getByText('未归档', { exact: true })).toHaveCount(1);

  // The default route is the inbox view.
  await expect(page.locator('a[aria-current="page"]')).toHaveText('未归档');

  await nav.getByText('今天', { exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/today$/);
  await expect(page.locator('a[aria-current="page"]')).toHaveText('今天');

  await nav.getByText('所有任务', { exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/all$/);
  await expect(page.locator('a[aria-current="page"]')).toHaveText('所有任务');

  // A view with no rows still offers the official add-task button rather than a dead end.
  await nav.getByText('即将进行', { exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\/upcoming$/);
  const empty = page.getByText('这个分组里暂时没有任务');
  if (await empty.isVisible().catch(() => false)) {
    await expect(page.getByRole('button', { name: '添加任务' })).toBeVisible();
  }
});
