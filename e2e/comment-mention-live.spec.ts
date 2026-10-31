import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * `gap.md` G1519 —— 官方那一档事实：评论框的 `@` 名单与正文同源，且**挂着评论框时**刚邀的人
 * 当场进得了候选，不必整页重载。
 *
 * 修好之前：`MentionSuggest` 只在 `documentId` 变时 `useEffect` 拉一次并缓存进组件 state，
 * 之后 `document_member` 的任何变化都不重读 ⇒ 评论框里敲 `@` 看不到刚邀的人，得刷新页面。
 * 本批让它订阅 `onStoreChanged('document_member')`（与 `TrashList.tsx:81` 同法）。
 *
 * ☆ 判据的关键是"**不刷新**"：邀请与断言发生在同一张已挂载的页面上，评论框自始至终没被重挂。
 */
const OWNER = { email: 'craft-comment-mention@example.com', password: 'test1234', name: '评论提及甲' };
const PEER = { email: 'craft-comment-mention-peer@example.com', password: 'test1234', name: '评论协作者乙' };

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

/** Registers the peer account so the invite resolves, then drops the session. */
async function ensureAccount(browser: Browser, account: Account) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signIn(page, account);
  await context.close();
}

/** Opens the comment composer: type into the body, select it, click 评论所选文本. */
async function openComposer(page: Page) {
  const editor = page.locator('.ProseMirror').first();
  await editor.click();
  await page.keyboard.type('这是一段要被评论的正文');
  await page.keyboard.press('ControlOrMeta+a');
  await page.getByRole('button', { name: '评论所选文本' }).click();
  await expect(page.getByPlaceholder('写下评论...')).toBeVisible();
}

test('评论框挂着时刚邀的协作者当场进 `@` 候选，不必整页重载', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await ensureAccount(browser, PEER);
  await signIn(page, OWNER);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.getByPlaceholder('页面标题').fill(`评论提及 ${Date.now()}`);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });

  // 打开信息面板（成员段与评论段同在这一个面板里）。
  await page.getByRole('button', { name: '信息', exact: true }).click();

  // 先开评论框：此刻名单里只有发起者自己。
  await openComposer(page);
  const composer = page.getByPlaceholder('写下评论...');
  await composer.click();
  await page.keyboard.type('@评论');
  await expect(page.getByRole('button', { name: /评论协作者乙/ })).toHaveCount(0);
  // 清掉查询，避免挡住后面的邀请交互。
  await composer.fill('');

  // 在同一张已挂载的页面上邀请 PEER——评论框**不重挂**。
  const emailBox = page.locator('input[aria-label="协作者邮箱"]');
  await emailBox.fill(PEER.email);
  await page.getByLabel('添加协作者').click();
  await expect(page.getByText(PEER.name).first()).toBeVisible();

  // ☆ 决定性的一步：不刷新、不关评论框，直接敲 `@`——刚邀的人已经在候选里。
  await composer.click();
  await page.keyboard.type('@评论');
  await expect(page.getByRole('button', { name: /评论协作者乙/ })).toBeVisible({ timeout: 20_000 });
});
