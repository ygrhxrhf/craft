import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * `gap.md` G1521 —— 官方那一档事实：移除协作者与添加协作者是同一条离线内核通路上的两笔动作，
 * 断链时都留得住。
 *
 * 修好之前：移除走 `'use server'` 的 `removeDocumentMember`（断链当场失败）；而且这条通路
 * 不是简单挪进内核就能修——`route.ts` 的 delete-op 落笔此前**无条件**写 `deletedAt`，而
 * `DocumentMember` 没有这一列（`contract.prisma`），挪过去会在服务端抛 unknown column。
 * 本批两步一起做：delete-op 的墓碑列按 `cols` 分档（缺列的表走真删除）＋移除改走 `applyLocal`。
 *
 * ☆ "断链"是**掐掉 Server Action**（带 `Next-Action` 头的 POST），不是掐网络：增量还得靠
 *   `/api/v1/sync` 推出去；真断网只能证明"没推出去"。
 */
const OWNER = { email: 'craft-member-remove@example.com', password: 'test1234', name: '成员移除甲' };
const PEER = { email: 'craft-member-remove-peer@example.com', password: 'test1234', name: '被移除乙' };
const KEEPER = { email: 'craft-member-remove-keeper@example.com', password: 'test1234', name: '留下的丙' };

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

test('断链时移除协作者仍成立，且刷新后那一行不再回来', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await ensureAccount(browser, PEER);
  await ensureAccount(browser, KEEPER);
  await signIn(page, OWNER);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const docUrl = page.url();
  await page.getByPlaceholder('页面标题').fill(`移除成员 ${Date.now()}`);
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 30_000 });

  // 邀请 PEER 与 KEEPER（都走内核，但 resolveDocumentMember 那一发是服务端读，此刻链路还通）。
  // ☆ KEEPER 是判据的正控制：移除 PEER 之后，"PEER 不在名册里"只有在名册**已经加载**时才算数，
  //   否则一枚还没渲染出来的空列表会让 toHaveCount(0) 空过（本批第一版就这么假绿了）。
  await page.getByRole('button', { name: '信息', exact: true }).click();
  const emailBox = page.locator('input[aria-label="协作者邮箱"]');
  for (const person of [PEER, KEEPER]) {
    await emailBox.fill(person.email);
    await page.getByLabel('添加协作者').click();
    await expect(page.getByText(person.name).first()).toBeVisible();
  }
  // 等两行都真推到服务端并拉回来（刷新后仍在），再谈"移除"。
  await expect(async () => {
    await page.reload();
    await page.getByRole('button', { name: '信息', exact: true }).click();
    await expect(page.getByText(PEER.name).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(KEEPER.name).first()).toBeVisible({ timeout: 10_000 });
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  // ☆ 决定性的一步：掐掉 Server Action，再移除协作者——旧代码这一下当场失败。
  await blockServerActions(page);
  await page.getByLabel(`移除协作者 ${PEER.email}`).click();
  // 本机乐观摘掉那一行（applyLocal 的墓碑经 pending 叠进名册），且不报错。
  await expect(page.getByText(PEER.name)).toHaveCount(0);
  await expect(page.getByText('移除协作者失败')).toHaveCount(0);

  // 解除封锁：下面两处判据读的都是**服务端权威行**（读侧仍是 server action，本就还没走内核）。
  await page.unroute('**/documents/**');

  // ☆☆ 真正的判据：开一个**全新上下文**（自己的 IndexedDB、没有本机 pending 墓碑）读服务端权威行。
  //   先等 KEEPER 出现＝名册确已加载，再断 PEER 不在——服务端硬删成功则不在；delete-op 抛错
  //   （整批 500、行还在）则 PEER 仍在，这一条会红。
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await signIn(freshPage, OWNER);
  await expect(async () => {
    await freshPage.goto(docUrl);
    await freshPage.getByRole('button', { name: '信息', exact: true }).click();
    await expect(freshPage.getByText(KEEPER.name).first()).toBeVisible({ timeout: 10_000 });
    await expect(freshPage.getByText(PEER.name)).toHaveCount(0);
  }).toPass({ timeout: 60_000, intervals: [2_000] });
  await fresh.close();

  // 本机刷新后那一行也不回来。
  await expect(async () => {
    await page.goto(docUrl);
    await page.getByRole('button', { name: '信息', exact: true }).click();
    await expect(page.getByText(KEEPER.name).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(PEER.name)).toHaveCount(0);
  }).toPass({ timeout: 60_000, intervals: [2_000] });
});
