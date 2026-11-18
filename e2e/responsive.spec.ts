import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, STORAGE_STATE } from './global-setup';
import { openEditorPanel } from './editor-panel';

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

/**
 * The shell is `flex` with the sidebar as a sibling of `<main>`, and the sidebar
 * has a width before hydration decides it is a drawer. Measured mid-transition at
 * 390px: the header came back 252px wide with the title crushed to 0px, which is a
 * layout that never settles into anything the eye sees. Geometry assertions have to
 * wait for the header to own the viewport.
 */
async function headerSettled(page: Page) {
  const width = page.viewportSize()!.width;
  await expect
    .poll(async () => (await page.locator('header').boundingBox())?.width ?? 0, {
      message: 'the header never reached the full viewport width',
    })
    .toBe(width);
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

  // G1660：手机与平板的入口统一成顶栏右侧那一枚面板开关（原先手机把「信息」折进
  // 「更多面板」溢出菜单、平板直出四个 tab 图标，两条路合并成一条）。
  const toggle = page.getByRole('button', { name: '编辑器工具面板', exact: true });
  await expect(toggle).toBeVisible({ timeout: 15_000 });
  await openEditorPanel(page, '信息');

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

test('the bell does not paint over the header actions on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', '只有手机档宽度会让两者撞上');

  // /collections carries the cheapest header actions there is: one 108px button.
  // Measured before the fix: bell x 338..374 over actions x 266..374, so 36px of
  // the button -- its rounded right end -- was hidden under the bell.
  await page.goto('/collections');
  await pageReady(page);

  const bell = page.getByRole('button', { name: '通知' });
  const action = page.getByRole('button', { name: '新建集合' });
  await expect(bell).toBeVisible();
  await expect(action).toBeVisible();
  await headerSettled(page);

  const a = (await bell.boundingBox())!;
  const b = (await action.boundingBox())!;
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  const area = Math.max(0, overlapX) * Math.max(0, overlapY);

  expect(
    area,
    `bell [${a.x}..${a.x + a.width}] covers ${area}px² of actions [${b.x}..${b.x + b.width}]`,
  ).toBe(0);
});

test('the bell leaves the title text fully readable on a phone', async ({ page }, testInfo) => {
  // 铃铛一旦参与水平布局就要从标题的 flex-1 里拿走 36+12px。真正要紧的不是
  // 标题的盒子变窄（`truncate` 本来就允许），而是文字被切掉多少。所以量的是
  // 文字实宽与可见宽度，不是盒子宽度。
  test.skip(testInfo.project.name !== 'mobile', '只有手机档宽度会让铃铛挤掉标题');

  for (const path of ['/collections', '/daily-notes', '/whiteboards']) {
    await page.goto(path);
    await pageReady(page);
    const bell = page.getByRole('button', { name: '通知' });
    await expect(bell).toBeVisible();
    await headerSettled(page);

    // Read the geometry out of the header the bell actually lives in. A
    // `header h1` locator would silently measure whichever header matched, and the
    // first version of this test did exactly that.
    const read = await bell.evaluate((node) => {
      const header = node.closest('header') as HTMLElement;
      const title = header.querySelector('h1') as HTMLElement;
      const range = document.createRange();
      range.selectNodeContents(title);
      return {
        text: (title.textContent ?? '').trim(),
        textWidth: range.getBoundingClientRect().width,
        boxWidth: title.getBoundingClientRect().width,
        geometry: Array.from(header.children)
          .map(
            (el) =>
              `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 6)}=` +
              `${el.getBoundingClientRect().width.toFixed(0)}px`,
          )
          .join(' '),
      };
    });

    // A title that fits is a title the bell has not eaten.
    expect(
      read.boxWidth >= read.textWidth,
      `"${read.text}" is clipped to ${read.boxWidth}px of its ${read.textWidth}px -- [${read.geometry}]`,
    ).toBe(true);
  }
});

