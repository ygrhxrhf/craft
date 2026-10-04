import { expect, test, type Page } from '@playwright/test';
import { FIXTURE, STORAGE_STATE } from './global-setup';

/**
 * Every shot here is compared against a committed baseline, so the pixels must come
 * from the data `global-setup.ts` seeds. Signing in through its stored cookies rather
 * than the login form also removes the slowest thing in this suite.
 */
test.use({ storageState: STORAGE_STATE });

const APP_ROUTES = [
  '/documents',
  '/recent',
  '/favorites',
  '/daily-notes',
  '/tasks',
  '/calendar',
  '/templates',
  '/search',
  '/settings',
  '/trash',
  '/collections',
  '/whiteboards',
];

/** The day `light|dark-app-calendar-*` were captured on. See the clock pin below. */
const CALENDAR_BASELINE_DAY = '2026-09-25T12:00:00';

/** Opens a seeded entity by title. "The first card" would be whatever the CRUD
 *  specs last touched, and that changes between runs. */
async function openFixture(page: Page, listPath: string, title: string) {
  await page.goto(listPath);
  const href = await page.locator(`a:has-text("${title}")`).first().getAttribute('href');
  if (!href) throw new Error(`visual seed is missing "${title}" on ${listPath}`);
  // Navigating by URL rather than tapping: the cards are hydration-dependent
  // client links, and WebKit sometimes swallows the first tap.
  await page.goto(href);
}

/**
 * The dev "Rendering…" pill is a real overlay on the page, and on a phone-width
 * viewport it lands on top of the header. Measured: 4891 px on `/collections` and
 * enough on top of the stale calendar grid to push a shot past the 2% budget.
 * Waiting for it to collapse is a stricter capture condition than the 350ms settle
 * below, so a run that shoots while it is up is not comparable with one that
 * does not -- the difference is the instrument, not the product.
 */
async function expectIndicatorIdle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const root = document.querySelector('nextjs-portal')?.shadowRoot;
          if (!root) return false;
          return Array.from(root.querySelectorAll('button')).some((b) =>
            (b.textContent ?? '').trim().startsWith('Rendering'),
          );
        }),
      { message: 'the dev "Rendering…" pill is still expanded' },
    )
    .toBe(false);
}

/**
 * Masked: dates, relative timestamps and any `grid-cols-7` table. The seeded
 * data is fixed, but "最后编辑 3 天前" is not. The sidebar tree is deliberately
 * NOT masked (masking it whole hid real regressions), and neither is the
 * calendar's day grid — it is a `border-collapse` table, so the `grid-cols-7`
 * locator below measures 0 hits on /calendar; that page is kept stable by the
 * clock pin instead.
 */
async function shoot(page: Page, name: string) {
  // Several pages mount a client shell that paints 加载中 first; shooting then puts
  // the whole page out of place. `toBeHidden` also passes when nothing matches.
  await expect(page.getByText('加载中').first()).toBeHidden();
  await page.waitForTimeout(350);
  await expectIndicatorIdle(page);
  const dynamic = [
    // Only the genuinely volatile nodes: dates and relative timestamps (the sidebar
    // tree itself is seeded and stable, so masking it whole hid real regressions).
    page.locator('h2:has-text("19"), h2:has-text("20")'),
    page.locator('[class*="grid-cols-7"]'),
    page.locator('text=/\\d{4}-\\d{1,2}-\\d{1,2}/'),
    page.locator('text=/\\d{1,2}月\\d{1,2}日/'),
    page.locator('text=/\\d+\\s*(秒|分钟|小时|天|周)前/'),
  ];
  await expect(page).toHaveScreenshot(`${name}.png`, {
    mask: dynamic,
    maskColor: '#00f0f0',
  });
}

for (const theme of ['light', 'dark'] as const) {
  test.describe(`visual ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => {
        window.localStorage.setItem('theme', value);
      }, theme);
    });

    test('public auth pages', async ({ page }) => {
      // A session would bounce /login straight to /documents.
      await page.context().clearCookies();
      await page.goto('/login');
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await shoot(page, `${theme}-login`);
      await page.goto('/register');
      await expect(page.locator('input[type="password"]').first()).toBeVisible();
      await shoot(page, `${theme}-register`);
    });

    for (const route of APP_ROUTES) {
      test(`app ${route}`, async ({ page }) => {
        if (route === '/calendar') {
          // The page seeds `month` and `selected` from `new Date()`
          // (src/app/(app)/calendar/page.tsx:20-21) and nothing masks the day
          // grid -- `[class*="grid-cols-7"]` measures 0 hits here, the only one
          // in the repo is the collection calendar view -- so the shot walked
          // out of its own baseline the day after it was recorded.
          // Budget maths, read off playwright-core 1.63 (coreBundle.js:7903 and
          // :7909): the ratio is compared against `width * height *
          // maxDiffPixelRatio` over the WHOLE frame, because a mask paints the
          // region equal in both images and therefore never shrinks the
          // denominator. 390x664 = 258,960 px, 2% = 5,179 px. The stale grid
          // measured 5,390 px (`.pw-out/e2e-report-b5r.json`, 10-03 14:01, repeated
          // in b5r2 at 14:08) = OVER budget on its own. So the note this replaces
          // was wrong twice over: the delta was not under 2%, and the "ratio 0.03"
          // printed beside it is `Math.ceil(count / total * 100) / 100` of 0.0208,
          // not evidence of a larger difference. What is actually true: the same
          // shot was green in isolation a minute later (`.pw-out/e2e-report-cal1.json`,
          // 2 tests, 0 unexpected), so isolated-vs-full-run changed which grid state
          // got captured, not how close to the budget it sat. Consequence unchanged:
          // this shot cannot catch a wrong month by itself, so the pin is
          // load-bearing.
          await page.clock.setFixedTime(new Date(CALENDAR_BASELINE_DAY));
        }
        await page.goto(route);
        await expect(page.getByRole('main')).toBeVisible();
        await shoot(page, `${theme}-app${route.replace(/\//g, '-')}`);
      });
    }

    test('document detail and the four panel tabs', async ({ page }) => {
      await openFixture(page, '/documents', FIXTURE.doc);
      await expect(page.locator('.ProseMirror').first()).toBeVisible();

      async function shootDoc(name: string) {
        // The header label flips 已保存 → 保存中... → 已保存 while the autosave and
        // the Yjs attach settle, and the label is wider in one of those states.
        await expect(page.getByText('已保存', { exact: true })).toBeVisible();
        await shoot(page, name);
      }

      await shootDoc(`${theme}-document-detail`);

      for (const tab of ['插入', '格式', '样式', '信息']) {
        const trigger = page.getByRole('button', { name: tab, exact: true });
        if (await trigger.isVisible().catch(() => false)) {
          await trigger.click();
        } else {
          // Phones fold the last two tabs behind the overflow menu.
          await page.getByRole('button', { name: '更多面板' }).click();
          await page.getByRole('menuitem', { name: tab }).click();
        }
        await page.waitForTimeout(300);
        await shootDoc(`${theme}-document-tab-${tab}`);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
    });

    test('collection table view', async ({ page }) => {
      await openFixture(page, '/collections', FIXTURE.collection);
      await expect(page.getByRole('main')).toBeVisible();
      await shoot(page, `${theme}-collection`);
    });

    test('whiteboard canvas', async ({ page }) => {
      await openFixture(page, '/whiteboards', FIXTURE.board);
      await expect(page.locator('.tl-container')).toBeVisible({ timeout: 25_000 });
      await shoot(page, `${theme}-whiteboard`);
    });
  });
}
