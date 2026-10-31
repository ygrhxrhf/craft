import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G1491 —— 官方那一档事实：分享权限改了以后，**另一台设备上的分享对话框要能读到最新档**，
 * 而且这个读写在离线时也要成立。
 *
 * 修好之前这条要红三处，而且三处都是"屏上看不出来"的形状：
 * ① 改档走的是 `'use server'` 的 `setSharePermission` ⇒ 服务端通路一断就整块面板动不了；
 * ② 那枚 action 是全仓唯一不发广播的一枚 ⇒ 另一台设备只能等自己下次进面板才发现；
 * ③ `document_share.cols` 不含 `permission`／`shareVersion` ⇒ 就算改成走内核，
 *    push 侧 `route.ts:283` 与 pull 侧 `:104` 都是"与 cols 求交"，名单外的键**当场丢弃**，
 *    于是本机乐观选中、服务端一行没变、屏上一点看不出来（G1487 那一族失真的机制本体）。
 *
 * ☆ 这里的"离线"是**掐掉 Server Action**（带 `Next-Action` 头的那几枚 POST），不是掐网络：
 *   本批要证的正是"改档这件事不再依赖服务端通路"，而增量还得靠 `/api/v1/sync` 推出去。
 *   真断网只能证明"没推出去"，证不了红线。
 */
const OWNER = { email: 'craft-share-tier@example.com', password: 'test1234', name: '分享档位双设备' };

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

/** 打开分享弹层并等档位按钮出现（弹层首帧走的是服务端读，链路可用时才谈得上下面的断言）。 */
async function openSharePanel(page: Page) {
  await page.locator('button[aria-label="分享"]').click();
  await expect(page.getByText('分享此文档')).toBeVisible();
  await expect(page.locator('[data-share-permission="view"]')).toBeVisible();
}

function tierButton(page: Page, tier: 'view' | 'edit') {
  return page.locator(`[data-share-permission="${tier}"]`);
}

/**
 * Server Actions are POSTs to the page route carrying a `Next-Action` header. Blocking those while
 * leaving `/api/v1/sync` alone is the point of this spec: 改档如果还依赖服务端通路就必然红。
 */
async function blockServerActions(page: Page) {
  await page.route('**/documents/**', (route) => {
    const request = route.request();
    const isAction = request.method() === 'POST' && request.headers()['next-action'] !== undefined;
    return isAction ? route.fulfill({ status: 500, contentType: 'text/plain', body: 'no server action' }) : route.continue();
  });
}

test('改档不靠服务端通路也能成立，并且另一台设备的分享面板读得到最新档', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page);

  const stamp = Date.now();
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const docUrl = page.url();
  await page.getByPlaceholder('页面标题').fill(`档位 ${stamp}`);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });

  // 先正常开一次面板：这一趟要建立 `document_share` 那一行（`getOrCreateShare` 本来就是服务端读）。
  await openSharePanel(page);
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'true');

  await blockServerActions(page);
  await tierButton(page, 'edit').click();
  await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true');

  // ☆ 决定性的一条：服务端通路此刻是断的。旧代码这里发的是 `setSharePermission`（500）⇒
  //   面板会翻出「档位没有保存，请重试」并把选中掰回上一档；走内核则什么都不必说。
  await expect(page.getByText('档位没有保存，请重试')).toHaveCount(0);
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'false');

  // ☆☆ 再来回一次：第一趟走的是"本地镜像还没有这一行 ⇒ 用面板挂载时读到的那行补种"那一路，
  //   补过之后镜像里就有这一行了，后面两趟走的是"镜像已有 ⇒ 只改那两列"那一路。
  //   两段都留在断链的关键路径上（服务端通路自始至终没恢复）。
  await tierButton(page, 'view').click();
  await expect(tierButton(page, 'view')).toHaveAttribute('aria-pressed', 'true');
  await tierButton(page, 'edit').click();
  await expect(tierButton(page, 'edit')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('档位没有保存，请重试')).toHaveCount(0);

  // 另一台设备：独立上下文＝自己的登录态与自己的本地库，读的是服务端权威行。
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage);
  await expect(async () => {
    await otherPage.goto(docUrl);
    await openSharePanel(otherPage);
    await expect(tierButton(otherPage, 'edit')).toHaveAttribute('aria-pressed', 'true');
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  await other.close();
});
