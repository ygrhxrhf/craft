import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G52 — 官方的任务除"勾上"之外还有**第三档** `cancelled`（`docs/craft-ref/features/tasks.md:11`）。
 * 唯一入口是键盘键位 `⌘⌥⇧T` / `Ctrl-Alt-Shift-T`（`keyboard.md:116`）；拖拽把手菜单**不含**这一枚
 * （`block-actions.ts` 的名册只有三枚任务专属项，单测钉住）。屏上形态＝"保留原位、只加删除线"
 * （`interactions.md:1087`），任务页上它属于 pending 之外的那一档（`api-contract.md:36`）——
 * 两条都在这里真的走一遍浏览器。任务页那一侧（第三档分区＋默认只显示 pending）由第二条验。
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
  // 拖拽菜单按名册不含取消那枚（block-actions.ts 钉住）；这一档走键盘键位。
  await page.keyboard.press('Control+Alt+Shift+T');
  await expect.poll(() => cancelledAttr(page)).toEqual([true, false]);
  await waitSaved(page);

  // 默认只显示 pending：取消行没勾，但它不算未办（`isCompleted` 那一枚兜不住这一档）。
  await page.goto('/tasks/all');
  await expect(page.getByText(pendingTitle, { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(cancelledTitle, { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '更多选项' }).click();
  await page.getByRole('menuitemcheckbox', { name: '查看已完成的任务' }).click();
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
