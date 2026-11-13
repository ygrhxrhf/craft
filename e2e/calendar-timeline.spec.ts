import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

/** 时间轴上的成节（日／区间／月／之后）——`calendar-section-ongoing` 是聚合节，没有逐日动作按钮。 */
const sections = (page: Page) =>
  page.locator('section[data-testid^="calendar-section-"]:not([data-testid="calendar-section-ongoing"])');
/** 逐日成节：只有这一档的节头是 `日期 • 相对 • 星期`。 */
const daySections = (page: Page) =>
  page.locator('section[data-testid="calendar-section-today"], section[data-testid="calendar-section-day"]');

/** `9月27日`＝官方日期表头写法，不带前导零。 */
function dateLabel(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function shift(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * G43 日历＝纵向按日时间轴。判据逐字来自 `_harvest/dom-route-calendar.html`：七天逐日成节
 * （今天／明天＋星期）、本月余日并成一节、再往后按月并节，`↑ 显示前几天` 与 `↓ 显示下个月`
 * 各自往外长，**每一节**都带 添加任务／创建每日笔记（旧实现只有选中的那一日有）。
 */
test('the calendar is a vertical per-day timeline, not a month grid', async ({ page }) => {
  await signIn(page);
  await page.goto('/calendar');

  await expect(page.getByRole('heading', { level: 1, name: '日历' })).toBeVisible();

  // 时间轴是默认视图：月格那张表不在页面上。
  await expect(page.getByRole('button', { name: '显示月视图' })).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);

  const todaySection = page.getByTestId('calendar-section-today');
  await expect(todaySection).toHaveCount(1);
  await expect(todaySection.locator('h2')).toHaveText(
    new RegExp(`^${dateLabel(new Date())}\\s*•\\s*今天\\s*•\\s*星期.$`)
  );

  const tomorrowSection = sections(page).filter({ has: page.getByText('明天', { exact: true }) });
  await expect(tomorrowSection).toHaveCount(1);
  await expect(tomorrowSection.locator('h2')).toContainText(dateLabel(shift(1)));

  // 七天逐日成节，节头只有 今天／明天 两档相对标签。
  await expect(sections(page).filter({ has: page.locator('h2:has-text("星期")') })).toHaveCount(7);
  await expect(sections(page).filter({ has: page.getByText('今天', { exact: true }) })).toHaveCount(1);

  // 每一节都自带两个动作按钮＝判据里"逐日动作"。
  const count = await sections(page).count();
  expect(count).toBeGreaterThanOrEqual(8);
  await expect(page.getByRole('button', { name: '添加任务', exact: true })).toHaveCount(count);
  await expect(page.getByRole('button', { name: '创建每日笔记', exact: true })).toHaveCount(count);

  await page.screenshot({ path: 'screenshots/tmp-calendar-timeline.png', fullPage: true });
});

test('growth buttons extend the timeline in both directions', async ({ page }) => {
  await signIn(page);
  await page.goto('/calendar');

  const todaySection = page.getByTestId('calendar-section-today');
  await expect(todaySection).toHaveCount(1);
  const before = await sections(page).count();
  await page.getByRole('button', { name: '↑ 显示前几天' }).click();
  await expect(sections(page)).toHaveCount(before + 3);
  // 往前补的是三天，最老的一节是今天减三。（`之后` 节若在位，它的 h2 是「之后」，所以按逐日节取首枚）
  await expect(daySections(page).first().locator('h2')).toContainText(dateLabel(shift(-3)));

  const monthSections = page.locator('section[data-testid="calendar-section-month"]');
  const monthsBefore = await monthSections.count();
  await page.getByRole('button', { name: '↓ 显示下个月' }).click();
  await expect(monthSections).toHaveCount(monthsBefore + 1);
});

test('a task added from a day section lands on that day and stays there', async ({ page }) => {
  await signIn(page);
  await page.goto('/calendar');

  const title = `时间轴任务 ${Date.now()}`;
  const todaySection = page.getByTestId('calendar-section-today');
  const tomorrowSection = sections(page).filter({ has: page.getByText('明天', { exact: true }) });

  await tomorrowSection.getByRole('button', { name: '添加任务', exact: true }).click();
  await tomorrowSection.getByPlaceholder('添加任务').fill(title);
  await tomorrowSection.getByPlaceholder('添加任务').press('Enter');

  await expect(tomorrowSection).toContainText(title);
  // 落在哪一节是这一条的判据：不是"列表里存在"，而是"明天那一节里"。
  await expect(todaySection).not.toContainText(title);

  await page.reload();
  await expect(
    sections(page).filter({ has: page.getByText('明天', { exact: true }) })
  ).toContainText(title);

  await page.goto('/tasks');
  const row = page.locator('div.border-b', { hasText: title });
  await expect(row).toHaveCount(1);
  await row.getByLabel('删除任务').click();
  await expect(row).toHaveCount(0);
});

test('创建每日笔记 works on any day section', async ({ page }) => {
  await signIn(page);
  // 登录之后再把时钟钉死：这一节每天出现一次，钉子让它永远是同一天，
  // 于是 `创建每日笔记` 每次都回到同一篇（getOrCreateDayNote 的既有档），不会一天留一份新笔记。
  await page.clock.setFixedTime(new Date('2026-09-25T12:00:00'));
  await page.goto('/calendar');

  const tomorrow = dateLabel(new Date(2026, 8, 26));
  const tomorrowSection = sections(page).filter({ has: page.getByText('明天', { exact: true }) });
  await expect(tomorrowSection.locator('h2')).toContainText(tomorrow);

  await tomorrowSection.getByRole('button', { name: '创建每日笔记', exact: true }).click();

  await expect(page).toHaveURL(/\/documents\/[\w-]+$/);
  await expect(page.locator('input[placeholder="页面标题"]')).toHaveValue(
    new RegExp(`^${tomorrow}`)
  );

  // 回到日历：笔记挂在它自己那一节里。
  await page.goBack();
  await expect(
    sections(page).filter({ has: page.getByText('明天', { exact: true }) })
  ).toContainText(tomorrow);
});
