import { expect, test } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

/** G47's remaining half: `/tags` lists every tag with its document count and nests the second
 *  level under its parent; a tag row opens that tag's documents. */
test('the tags collection counts documents and nests the second level', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const stamp = Date.now();
  const parent = `总页${stamp}`;
  const leaf = `子${stamp}`;

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  const title = `标签总页 ${stamp}`;
  await page.locator('input[placeholder="页面标题"]').fill(title);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);

  await page.getByRole('button', { name: '信息', exact: true }).click();
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('textbox', { name: '添加标签' }) })
    .first();
  await expect(panel).toBeVisible({ timeout: 20_000 });
  const input = panel.getByRole('textbox', { name: '添加标签' });

  for (const name of [parent, `${parent}/${leaf}`]) {
    await input.fill(name);
    await expect(page.locator('#tag-feedback')).toHaveAttribute('data-tag-feedback', 'valid');
    await input.press('Enter');
    await expect(panel.getByText(name)).toBeVisible({ timeout: 20_000 });
  }
  await expect(panel.locator('h4')).toContainText('2 个标签');

  await page.getByRole('link', { name: '标签', exact: true }).click();
  await expect(page).toHaveURL(/\/tags$/);
  const main = page.locator('main');
  await expect(main.getByText('所有标签')).toBeVisible();
  await expect(main.getByText(/\d+ 个标签/)).toBeVisible();

  const parentRow = main.locator('li > a').filter({ hasText: parent }).first();
  await expect(parentRow).toContainText('1 个文档');
  // The nested row repeats only its own level, since the parent is already its heading.
  await expect(main.getByText(leaf, { exact: true })).toBeVisible();

  await parentRow.click();
  await expect(page).toHaveURL(/\/tags\/[a-z0-9-]+$/i);
  await expect(main.getByText(title)).toBeVisible();
});
