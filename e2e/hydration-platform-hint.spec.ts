import { expect, test } from '@playwright/test';

// `gap.md` G1486：键位提示（`专注模式 • ⌘ .`、设置 → 快捷键 那一整列）是**渲染期**读出来的
// 文案。本地曾在 render 里直接 `detectPlatform()`：服务端没有 `navigator` ⇒ 答 `win`，
// 客户端首帧按真机 UA 答 `mac` ⇒ 两棵树不一致，React 报 hydration 错（开发态那枚红色
// "1 Issue" 角标就是这么烧进手机视口基线的）。这一支要证明的是屏上两件事：
// ① 整趟访问一条 hydration 报错都不许有；② 提示最终仍是真机那一端的 `⌘`——
// 只把两端都钉死成 `Ctrl` 也能做到①，那是把功能删了，不是修了。
// Own account so this spec never touches the visual matrix or the format-panel fixtures.
const email = 'craft-platform-hint@example.com';
const password = 'test1234';

// iPhone 的 UA 才是这条分支的开关（`keymap.ts` 读 `navigator.userAgent`），视口不是。
// 视口留在桌面档，是为了把"平台判定"与"手机布局"两件事分开测。
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

test.describe.configure({ timeout: 240_000 });
test.use({ userAgent: IPHONE_UA });

const HYDRATION = /hydrat|did not match|server HTML|Text content/i;

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 90_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', '平台提示测试');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 90_000 });
}

/** 挂上监听 ⇒ 返回"到目前为止采到的 hydration 报错"。监听必须在导航之前。 */
function hydrateErrors(page: import('@playwright/test').Page) {
  const hits: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' && HYDRATION.test(msg.text())) hits.push(msg.text());
  });
  page.on('pageerror', (err) => {
    if (HYDRATION.test(err.message)) hits.push(err.message);
  });
  return () => hits;
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('手机 UA 下打开文档：顶栏键位提示先与服务端一致，再修正成 ⌘', async ({ page }) => {
  const hits = hydrateErrors(page);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await expect(page).toHaveURL(/\/documents\//, { timeout: 90_000 });

  const focus = page.getByRole('button', { name: '专注模式', exact: true });
  await expect(focus).toBeVisible();
  // 挂载后才是真机那一端；这一条同时排掉"两端都写死 win"这种假修法。
  await expect(focus).toHaveAttribute('title', /^专注模式 • ⌘/, { timeout: 15_000 });

  expect(hits(), `hydration 报错：\n${hits().join('\n')}`).toEqual([]);
});

test('手机 UA 下打开设置 → 快捷键：整列键位都是 mac 那一串，且零 hydration 报错', async ({ page }) => {
  const hits = hydrateErrors(page);

  await page.goto('/settings');
  await page.getByRole('button', { name: '快捷键', exact: true }).click();
  const panel = page.getByTestId('shortcuts-panel');
  await expect(panel).toBeVisible();

  // 这一页的键位是**可见文字**（不是 title），所以它是这一族更强的判据。
  // 官方名册化之后，行的 testid 是 `shortcut-o-<tab>-<index>`（见 shortcut-official-rows 的
  // `o-${tab}-${index}`），不再按 binding id 命名——按可见标签找这一行。
  const focusRow = panel.locator('li').filter({ hasText: '切换专注模式' }).first();
  await expect(focusRow).toContainText('⌘');
  await expect(panel.locator('li').filter({ hasText: 'Ctrl-' })).toHaveCount(0);

  expect(hits(), `hydration 报错：\n${hits().join('\n')}`).toEqual([]);
});
