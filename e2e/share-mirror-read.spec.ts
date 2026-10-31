import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G1508 —— 官方那一档事实：分享面板的**读**走本机镜像，服务端通路断了也看得见现值。
 *
 * 判别点很硬：面板的档位按钮只在 `link` 有了之后才渲染（没有 link 时屏上是「生成链接中…」）。
 * 旧代码挂载时读的是 `getOrCreateShare`（服务端 action）⇒ 服务端通路一断，面板永远停在
 * 「生成链接中…」，档位现值读不到；改成"先吃镜像"之后，镜像里有这一行就当场渲染。
 *
 * ☆ 这里的"断链"是**掐掉 Server Action**（带 `Next-Action` 头的那几枚 POST），不是掐网络：
 *   增量还得靠 `/api/v1/sync` 进出，真断网只能证明"没推出去"，证不了"读走镜像"。
 */
const OWNER = { email: 'craft-share-mirror@example.com', password: 'test1234', name: '分享镜像读' };

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
}

/** Server Actions are POSTs to the page route carrying a `Next-Action` header. */
async function blockServerActions(page: Page) {
  await page.route('**/documents/**', (route) => {
    const request = route.request();
    const isAction = request.method() === 'POST' && request.headers()['next-action'] !== undefined;
    return isAction
      ? route.fulfill({ status: 500, contentType: 'text/plain', body: 'no server action' })
      : route.continue();
  });
}

test('服务端通路断掉、整页重载之后，分享面板仍从本机镜像读出档位现值', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);

  const stamp = Date.now();
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const docUrl = page.url();
  await page.getByPlaceholder('页面标题').fill(`镜像读 ${stamp}`);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });

  // 正常开一次面板并改到 edit：这一趟既建了服务端那一行，也把档位经 applyLocal 写进本机镜像。
  await openSharePanel(page);
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'true');
  await tierButton(page, 'edit').click();
  await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true');
  // 等增量推出去、服务端权威行也拉回来，镜像里这一行坐实（否则下面的重载读的是空镜像）。
  await expect(async () => {
    await page.reload();
    await openSharePanel(page);
    await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  // ☆ 决定性的一步：掐掉 Server Action，再整页重载。挂载读只能靠本机镜像。
  await blockServerActions(page);
  await page.goto(docUrl);
  await openSharePanel(page);

  // 旧代码：挂载 `getOrCreateShare` 收 500 ⇒ 停在「生成链接中…」，档位按钮根本不渲染。
  await expect(page.getByText('生成链接中…')).toHaveCount(0);
  await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true', { timeout: 20_000 });
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'false');
});
