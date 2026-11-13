import { expect, test, type Page } from '@playwright/test';

// G956／G1486：右侧栏「开没开 ＋ 在哪个标签」存在 localStorage，跨文档保持。首帧若在
// useState 初始化器里直接读，服务端渲染的 aria-pressed／<aside> 与客户端首帧对不上 ⇒
// 重载任何开过面板的文档都报 hydration mismatch。这条用例证明两件事：重载后一条 hydration
// 报错都没有，且面板仍在原来那一档（只把初值钉死成「关着」也能做到前者，那是把持久态删了）。
const email = 'craft-test@example.com';
const password = 'test1234';

test.setTimeout(240_000);

const HYDRATION = /hydrat|did not match|server HTML|Text content/i;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/, { timeout: 90_000 });
}

/** 监听必须在导航之前挂上；返回"到目前为止采到的 hydration 报错"。 */
function hydrateErrors(page: Page) {
  const hits: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION.test(msg.text())) hits.push(msg.text());
  });
  page.on('pageerror', (error) => {
    if (HYDRATION.test(error.message)) hits.push(String(error));
  });
  return () => hits;
}

test('reloading an open right rail keeps its tab without a hydration mismatch', async ({ page }) => {
  await signIn(page);
  const hits = hydrateErrors(page);

  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);

  const infoButton = page.getByRole('button', { name: '信息', exact: true });
  await expect(infoButton).toHaveAttribute('aria-pressed', 'false');
  await infoButton.click();
  await expect(infoButton).toHaveAttribute('aria-pressed', 'true');
  // 面板真开：右侧栏里有「编辑器工具」页签条，且停在信息档。
  await expect(page.getByRole('tablist', { name: '编辑器工具' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('tab', { name: '信息' })).toHaveAttribute('aria-selected', 'true');

  // 落一次盘：localStorage 在点击时已写，但等标题落库避免重载打断别的写。
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 60_000 });
  await page.reload();

  await expect(page.getByRole('button', { name: '信息', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 60_000 }
  );
  await expect(page.getByRole('tab', { name: '信息' })).toHaveAttribute('aria-selected', 'true');
  expect(hits(), `hydration 报错：${hits().join(' | ')}`).toEqual([]);
});

test('closing the rail also persists — a fresh document does not reopen it', async ({ page }) => {
  await signIn(page);
  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);

  const infoButton = page.getByRole('button', { name: '信息', exact: true });
  await infoButton.click();
  await expect(infoButton).toHaveAttribute('aria-pressed', 'true');
  await infoButton.click();
  await expect(infoButton).toHaveAttribute('aria-pressed', 'false');

  await page.reload();
  // 「关着」也写进了存储：重载后仍是关的（只记标签会让关掉的面板自己又打开）。
  await expect(page.getByRole('button', { name: '信息', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
    { timeout: 60_000 }
  );
});
