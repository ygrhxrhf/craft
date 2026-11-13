import { expect, test, type Page } from '@playwright/test';

// G04: a document link has a view and an edit tier, the edit tier reaches the document
// through the same collab authorization chain a invited member uses, and taking the tier
// away ends the live session instead of waiting for the claim to expire.
const OWNER = { email: 'craft-test@example.com', password: 'test1234' };
const EDITOR = { email: 'e2e-share-editor@example.com', password: 'test1234' };

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/);
}

/** The account has to exist as a real login, so it goes through the register endpoint. */
async function ensureAccount(page: Page, account: { email: string; password: string }) {
  const res = await page.request.post('/api/auth/register', {
    data: { name: 'E2E Share Editor', email: account.email, password: account.password },
  });
  expect([200, 201, 409]).toContain(res.status());
}

async function createDocument(page: Page, title: string, marker: string): Promise<string> {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\/[\w-]+/);
  const documentId = page.url().split('/').pop() as string;

  await page.getByPlaceholder('页面标题').fill(title);
  const body = page.locator('.ProseMirror').first();
  await body.click();
  await page.keyboard.type(marker);
  await expect(page.getByText('所有更改已保存', { exact: true })).toBeVisible({ timeout: 20_000 });
  return documentId;
}

async function openShareDialog(page: Page) {
  // G931: 入口按钮的可见文本是「共享」；浮层可见头是「邀请协作」。
  await page.getByRole('button', { name: '共享' }).first().click();
  await expect(page.getByText('邀请协作')).toBeVisible();
}

async function shareLink(page: Page): Promise<string> {
  const text = await page.getByText(/\/s\/[A-Za-z0-9-]+/).first().textContent();
  const token = /\/s\/([A-Za-z0-9-]+)/.exec(text ?? '')?.[1];
  if (!token) throw new Error('分享弹层里没有可读的 /s/ 链接');
  return `/s/${token}`;
}

/** G932: 档位是下拉单值选择器——当前值挂在触发器上，选项只在展开时渲染。 */
const TIER_VALUE = { view: 'linkView', edit: 'linkEdit' } as const;

async function setTier(page: Page, tier: 'view' | 'edit') {
  const trigger = page.getByTestId('share-tier-trigger');
  await expect(trigger).toBeEnabled({ timeout: 30_000 });
  if ((await trigger.getAttribute('data-share-permission-value')) === TIER_VALUE[tier]) return;
  await trigger.click();
  const option = page.locator(`[data-share-permission="${TIER_VALUE[tier]}"]`);
  await expect(option).toBeEnabled({ timeout: 30_000 });
  await option.click();
  await expect(trigger).toHaveAttribute('data-share-permission-value', TIER_VALUE[tier]);
}

/** Publishes the link on the given tier and returns its path. */
async function shareAtTier(page: Page, tier: 'view' | 'edit'): Promise<string> {
  await openShareDialog(page);
  await page.getByRole('switch', { name: '发布为公开页面' }).click();
  await setTier(page, tier);
  return shareLink(page);
}

async function editorBody(page: Page) {
  const body = page.locator('.ProseMirror').first();
  await expect(body).toBeVisible({ timeout: 30_000 });
  return body;
}

test('the share dialog offers a view tier and an edit tier, and the tier is what the server holds', async ({
  page,
  browser,
}) => {
  await login(page, OWNER);
  const stamp = Date.now();
  const marker = `档位哨兵${stamp}`;
  const documentId = await createDocument(page, `G04T1${stamp}`, marker);

  await openShareDialog(page);
  const trigger = page.getByTestId('share-tier-trigger');
  await expect(trigger).toBeEnabled({ timeout: 30_000 });
  await trigger.click();
  await expect(page.locator('[data-share-permission="linkView"]')).toBeVisible();
  await expect(page.locator('[data-share-permission="linkEdit"]')).toBeVisible();
  await trigger.click();

  await page.getByRole('switch', { name: '发布为公开页面' }).click();
  await setTier(page, 'edit');
  const link = await shareLink(page);

  // The dialog paints the choice from local state, which proves nothing. Reopen it after a
  // full reload: only a share row that really holds `edit` comes back selected.
  //
  // ☆ 为什么这里要 `toPass` 而不是一次断言：档位现在走内核（`applyLocal` + 2s 去抖推送），
  //   从"点下去"到"服务端那一行真的改了"之间有一个窗口；面板挂载时读的还是上一次的值，
  //   而这一次读到的值不会自己翻新。旧代码走 `'use server'` 时写入在服务端 action 返回前
  //   就落库了，所以同一条断言以前一次就过。每一趟都是"整页重载 + 服务端重新读"，本地乐观
  //   状态进不了判定——收敛不到 'edit' 就是真没写进去。
  await expect(async () => {
    await page.goto(`/documents/${documentId}`);
    await openShareDialog(page);
    await expect(trigger).toHaveAttribute('data-share-permission-value', 'linkEdit');
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  // The edit tier is still read-only for someone with no account at all.
  const visitor = await browser.newContext();
  const view = await visitor.newPage();
  await expect(async () => {
    await view.goto(link);
    expect(await view.getByText(marker).count()).toBe(1);
  }).toPass({ timeout: 20_000 });
  await expect(view.locator('.ProseMirror').first()).toHaveAttribute('contenteditable', 'false');
  await expect(view.getByText('生成 · 只读视图')).toBeVisible();

  await visitor.close();
});

test('a signed-in visitor on the edit tier edits live, and taking the tier ends that session', async ({
  browser,
}) => {
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await login(owner, OWNER);

  const stamp = Date.now();
  const marker = `协作哨兵${stamp}`;
  const documentId = await createDocument(owner, `G04T2${stamp}`, marker);

  const link = await shareAtTier(owner, 'edit');

  const visitorCtx = await browser.newContext();
  const visitor = await visitorCtx.newPage();
  await ensureAccount(visitor, EDITOR);
  await login(visitor, EDITOR);
  await visitor.goto(link);

  // Editing through the link is the collab chain deciding, not the page: the body is
  // editable only because the server signed an editor claim for this visitor.
  const visitorBody = await editorBody(visitor);
  await expect(visitorBody).toHaveAttribute('contenteditable', 'true', { timeout: 30_000 });
  await expect(visitor.getByText('生成 · 可编辑视图')).toBeVisible();
  await visitorBody.click();

  const liveMarker = `访客实时写入${stamp}`;
  await visitor.keyboard.type(liveMarker);
  await expect(owner.getByText(liveMarker)).toBeVisible({ timeout: 25_000 });

  // Take the tier away. The open session ends instead of riding out the claim's TTL.
  await owner.goto(`/documents/${documentId}`);
  await openShareDialog(owner);
  await setTier(owner, 'view');

  await expect(visitor.getByText(/已断开|权限已变更/)).toBeVisible({ timeout: 25_000 });

  const afterRevoke = `撤销后写入${stamp}`;
  await visitor.locator('.ProseMirror').first().click();
  await visitor.keyboard.type(afterRevoke);
  await owner.reload();
  await expect(owner.locator('.ProseMirror').first()).toContainText(liveMarker, { timeout: 25_000 });
  await expect(owner.getByText(afterRevoke)).toHaveCount(0);

  // A reload of the same link is read-only now: the token route no longer grants it.
  await visitor.goto(link);
  await expect(visitor.locator('.ProseMirror').first()).toHaveAttribute('contenteditable', 'false');

  // The owner keeps editing their own document after closing the tier down.
  await owner.goto(`/documents/${documentId}`);
  const ownerBody = await editorBody(owner);
  await expect(ownerBody).toHaveAttribute('contenteditable', 'true');
  await ownerBody.click();
  const ownerMarker = `撤销后所有者仍可写${stamp}`;
  await owner.keyboard.type(ownerMarker);
  await expect(owner.getByText(ownerMarker)).toBeVisible();
  await expect(owner.getByText('所有更改已保存', { exact: true })).toBeVisible({ timeout: 20_000 });

  await visitorCtx.close();
  await ownerCtx.close();
});
