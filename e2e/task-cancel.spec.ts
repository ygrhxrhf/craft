import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G52 — 官方的任务除"勾上"之外还有**第三档** `cancelled`（`docs/craft-ref/features/tasks.md:11`），
 * 进入它的两条通路都在文档里：`⌘⌥⇧T` / `Ctrl-Alt-Shift-T`（`keyboard.md:116`）与拖拽把手菜单那枚
 * 「将任务标记为已取消」。屏上形态＝"保留原位、只加删除线"（`interactions.md:1087`），
 * 任务页上它属于 pending 之外的那一档（`api-contract.md:36`）——三条都在这里真的走一遍浏览器。
 * 任务页那一侧（第三档分区＋默认只显示 pending）由第三条验——"正文的待办 → `tasks` 行"这条路
 * 在真浏览器里是**通**的（`/tasks/all` 上能数到行；☆ 上一轮记成的"整库 0 行＋POST 500"是这台机器上
 * 那枚 dev server 早于 `contract emit` 启动、内存里还拿着旧契约 ⇒ `Unknown column "cancelledAt"`，
 * 见 G1497 的改判）。
 */
const email = 'craft-task-cancel@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 15_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', '取消态测试');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 20_000 });
}

/**
 * A fresh document whose task block is one `taskList` holding two rows — the shape the real editor
 * produces (`[] ` then Enter continues the list). The old menu code addressed only a *top-level*
 * `taskItem`, so on exactly this shape both the reminder entry and the cancel entry clicked nothing
 * in a real browser while every unit test stayed green.
 */
async function newDocWithTwoTasks(page: Page, first: string, second: string) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);

  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(`[] ${first}`, { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.type(second, { delay: 20 });
  await expect(editor.locator('.task-list-item')).toHaveCount(2);
  return editor;
}

const rows = (page: Page) => page.locator('.ProseMirror .task-list-item');
const cancelledAttr = (page: Page) =>
  page.$$eval('.ProseMirror .task-list-item', (els) =>
    els.map((el) => el.getAttribute('data-cancelled') === 'true'),
  );

/** Put the caret in one row without touching its checkbox. */
async function clickRow(page: Page, index: number) {
  await rows(page).nth(index).locator('p').first().click();
}

/** Arm the handle in the gutter of the block holding row `index`, and open its menu. */
async function openBlockMenu(page: Page, index: number) {
  const editorBox = await page.locator('.ProseMirror').boundingBox();
  expect(editorBox).not.toBeNull();
  const row = await rows(page).nth(index).boundingBox();
  expect(row).not.toBeNull();
  await page.mouse.move(editorBox!.x + 8, row!.y + row!.height / 2);
  const handle = page.locator('[data-drag-handle]');
  await expect(handle).toBeVisible();
  await handle.getByRole('button', { name: '区块操作' }).click();
  return page.getByRole('menu');
}

/** The body is the truth, so the autosave must land before a reload proves anything. */
async function waitSaved(page: Page) {
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(1_000);
}

test('键盘 Ctrl-Alt-Shift-T：只作用在光标那一行，不加勾只加删除线，重载后还在', async ({ page }) => {
  await signIn(page);
  const stamp = Date.now();
  await newDocWithTwoTasks(page, `甲 ${stamp}`, `乙 ${stamp}`);

  // Enter left the caret on 乙, so 甲 must stay untouched.
  await page.keyboard.press('Control+Alt+Shift+T');
  await expect.poll(() => cancelledAttr(page)).toEqual([false, true]);

  // 一根轴上的三档：取消行没打勾（`tasks.md:11` 的 Canceled 不是 Checked）。
  await expect(rows(page).nth(1).locator('input[type="checkbox"]')).not.toBeChecked();

  // 官方屏上形态＝留在原位、只加删除线（`interactions.md:1087`）。
  const struck = await rows(page).nth(1).evaluate((el) => {
    const text = el.querySelector('div > p') ?? el;
    return getComputedStyle(text).textDecorationLine;
  });
  expect(struck).toContain('line-through');

  await waitSaved(page);
  await page.reload();
  await expect(rows(page)).toHaveCount(2);
  await expect.poll(() => cancelledAttr(page)).toEqual([false, true]);
});

test('拖拽把手菜单在 taskList 的行上点得到，标签会翻成「取消标记」', async ({ page }) => {
  await signIn(page);
  const stamp = Date.now();
  const title = `丙 ${stamp}`;
  await newDocWithTwoTasks(page, title, `丁 ${stamp}`);
  await clickRow(page, 0);

  const menu = await openBlockMenu(page, 0);
  // ★ 旧代码在这一枚上静默失灵：顶层块是 taskList，菜单那两枚一枚都点不到。
  await expect(menu.getByRole('menuitem', { name: '将任务标记为已取消' })).toBeVisible();
  await menu.getByRole('menuitem', { name: '将任务标记为已取消' }).click();
  await expect.poll(() => cancelledAttr(page)).toEqual([true, false]);

  // 同一枚入口在已取消的行上改名成「取消标记」（官方的标签翻转），点它退出这一档。
  const again = await openBlockMenu(page, 0);
  await expect(again.getByRole('menuitem', { name: '将任务标记为已取消' })).toHaveCount(0);
  await again.getByRole('menuitem', { name: '取消标记' }).click();
  await expect.poll(() => cancelledAttr(page)).toEqual([false, false]);

  // 「提醒我…」与取消那枚共用同一处寻址：这一形里它也点得到（旧代码两枚都点不到）。
  const third = await openBlockMenu(page, 0);
  await expect(third.getByRole('menuitem', { name: '提醒我…' })).toBeVisible();
  await third.getByRole('menuitem', { name: '将任务标记为已取消' }).click();
  await expect.poll(() => cancelledAttr(page)).toEqual([true, false]);
  await waitSaved(page);
});

test('任务页：正文那一行取消后，它离开未办那节、回到「已取消」分区（api-contract.md:36）', async ({
  page,
}) => {
  await signIn(page);
  const stamp = Date.now();
  // 两行都用同一个前缀，页面上一切断言都锚在标题上——这个账号里躺着前几轮的残留行。
  const cancelledTitle = `戊 ${stamp}`;
  const pendingTitle = `己 ${stamp}`;
  await newDocWithTwoTasks(page, cancelledTitle, pendingTitle);
  await clickRow(page, 0);
  const menu = await openBlockMenu(page, 0);
  await menu.getByRole('menuitem', { name: '将任务标记为已取消' }).click();
  await expect.poll(() => cancelledAttr(page)).toEqual([true, false]);
  await waitSaved(page);

  // 默认只显示 pending：取消行没勾，但它不算未办（`isCompleted` 那一枚兜不住这一档）。
  await page.goto('/tasks/all');
  await expect(page.getByText(pendingTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(cancelledTitle, { exact: true })).toHaveCount(0);

  await page.getByLabel('显示已完成的任务').click();
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: /^已取消 · \d+$/ }) })
    .first();
  await expect(section).toBeVisible();
  await expect(section.getByText(cancelledTitle, { exact: true })).toBeVisible();
  await expect(section.getByText(pendingTitle, { exact: true })).toHaveCount(0);

  // 官方第二句词 `tasks.canceled.on`「已于 [0] 取消」＝悬停那句，且只有拿到时间戳才说得出。
  const badge = section.getByText('已取消', { exact: true }).first();
  expect(await badge.getAttribute('title')).toMatch(/^已于 .+ 取消$/);
});
