import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G1509 —— 官方那一档事实：分享面板**开着**的时候，另一端改了档，这一侧的选中态跟着翻新，
 * 不需要关掉重开。
 *
 * 修好之前：他端推得到（G1491 补了 `setSharePermission` 那次广播），但 `ShareDialog` 不订阅 store
 * 变化，档位只在挂载那一刻读一次 ⇒ 开着的面板纹丝不动。本批让它订阅 `onStoreChanged('document_share')`。
 *
 * ☆ 两个面板**同时开着**是这条断言的关键：如果允许"关掉重开"，旧代码也能过（重开＝重新挂载＝重读）。
 */
const OWNER = { email: 'craft-share-live@example.com', password: 'test1234', name: '分享面板实时翻新' };

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', OWNER.email);
  await page.fill('input[type="password"]', OWNER.password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', OWNER.name);
  await page.fill('#email', OWNER.email);
  await page.fill('#password', OWNER.password);
  await page.fill('#confirmPassword', OWNER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 25_000 });
}

function tierButton(page: Page, tier: 'view' | 'edit') {
  return page.locator(`[data-share-permission="${tier}"]`);
}

async function openSharePanel(page: Page) {
  await page.locator('button[aria-label="分享"]').click();
  await expect(page.getByText('分享此文档')).toBeVisible();
  await expect(tierButton(page, 'view')).toBeVisible();
}

test('另一台设备改档时，这一侧开着的分享面板跟着翻新（不重开）', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page);

  const stamp = Date.now();
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const docUrl = page.url();
  await page.getByPlaceholder('页面标题').fill(`实时翻新 ${stamp}`);
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 30_000 });

  // 建行并坐实为 view（服务端权威行、本机镜像都到位）。
  await openSharePanel(page);
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'true');

  // 第二台设备：同一账号、独立上下文。先把面板开着并读到 view。
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage);
  await otherPage.goto(docUrl);
  await openSharePanel(otherPage);
  await expect(async () => {
    await expect(tierButton(otherPage, 'view')).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  // 第一台设备改档为 edit——**保持第二台设备的面板开着不动**。
  await tierButton(page, 'edit').click();
  await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true');

  // 他端推得到（广播 → pull → applyRemote → onStoreChanged）⇒ 开着的那枚面板自己翻新。
  await expect(tierButton(otherPage, 'edit')).toHaveAttribute('aria-pressed', 'true', { timeout: 60_000 });
  await expect(tierButton(otherPage, 'view')).toHaveAttribute('aria-pressed', 'false');

  await other.close();
});
