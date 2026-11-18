import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

// 这条规格要跑 4 次建行 + 4 趟列表整页重进 + 一轮清扫，dev 按需编译下 120s 的全局上限不够。
// 一台刚重启的 dev server 上，首屏那几枚 `Next-Action`（任务读／收藏／子任务／本地行）
// 会各自冷编译 7–26s，连着几枚就把 20s 的水合闸门吃穿（实测 60s 也不够）。
const HYDRATION_BUDGET = 120_000;
test.setTimeout(600_000);

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // 登录后是 `router.push('/documents')`，dev 冷编译时这一跳本身就能超 20s 默认预算。
  await expect(page).toHaveURL(/\/documents/, { timeout: HYDRATION_BUDGET });
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
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('添加任务，按回车确认…').fill(title);
  await page.keyboard.press('Enter');
  const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
  // 行要等 `load()` 那趟服务端动作回来才画（本地镜像叠在响应之后），dev 冷编译时超 20s。
  await expect(card.getByText(title, { exact: true })).toBeVisible({ timeout: HYDRATION_BUDGET });
  if (!due) return;
  // G46：即将进行按「计划日期」（Schedule 轴）分节，不是「截止日期」（Deadline）。两者是独立
  // 两轴，只设截止的行没有排期 ⇒ 官方判据 `if (schedule == null) continue` 直接跳过。
  // G332–G373：计划日期是 popover 芯片，日期框在浮层里（ISO 串由 parseDateIn 收）。
  await card.getByRole('button', { name: '设置计划日期' }).click();
  const dateBox = page.getByTestId('task-date-popover').locator('input[aria-label="日期"]');
  await dateBox.fill(due);
  await page.keyboard.press('Enter');
  const [, month, day] = due.split('-').map(Number);
  // 日期芯片同样要等一次服务端写＋重载后的读，dev 冷编译时超 20s。
  await expect(card.getByRole('button', { name: '设置计划日期' })).toHaveText(`${month}月${day}日`, {
    timeout: HYDRATION_BUDGET,
  });
}

/** 「显示已完成」是一枚设备设置：点在哪个方向取决于上一次进来时它是什么状态，所以一律按目标态掰。 */
async function openList(page: Page) {
  await page.goto('/tasks');
  // ☆ 水合闸门：SSR 只画「加载中…」，行是 `getTasksPage` 回来后才换上去的。不等它就数行数，
  //   清扫循环读到 0 行 ⇒ `toHaveCount(0)` 空过 ⇒ 残留行原地不动，把本轮「副标题＝节内未完成数」
  //   打成必然红（实测副标题 5／节内 8 行＝5 todo + 3 done 的上一轮残留）。
  //   侧栏那几棵树也叫「加载中…」，所以钉在 `main` 里。
  await expect(page.getByRole('main').getByText('加载中…')).toBeHidden({ timeout: HYDRATION_BUDGET });
}

/** 开关是 `useState(false)`（不落盘）：只在当前页内存里，按目标态掰，不整页重进。 */
async function readShowCompleted(page: Page): Promise<boolean> {
  await page.getByRole('button', { name: '更多选项' }).click();
  const checked = await page
    .getByRole('menuitemcheckbox', { name: '查看已完成的任务' })
    .getAttribute('aria-checked');
  await page.keyboard.press('Escape');
  return checked === 'true';
}

async function toggleShowCompleted(page: Page, show: boolean) {
  if ((await readShowCompleted(page)) !== show) {
    await page.getByRole('button', { name: '更多选项' }).click();
    await page.getByRole('menuitemcheckbox', { name: '查看已完成的任务' }).click();
  }
  await expect(await readShowCompleted(page)).toBe(show);
}

/** 列表页重进后再掰开关（清扫用：要先看得见完成行才能删干净）。 */
async function setShowCompleted(page: Page, show: boolean) {
  await openList(page);
  await toggleShowCompleted(page, show);
}

/**
 * ☆ 每次 `goto('/tasks/upcoming')` 之后都必须过这道闸：行是 `getTasksPage` 回来后才换上去的，
 *   而下面有几处是「进去就点复选框」——不等水合，点到的还是那枚「加载中…」的占位屏
 *   （实测 120s 超时，快照里整页只有加载态）。
 */
async function openUpcoming(page: Page) {
  await page.goto('/tasks/upcoming');
  await expect(page.getByRole('main').getByText('加载中…')).toBeHidden({ timeout: HYDRATION_BUDGET });
  await expect(sections(page).first()).toBeVisible();
}

async function deleteAll(page: Page) {
  // 清扫时必须先把开关掰到"看得见"那一侧，否则已完成的那几行根本不渲染，删到一半就漏
  // （残留行正是本规格最容易吃到的假红源）。
  await setShowCompleted(page, true);
  // ☆ 按前缀扫，不是按本命的四枚标题扫：上一轮在清理之前崩掉，那枚「分节-明年-xxxxx」就永久
  //   留在共享账号里（与 G1494 同族＝列表只增不减的水合面，本机实测 `… where email='craft-test@…'
  //   and "dueDate" >= '2027-01-01'` 里一度躺着 8 行，其中 3 行 status=done）。
  const cards = () => page.locator('div.border-b').filter({ hasText: /分节-/ });
  for (let guard = 0; guard < 12; guard += 1) {
    if ((await cards().count()) === 0) break;
    // 删除是「本地镜像先退一行＋服务端权威行下一趟读才消失」两段：点完删除后界面上的乐观行
    // 可能还挂着（本文件旧注释记过挂 20s 的实测）。所以每删一枚就整页重读一遍再数，
    // 只认服务端权威行——不要对那张会闪的乐观行下"立刻少一行"的断言。
    await cards().first().getByLabel('删除任务').click();
    await openList(page);
    await toggleShowCompleted(page, true);
  }
  await expect(cards()).toHaveCount(0);
  // 扫完把开关掰回默认（关），否则本命「关掉开关时该节不占位」那两枚断言跑在"已开启"那一侧。
  await setShowCompleted(page, false);
}

/**
 * G459：官方 `TasksBrowseUpcomingView.utils` 的 `C`/`S`/`W` 落到页面上的样子——排期落在本周内并成
 * 一节（`本周`），更晚的按当月并节（本月＝`本月`，其余＝长月名），只有年份大于今年才升为 `year`
 * （纯年份数字）；**无排期的块整个跳过**；节与节之间按 `S` 升序；关掉「显示已完成」后整节都做完了
 * 就不占位。时钟锚到 2026-10-14（周三）：本周＝10/12…10/18，下周一＝10/19，明天＝10/15。
 *
 * ★ 假钟隔离：实测本版本的 `page.clock.install` 是 **context 级**的（同 context 里后开的页也读到
 *   假时间，`e2e/_probe-clock.spec.ts` 探针两页都回 2026-10-14T04:00），所以写读两边各用一个 context：
 *   - 主 context（`page`）：装假钟。建行必须在假钟下——日期框会拒绝「过去」的本地日
 *     （`adoptDateExpression` 的 `isPastLocalDay`，真实钟下 10-15 已是过去）；四节断言也在这里看。
 *   - 独立 context（`realPage`）：真实钟。删行与勾完成在这里做（内核 delete 走 LWW，假 syncTs
 *     会被服务端原样退回），切过去后假钟页整页重进读服务端权威行。
 */
test('即将进行 is a week/month/year timeline, not a flat list', async ({ page, browser }) => {
  await signIn(page);
  // dev 按需编译：先把后面会反复整页重进的两个路由在真实钟下预热一遍，把首编译那几十秒
  // 摊到正文之外（挂钟装在 page 上之后，编译抖动更容易把水合闸门顶穿）。
  await openList(page);
  await page.goto('/tasks/upcoming');
  await expect(page.getByRole('main').getByText('加载中…')).toBeHidden({ timeout: HYDRATION_BUDGET });

  const realContext = await browser.newContext();
  const realPage = await realContext.newPage();
  await signIn(realPage);

  // 进门前先把上一轮崩在清理之前留下的同族残留扫掉，否则那几行会一直顶在锚点时钟造出来的行前面，
  // 把「副标题＝节内未完成数」与「整节做完 ⇒ 关掉开关时该节不占位」打成必然红。
  // ☆ 清扫必须跑在**真实时钟**上：内核对 delete 走 LWW，假时钟（锚在 12:00）把 delete 的 syncTs
  //   打到残留行那枚较新的真实 `updatedAt` 之前 ⇒ 服务端原样退回（本机实测 POST /api/v1/sync
  //   `{"table":"task","op":"delete","syncTs":"2026-10-14T04:00:04.127Z"}`
  //   ⇒ `applied:[] / rejected:[{op:"upsert",…分节-明年-mib3u…}]`，行纹丝不动，界面也无任何提示）。
  await deleteAll(realPage);

  // install 而不是 setFixedTime：后者把时间冻住，离线内核的去抖 flush 定时器永远不跑。
  await page.clock.install({ time: new Date(2026, 9, 14, 12, 0) });

  // 清扫必须跑，但它**不许顶掉真正的失败**：本轮两次都只报出清理里那枚「开关没掰过去」，
  // 正文那段的红被 finally 吃得一干二净（与 G1494 同族，仪器面另记）。
  let bodyError: unknown = null;
  try {
    await createScheduled(page, WEEK, '2026-10-15');
    await createScheduled(page, MONTH, '2026-10-25');
    await createScheduled(page, YEAR, '2027-03-01');
    await createScheduled(page, UNSCHEDULED, null);

    await openUpcoming(page);
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
    await openList(page);
    for (const title of created) {
      await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    }

    await openUpcoming(page);
    await page.screenshot({ path: 'screenshots/tmp-upcoming-sections.png', fullPage: true });

    // 官方的 isVisible:false：整节都做完 ⇒ 关掉开关时该节不占位。勾选在真实钟页上做（任务屏的
    // 完成走 Server Action，删行才走 LWW 内核），「不占位」回假钟页整页重进后断言。
    await openList(realPage);
    await realPage
      .locator('div.border-b', { has: realPage.getByText(YEAR, { exact: true }) })
      .getByRole('checkbox')
      .first()
      .click();
    await openUpcoming(page);
    await expect(sections(page).filter({ hasText: '2027年' }).first()).toBeHidden();
    // 开关打开 ⇒ 该节回来（开关只在页内 useState，点了即重算，不用再整页重进）
    await toggleShowCompleted(page, true);
    await expect(sectionOf(page, YEAR)).toHaveCount(1);
  } catch (error) {
    bodyError = error;
  }
  let cleanupError: unknown = null;
  try {
    // 清扫跑在真实钟页上（理由见上面 deleteAll 前的注释：假时钟把 delete 的 syncTs 打到残留行
    // 较新的 `updatedAt` 之前，服务端原样退回）。先关掉假钟页：它的内核还开着，清扫期间
    // 若有推/拉在飞，界面计数会跟服务端权威行打架。
    await page.close().catch(() => {});
    await deleteAll(realPage);
  } catch (error) {
    cleanupError = error;
  } finally {
    await realContext.close().catch(() => {});
  }
  if (bodyError) {
    if (cleanupError) console.error('[cleanup] 残留清扫也失败了', cleanupError);
    throw bodyError;
  }
  if (cleanupError) throw cleanupError;
});
