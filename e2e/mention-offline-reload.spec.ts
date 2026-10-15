import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * `gap.md` G1520 —— 显示名缓存要活过整页重载。
 *
 * 场景：**离线邀请了人**（成员行还在本机 pending、没推上去），此时刷新页面。刷新后服务端名单
 * 里没有那枚人（没推出去），只能靠本机 pending 行 + 显示名缓存把 `@` 名单补上；而缓存此前只在
 * 内存里 ⇒ 刷新即失、那枚人被跳过（见 G1507 的"标不出名字就不收"口径）。本批把缓存落进内核
 * 同一座库的 kv 段，刷新后先 hydrate 再叠 pending。
 *
 * ☆ "离线"＝**掐掉 `/api/v1/sync` 的 POST**（增量推不出去），但 GET 与页面 Server Action 照常：
 *   邀请那一步要 `resolveDocumentMember`（服务端读账号）成功，才有显示名可学。
 */
const OWNER = { email: 'craft-display-reload@example.com', password: 'test1234', name: '显示名甲' };
const PEER = { email: 'craft-display-reload-peer@example.com', password: 'test1234', name: '缓存协作者乙' };

type Account = typeof OWNER;

async function signIn(page: Page, account: Account) {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', account.name);
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.fill('#confirmPassword', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 25_000 });
}

async function ensureAccount(browser: Browser, account: Account) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, account);
  await context.close();
}

/** 只掐断增量**写**（POST /api/v1/sync）；GET 与页面 Server Action 照常放行。 */
async function blockSyncPush(page: Page) {
  await page.route('**/api/v1/sync', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({ status: 500, contentType: 'text/plain', body: 'no push' });
    }
    return route.continue();
  });
}

test('离线邀请后刷新页面，`@` 名单里那枚人还在（显示名缓存落进内核）', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await ensureAccount(browser, PEER);
  await signIn(page, OWNER);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.getByPlaceholder('页面标题').fill(`显示名缓存 ${Date.now()}`);
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 30_000 });

  // 先掐断增量写：下面那次邀请的成员行会一直留在本机 pending。
  await blockSyncPush(page);

  await page.getByRole('button', { name: '信息', exact: true }).click();
  await page.locator('input[aria-label="协作者邮箱"]').fill(PEER.email);
  await page.getByLabel('添加协作者').click();
  await expect(page.getByText(PEER.name).first()).toBeVisible();

  // ☆ 决定性的一步：刷新页面（内存缓存清空）。服务端名单里没有 PEER（没推出去），
  //   只有落进内核的缓存 + 本机 pending 行能把这枚人补进 `@`。
  await page.reload();
  await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 30_000 });

  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  // 空查询：列出全部候选（写 `@缓存` 只会匹配到 PEER，正控制那枚发起者就看不见了）。
  await page.keyboard.type('@');
  await expect(page.getByText('提及人员')).toBeVisible({ timeout: 20_000 });

  // 正控制：发起者一定在名单里 ⇒ 证明菜单确实加载了、不是空列表空过。
  await expect(page.getByRole('button', { name: /显示名甲/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /缓存协作者乙/ })).toBeVisible({ timeout: 20_000 });
});
