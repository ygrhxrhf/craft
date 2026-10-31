import { expect, test, type Page } from '@playwright/test';

const OWNER = { email: 'craft-test@example.com', password: 'test1234' };
const INTRUDER = { email: 'e2e-intruder@example.com', password: 'test1234' };

async function login(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(documents|settings|trash|favorites|recent|tasks|calendar|collections|whiteboards|templates|daily-notes)/);
}

async function ensureAccount(page: Page, account: { email: string; password: string }) {
  const res = await page.request.post('/api/auth/register', {
    data: { name: 'E2E Intruder', email: account.email, password: account.password },
  });
  // 201/200 = created, 409 = already exists. Anything else is a real failure.
  expect([200, 201, 409]).toContain(res.status());
}

test('a non-owner cannot open, collab-connect, or edit another user’s document', async ({
  browser,
}) => {
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await login(ownerPage, OWNER);

  await ownerPage.goto('/documents');
  await ownerPage.getByRole('button', { name: /新建/ }).first().click();
  await ownerPage.waitForURL(/\/documents\/[\w-]+/);
  const documentId = ownerPage.url().split('/').pop() as string;

  await ownerPage.locator('.ProseMirror .tiptap, [contenteditable="true"]').first().click();
  await ownerPage
    .locator('.ProseMirror .tiptap, [contenteditable="true"]')
    .first()
    .fill('私有内容 P0');
  await expect(ownerPage.getByText('所有更改已保存')).toBeVisible({ timeout: 15_000 });

  const intruderCtx = await browser.newContext();
  const intruderPage = await intruderCtx.newPage();
  await ensureAccount(intruderPage, INTRUDER);
  await login(intruderPage, INTRUDER);

  // Route guard: the editor never renders for a stranger.
  await intruderPage.goto(`/documents/${documentId}`);
  await intruderPage.waitForURL(/\/documents$/);
  await expect(intruderPage.locator('.ProseMirror')).toHaveCount(0);

  // Collaboration token: refused before any room is created.
  const tokenRes = await intruderPage.request.post('/api/collab/token', {
    data: { documentId },
  });
  expect(tokenRes.status()).toBe(404);
  const body = await tokenRes.json();
  expect(body.error).toBeTruthy();

  await ownerCtx.close();
  await intruderCtx.close();
});

test('a non-owner cannot open or join another user’s whiteboard', async ({ browser }) => {
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await login(ownerPage, OWNER);

  await ownerPage.goto('/whiteboards');
  await ownerPage.getByRole('button', { name: '新建白板' }).click();
  await ownerPage.waitForURL(/\/whiteboards\/[\w-]+/);
  const boardId = ownerPage.url().split('/').pop() as string;

  const intruderCtx = await browser.newContext();
  const intruderPage = await intruderCtx.newPage();
  await ensureAccount(intruderPage, INTRUDER);
  await login(intruderPage, INTRUDER);

  await intruderPage.goto(`/whiteboards/${boardId}`);
  await intruderPage.waitForURL(/\/whiteboards$/);
  await expect(intruderPage.locator('.tl-container')).toHaveCount(0);

  await ownerCtx.close();
  await intruderCtx.close();
});

test('the owner can grant read-only access from the info panel', async ({ browser }) => {
  test.setTimeout(300_000);
  const ownerCtx = await browser.newContext();
  const ownerPage = await ownerCtx.newPage();
  await login(ownerPage, OWNER);

  await ownerPage.goto('/documents');
  await ownerPage.getByRole('button', { name: /新建/ }).first().click();
  await ownerPage.waitForURL(/\/documents\/[\w-]+/);
  const documentId = ownerPage.url().split('/').pop() as string;

  const marker = `协作者只读 ${Date.now()}`;
  await ownerPage.locator('[contenteditable="true"]').first().click();
  await ownerPage.keyboard.type(marker, { delay: 8 });
  await ownerPage.keyboard.press('Control+s');
  await expect(ownerPage.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  const intruderCtx = await browser.newContext();
  const intruderPage = await intruderCtx.newPage();
  await ensureAccount(intruderPage, INTRUDER);
  await login(intruderPage, INTRUDER);

  // Without a grant the document is not theirs at all.
  await intruderPage.goto(`/documents/${documentId}`);
  await intruderPage.waitForURL(/\/documents$/);

  await ownerPage.getByRole('button', { name: '信息' }).first().click();
  await ownerPage.getByLabel('协作者邮箱').fill(INTRUDER.email);
  await ownerPage.getByLabel('新增协作者权限').selectOption('viewer');
  // ☆ 这一枚以前写的是 `getByRole('button',{name:'添加',exact:true})`＝严格模式两枚命中：
  //   同一个信息面板里标签段也有一枚「添加」。真缺陷在产品面（两枚同名按钮，读屏听不出区别），
  //   改法＝给协作者那枚补可及名 `添加协作者`（`MembersSection.tsx:199`），断言按名寻址。
  await ownerPage.getByLabel('添加协作者').click();
  await expect(
    ownerPage.getByLabel(`移除协作者 ${INTRUDER.email}`)
  ).toBeVisible({ timeout: 20_000 });

  // Granted read access: the body renders and the editor refuses writes.
  //
  // ☆ 为什么"别人能不能打开这篇文档"必须 `toPass` 而不是读一次：授权这一笔现在走内核
  //   （`MembersSection.tsx:64` 的 `applyLocal`）⇒ 上面那行 `移除协作者 …` 出现，只证明**本机**
  //   镜像改好了，服务端那一行还要等去抖推送（DEBOUNCE=2000）＋一次 RTT。官方是即时生效的，
  //   这段窗口就是产品洞，已单列成台账一行；本 spec 判的是"最终授权成立"，每一趟都是被授权人
  //   自己的上下文整页重载 + 服务端鉴权，本机乐观状态进不了判定。
  const body = intruderPage.locator('.ProseMirror').first();
  await expect(async () => {
    await intruderPage.goto(`/documents/${documentId}`);
    await expect(body).toContainText(marker);
    await expect(body).toHaveAttribute('contenteditable', 'false');
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  const tokenRes = await intruderPage.request.post('/api/collab/token', {
    data: { documentId },
  });
  expect(tokenRes.status()).toBe(200);
  const claims = await tokenRes.json();
  expect(claims.role).toBe('viewer');
  expect(claims.readOnly).toBe(true);

  // Revoking takes the page away again on the next load.
  await ownerPage.getByLabel(`移除协作者 ${INTRUDER.email}`).click();
  await expect(ownerPage.getByLabel(`移除协作者 ${INTRUDER.email}`)).toHaveCount(0);
  // ☆ 撤销同样是内核写入 ⇒ 服务端那一行也要等推送。这条不是"空过"＝上面那一趟已经证明他被授权时
  //   **打得开**（正文里读到本轮 marker），这里等的是同一枚判据反向翻面。
  await expect(async () => {
    await intruderPage.goto(`/documents/${documentId}`);
    await expect(intruderPage).toHaveURL(/\/documents$/);
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  await ownerCtx.close();
  await intruderCtx.close();
});
