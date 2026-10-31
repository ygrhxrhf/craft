import { expect, test, type Page } from '@playwright/test';

// G04's browser half: the action layer and its unit tests were closed earlier, but no
// spec had ever driven the two-account line — 访客请求 → 所有者批准 → 访客可编辑, and
// the mirror case 拒绝 → 访客保持只读.
const OWNER = { email: 'craft-access-owner@example.com', password: 'test1234', name: '审批流所有者' };
const VIEWER = { email: 'craft-access-viewer@example.com', password: 'test1234', name: '审批流访客' };

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

/** A real login row is required, so the account goes through the register endpoint. */
async function ensureAccount(page: Page, account: { email: string; password: string; name: string }) {
  const res = await page.request.post('/api/auth/register', {
    data: { name: account.name, email: account.email, password: account.password },
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
  await page.locator('button[aria-label="分享"]').click();
  await expect(page.getByText('分享此文档')).toBeVisible();
}

/** Publishes the link on the view tier and returns its `/s/<token>` path. */
async function shareViewLink(page: Page): Promise<string> {
  await openShareDialog(page);
  await page.getByRole('switch', { name: '发布为公开页面' }).click();
  await expect(page.getByText('公开页面地址')).toBeVisible();
  const view = page.locator('[data-share-permission="view"]');
  await expect(view).toBeEnabled({ timeout: 30_000 });
  await view.click();
  await expect(view).toHaveAttribute('aria-pressed', 'true');

  const text = await page.getByText(/\/s\/[A-Za-z0-9-]+/).first().textContent();
  const token = /\/s\/([A-Za-z0-9-]+)/.exec(text ?? '')?.[1];
  if (!token) throw new Error('分享弹层里没有可读的 /s/ 链接');
  return `/s/${token}`;
}

/** A signed-in visitor on the view link only gets to ask, never to write. */
async function requestEdit(page: Page, link: string) {
  await page.goto(link);
  await expect(page.getByText('生成 · 只读视图')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: '请求编辑' }).click();
  await expect(page.getByText('已请求，等待批准')).toBeVisible({ timeout: 20_000 });
}

async function decideFirstRequest(page: Page, documentId: string, approve: boolean) {
  await page.goto(`/documents/${documentId}`);
  await openShareDialog(page);
  await expect(page.getByText('编辑请求')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: approve ? '批准' : '拒绝' }).first().click();
  await expect(page.getByText('编辑请求')).toHaveCount(0, { timeout: 20_000 });
}

test('a viewer can only request, and approval turns them into an editor', async ({ browser }) => {
  test.setTimeout(180_000);

  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await ensureAccount(owner, OWNER);
  await login(owner, OWNER);

  const stamp = Date.now();
  const documentId = await createDocument(owner, `审批批准${stamp}`, `批准哨兵${stamp}`);
  const link = await shareViewLink(owner);

  const viewerCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  await ensureAccount(viewer, VIEWER);
  await login(viewer, VIEWER);

  // Before approval: the link is read-only and the body refuses the caret.
  await requestEdit(viewer, link);
  await expect(viewer.locator('.ProseMirror').first()).toHaveAttribute('contenteditable', 'false');

  // The owner sees the pending row and approves it.
  await decideFirstRequest(owner, documentId, true);

  // After approval the member row is an editor, so the document route opens writable.
  await viewer.goto(`/documents/${documentId}`);
  const body = viewer.locator('.ProseMirror').first();
  await expect(body).toHaveAttribute('contenteditable', 'true', { timeout: 30_000 });
  await body.click();
  const written = `批准后可写${stamp}`;
  await viewer.keyboard.type(written);
  await expect(viewer.getByText('所有更改已保存', { exact: true })).toBeVisible({ timeout: 20_000 });

  // Persistence, not just local state: a reload re-reads the stored document.
  await viewer.reload();
  await expect(viewer.locator('.ProseMirror').first()).toContainText(written, { timeout: 30_000 });

  await viewerCtx.close();
  await ownerCtx.close();
});

test('declining a request leaves the viewer read-only', async ({ browser }) => {
  test.setTimeout(180_000);

  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await ensureAccount(owner, OWNER);
  await login(owner, OWNER);

  const stamp = Date.now();
  const documentId = await createDocument(owner, `审批拒绝${stamp}`, `拒绝哨兵${stamp}`);
  const link = await shareViewLink(owner);

  const viewerCtx = await browser.newContext();
  const viewer = await viewerCtx.newPage();
  await ensureAccount(viewer, VIEWER);
  await login(viewer, VIEWER);

  await requestEdit(viewer, link);
  await decideFirstRequest(owner, documentId, false);

  // No member row survived the decline, so the document route bounces the viewer out.
  await viewer.goto(`/documents/${documentId}`);
  await expect(viewer).toHaveURL(/\/documents$/, { timeout: 30_000 });

  // The link itself stays read-only too.
  await viewer.goto(link);
  await expect(viewer.locator('.ProseMirror').first()).toHaveAttribute('contenteditable', 'false');

  await viewerCtx.close();
  await ownerCtx.close();
});
