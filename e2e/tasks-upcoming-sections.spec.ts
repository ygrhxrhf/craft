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

const sections = (page: Page) => page.getByTestId('upcoming-section');
/** 本机库里有别的规格留下的排期任务，所以只按「哪一节装着这枚任务」下断言，不比节的总数。 */
const sectionOf = (page: Page, title: string) =>
  sections(page).filter({ has: page.getByText(title, { exact: true }) });
const headingOf = (page: Page, title: string) => sectionOf(page, title).locator('h2 span').first();

/** 每次运行换一批标题：上一轮失败残留的行按 createdAt 排在锚点时钟造出来的行**前面**，
 *  同名就会把断言打到残留行上（实测 `card.first()` 拿到旧行，排期写进了别的 id）。 */
const run = Math.random().toString(36).slice(2, 7);
const name = (label: string) => `分节-${label}-${run}`;
const WEEK = name('本周');
const MONTH = name('本月');
const YEAR = name('明年');
const UNSCHEDULED = name('无排期');
const created = [WEEK, MONTH, YEAR, UNSCHEDULED];

async function createScheduled(page: Page, title: string, due: string | null) {
  await page.goto('/tasks');
  await page.getByPlaceholder('添加任务，按回车确认…').fill(title);
  await page.keyboard.press('Enter');
  const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
  await expect(card.getByText(title, { exact: true })).toBeVisible();
  if (!due) return;
  await card.getByLabel('设置提醒与重复').click();
  await card.getByLabel('截止日期').fill(due);
  await expect(card.getByLabel('截止日期')).toHaveValue(due);
}

async function deleteAll(page: Page) {
  await page.goto('/tasks');
  for (const title of created) {
    const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
    if ((await card.count()) === 0) continue;
    await card.getByLabel('删除任务').click();
    await expect(page.getByText(title, { exact: true })).toHaveCount(0);
  }
}

/**
 * G459：官方 `TasksBrowseUpcomingView.utils` 的 `C`/`S`/`W` 落到页面上的样子——排期落在本周内并成
 * 一节（`本周`），更晚的按当月并节（本月＝`本月`，其余＝长月名），只有年份大于今年才升为 `year`
 * （纯年份数字）；**无排期的块整个跳过**；节与节之间按 `S` 升序；关掉「显示已完成」后整节都做完了
 * 就不占位。时钟锚到 2026-10-14（周三）：本周＝10/12…10/18，下周一＝10/19，明天＝10/15。
 */
test('即将进行 is a week/month/year timeline, not a flat list', async ({ page }) => {
  // install 而不是 setFixedTime：后者把时间冻住，离线内核的去抖 flush 定时器永远不跑。
  await page.clock.install({ time: new Date(2026, 9, 14, 12, 0) });
  await signIn(page);

  try {
    await createScheduled(page, WEEK, '2026-10-15');
    await createScheduled(page, MONTH, '2026-10-25');
    await createScheduled(page, YEAR, '2027-03-01');
    await createScheduled(page, UNSCHEDULED, null);

    await page.goto('/tasks/upcoming');
    await expect(sectionOf(page, WEEK)).toHaveCount(1);

    await expect(headingOf(page, WEEK)).toHaveText('本周');
    await expect(headingOf(page, MONTH)).toHaveText('本月');
    await expect(headingOf(page, YEAR)).toHaveText('2027年');

    // S：节与节之间按 本周 → 本月 → 2027年 升序
    const headings: string[] = [];
    for (let index = 0; index < (await sections(page).count()); index += 1) {
      headings.push(await sections(page).nth(index).locator('h2 span').first().innerText());
    }
    expect(headings.indexOf('本周')).toBeLessThan(headings.indexOf('本月'));
    expect(headings.indexOf('本月')).toBeLessThan(headings.indexOf('2027年'));

    // 三枚任务各自只出现在自己那一节里
    await expect(sectionOf(page, WEEK).getByText(MONTH, { exact: true })).toHaveCount(0);
    await expect(sectionOf(page, MONTH).getByText(YEAR, { exact: true })).toHaveCount(0);

    // 副标题＝该节未完成数（官方 subtitle={f.length}），开关关掉时它等于节内行数
    for (const title of [WEEK, MONTH, YEAR]) {
      const section = sectionOf(page, title);
      await expect(section.locator('h2 span').nth(1)).toHaveText(
        String(await section.locator('div.border-b').count())
      );
    }

    // if (schedule == null) continue
    await expect(page.getByText(UNSCHEDULED, { exact: true })).toHaveCount(0);
    // 未归档照旧列出全部四枚
    await page.goto('/tasks');
    for (const title of created) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }

    await page.goto('/tasks/upcoming');
    await expect(sections(page).first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/tmp-upcoming-sections.png', fullPage: true });

    // 官方的 isVisible:false：整节都做完 ⇒ 关掉开关时该节不占位
    await page.goto('/tasks/upcoming');
    await sectionOf(page, YEAR).getByRole('checkbox').first().click();
    await expect(sections(page).filter({ hasText: '2027年' }).first()).toBeHidden();
    await page.goto('/tasks');
    await page.getByLabel('显示已完成的任务').click();
    await page.goto('/tasks/upcoming');
    await sectionOf(page, YEAR).getByRole('checkbox').first().click();
    await expect(sectionOf(page, YEAR)).toHaveCount(1);
  } finally {
    await page.goto('/tasks');
    await page.getByLabel('显示已完成的任务').click().catch(() => {});
    await deleteAll(page);
  }
});
