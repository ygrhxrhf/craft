import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G1500 —— 正文里那一行待办的**身份必须持久**，否则任务页上改的东西活不过下一次保存。
 *
 * 投影对账的键是 `tasks.blockId === 正文 attrs.taskId`。修好之前那枚 attr 从没被写进文档
 * （只在 `collectTaskItems()` 的一份临时 JSON 副本上铸过一枚，事务一散就没了）⇒ 每次保存
 * 都是"新建一行＋把上一行打墓碑"。墓碑被 `getTasks` 滤掉，所以**屏上看不出行数在膨胀**；
 * 看得出来的是元数据：`dueDate`／`recurrence`／`order` 不在投影列里，行一换新就归零。
 *
 * 所以这条闸不去数行数（数不到），而是走用户真实动作：正文建一行待办 → 存两次 →
 * 任务页（第二个标签页）给它设截止日期 → 正文那一栏**不重载**再改一个字 → 行必须还是那一行、
 * 截止日期必须还在。
 */
const email = 'craft-task-identity@example.com';
const password = 'test1234';
const DUE = '2026-12-31';
const DUE_LABEL = '12月31日';

// 单跑 50s 内完成；串行全量负载下"点新建→等 URL"这一枚会被 dev 的按需编译与
// 该账号的存量文档拖过 120s（同因见 `e2e/sync.spec.ts` 顶部的 600s 注释）⇒ 整测给 300s。
test.setTimeout(300_000);

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
  await page.fill('#name', '待办身份');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 20_000 });
}

/** 列表水合完成（`getTasks` 落屏）才允许计数，否则拿到的是假基线。 */
async function openTaskList(page: Page) {
  await page.goto('/tasks/all');
  await expect(page.getByRole('main').getByText('加载中…')).toBeHidden();
}

test('任务页设的截止日期能穿过下一次正文保存', async ({ page }) => {
  await signIn(page);
  const title = `辛 ${Date.now()}`;

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(`[] ${title}`, { delay: 20 });
  await expect(editor.locator('.task-list-item')).toHaveCount(1);
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 20_000 });

  // 第二次保存＝旧代码里"再换一枚 uuid"的那一步：正文没加行，只是把同一行改了个字。
  await editor.locator('.task-list-item p').first().click();
  await page.keyboard.press('End');   // ☆ 必须先落到行尾：点击只把光标放在点到的那个字中间，插进标题串里之后这一行就再也按标题找不到了
  await page.keyboard.type(' 贰', { delay: 20 });
  await expect(page.getByRole('status').getByText('未保存')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 20_000 });

  // ☆ 任务页开在**同一上下文的第二个标签页**，编辑页那一栏自始至终不重载：
  //   把 `page.goto(docUrl)` 放进关键路径会额外制造一次"空正文先落库、真正文后落库"的竞态
  //   （串行全量负载下实测翻车＝那一趟派生 POST 带着 0 条待办打到投影，行被打成墓碑，
  //   而正文里那枚 `blockId` 完好——这条缺陷另立 G1503 记档，不是本条闸要证的事）。
  const tasksTab = await page.context().newPage();
  await openTaskList(tasksTab);
  const row = tasksTab.locator('div.border-b').filter({ hasText: title });
  await expect(row).toHaveCount(1);
  await row.getByLabel('设置提醒与重复').click();
  await row.getByLabel('截止日期').fill(DUE);
  await expect(row.getByText(DUE_LABEL)).toBeVisible();

  // ★ 决定性的一步：正文再动一次。修好之前这一动就把行换掉，截止日期跟着旧行进了墓碑。
  await page.bringToFront();
  await editor.locator('.task-list-item p').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type(' 叁', { delay: 20 });
  // ☆ 先让徽标确实被打回「未保存」，再等它回到「已保存」——否则读到的可能是上一趟保存的残留，
  //   这一动到底存没落库就变成假证。
  const status = page.getByRole('status');
  await expect(status.getByText('未保存')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByText('已保存').first()).toBeVisible({ timeout: 20_000 });

  await openTaskList(tasksTab);
  await expect(row).toHaveCount(1);
  await expect(row.getByText(DUE_LABEL)).toBeVisible();
});
