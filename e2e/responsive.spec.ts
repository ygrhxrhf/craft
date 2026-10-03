import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, STORAGE_STATE } from './global-setup';

// Reuse the seeded visual account instead of the login form: the phone-form
// login path was flaking under the iPhone emulation, and the fixture account
// owns the entities these assertions read.
test.use({ storageState: STORAGE_STATE });

async function pageReady(page: Page) {
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** 点击直到生效：React 水合完成前按钮没有 onClick（useIsMobile 的 SSR 快照也是 false）。 */
async function clickUntil(page: Page, trigger: Parameters<Page['locator']>[0], opens: Parameters<Page['locator']>[0], times = 5) {
  const target = page.locator(opens);
  for (let i = 0; i < times; i++) {
    await page.locator(trigger).click({ timeout: 10_000 }).catch(() => {});
    if (await target.isVisible({ timeout: 3_000 }).catch(() => false)) return true;
    await page.waitForTimeout(1_000);
  }
  return false;
}

async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

/** Opens the seeded document the visual setup owns (no writes, no new docs). */
async function openFixtureDoc(page: Page) {
  await page.goto('/documents');
  await pageReady(page);
  const href = await page
    .locator(`a:has-text("${FIXTURE.doc}")`)
    .first()
    .getAttribute('href');
  if (!href) throw new Error(`fixture "${FIXTURE.doc}" missing on /documents`);
  await page.goto(href);
  await pageReady(page);
}

test('sidebar becomes drawer below 748px / inline above', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === 'mobile';
  await page.goto('/documents');
  await pageReady(page);

  const toggle = page.getByRole('button', { name: '打开导航' });

  if (isMobile) {
    // 手机：汉堡按钮可见，点开抽屉（容忍水合竞态），Esc 关闭
    await expect(toggle).toBeVisible();
    const opened = await clickUntil(page, 'button[aria-label="打开导航"]', '[role="dialog"]');
    expect(opened, 'drawer never opened after retries').toBe(true);
    const drawer = page.getByRole('dialog');
    await expect(drawer.getByRole('link', { name: '首页' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden({ timeout: 5_000 });
  } else {
    // 平板（≥768）：无汉堡（CSS md:hidden），侧栏常驻
    await expect(toggle).toBeHidden();
    const sidebar = page.getByRole('complementary').first();
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByRole('link', { name: '首页' })).toBeVisible();
  }
});

test('pages do not overflow horizontally', async ({ page }) => {
  for (const path of ['/documents', '/tasks', '/calendar', '/settings', '/trash']) {
    await page.goto(path);
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await assertNoHorizontalOverflow(page);
  }
});

test('editor right panel opens without collapsing content', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', '桌面并排布局由 core 回归覆盖');
  const viewport = page.viewportSize()!;

  await openFixtureDoc(page);

  if (testInfo.project.name === 'mobile') {
    // 手机：水合完成后编辑器顶栏才出现汉堡（isMobile 的客户端信号），
    // 「信息」被折叠进「更多面板」溢出菜单。
    await expect(page.getByRole('button', { name: '打开导航' })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '更多面板' }).click();
    await page.getByRole('menuitem', { name: '信息' }).click();
  } else {
    // 平板：顶栏直出四个按钮，容忍水合竞态重试点
    const clicked = await clickUntil(page, 'button[aria-label="信息"]', '[role="tablist"][aria-label="编辑器工具"]');
    expect(clicked, 'info tab never opened after retries').toBe(true);
  }

  // 紧凑布局（平板/手机）下面是底部 Sheet，桌面 rail 是 complementary；
  // 两种形态共享同一个 tablist。
  const tablist = page.getByRole('tablist', { name: '编辑器工具' });
  await expect(tablist).toBeVisible();

  // 面板不能把正文挤没
  const editor = page.locator('[contenteditable="true"]').first();
  const editorBox = (await editor.boundingBox())!;
  expect(editorBox.width).toBeGreaterThan(50);

  await assertNoHorizontalOverflow(page);
  expect(viewport.width).toBeLessThan(1024);
});

test('the bell leaves the title row its width on a phone', async ({ page }, testInfo) => {
  // 铃铛是页头 flex 行里的一个 shrink-0 兄弟节点。它一旦参与水平布局，
  // 标题的 flex-1 就被切掉 36+12px：标题截断位置变了，其下每一行的折行
  // 跟着变，整屏位移（mobile 档 /whiteboards 实测 5381 pixels, ratio 0.03）。
  //
  // 桌面/平板本来就有足够宽度，不该被这条约束绑住。
  test.skip(testInfo.project.name !== 'mobile', '只有手机档宽度会让铃铛挤掉标题');

  await page.goto('/whiteboards');
  await pageReady(page);

  const bell = page.getByRole('button', { name: '通知' });
  await expect(bell).toBeVisible();
  const title = page.locator('header h1');
  await expect(title).toBeVisible();

  const bellBox = (await bell.boundingBox())!;
  const titleBox = (await title.boundingBox())!;

  // 叠放而非并排：铃铛不落在标题的水平区间内。
  expect(
    bellBox.x,
    `bell starts at x=${bellBox.x}, inside the title run ${titleBox.x}..${titleBox.x + titleBox.width}`,
  ).toBeGreaterThanOrEqual(titleBox.x + titleBox.width - 1);

  // 标题宽度就是判据本身：并排时铃铛吃掉自己的 36px 加一个 12px gap，
  // 实测标题只剩 156.8px；让位后回到 204.8px。阈值取 200 是因为这两档之间
  // 没有第三个可能的值——页头在手机档的其余部分（汉堡 40、actions、
  // padding 32）是固定的。
  expect(
    titleBox.width,
    `title took ${titleBox.width}px; the bell looks like it is still in the flex row`,
  ).toBeGreaterThanOrEqual(200);
});
