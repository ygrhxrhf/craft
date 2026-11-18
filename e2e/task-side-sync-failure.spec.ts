import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G1499 —— 派生表（反链＋任务行）同步失败**必须看得见**。
 *
 * 这条不是假想的：本机上那台 dev server 是在 `contract emit` 之前起的，内存里还拿着旧契约，
 * ⇒ `syncDocumentTasks` 每次 500（`Unknown column "cancelledAt" in table "tasks"`），
 * 而保存徽标一路写「已保存」，`Promise.allSettled` 把错误吞得干干净净——整库 `documentId` 非空的
 * 任务行数于是停在 0（原判成 G1497"投影从未落地"，真因见那一行的改判）。
 *
 * 这里不靠改数据库造故障，而是在浏览器里把带 `Next-Action` 头的那几枚 POST 直接打成 500，
 * 走完「失败 ⇒ 保存失败 ⇒ 点重试 ⇒ 已保存 ⇒ 行真的落库」整条回路。
 */
const email = 'craft-side-sync-failure@example.com';
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
  await page.fill('#name', '派生表失败');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 20_000 });
}

/**
 * Server Actions are POSTs to the page route carrying a `Next-Action` header; the page's own
 * GETs and RSC fetches must keep flowing, or nothing renders at all.
 */
async function failActionPosts(page: Page, state: { on: boolean }) {
  await page.route('**/documents/**', (route) => {
    const request = route.request();
    const isAction = request.method() === 'POST' && request.headers()['next-action'] !== undefined;
    if (!isAction || !state.on) return route.continue();
    return route.fulfill({ status: 500, contentType: 'text/plain', body: 'forced failure' });
  });
}

test('任务行同步 500 时徽标翻成「保存失败」，重试之后行真的落库', async ({ page }) => {
  await signIn(page);
  const title = `庚 ${Date.now()}`;

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('.ProseMirror');
  await editor.click();
  await page.keyboard.type(`[] ${title}`, { delay: 20 });
  await expect(editor.locator('.task-list-item')).toHaveCount(1);

  // 先证明这一条通路本来是通的（否则下面的「失败」是假的——它可能一直在失败）。
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 20_000 });

  const failing = { on: true };
  await failActionPosts(page, failing);

  // 取消那一档要写进正文，正文一存就要跑那次投影 ⇒ 这一枚 POST 必然落在被掐掉的窗口里。
  await editor.locator('.task-list-item p').first().click();
  await page.keyboard.press('Control+Alt+Shift+T');
  await expect
    .poll(() =>
      page.$$eval('.ProseMirror .task-list-item', (els) =>
        els.map((el) => el.getAttribute('data-cancelled') === 'true'),
      ),
    )
    .toEqual([true]);

  // ★ 旧代码在这里仍然写「已保存」：`Promise.allSettled` 把 500 吞了，屏上没有任何东西说明
  //   任务页今晚看不到这一行。
  const status = page.getByRole('status');
  await expect(status.getByText('保存失败')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('所有更改已保存')).toHaveCount(0);

  failing.on = false;
  await status.getByRole('button', { name: '重试' }).click();
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 20_000 });

  // 重试不是把徽标洗白了事：那一行确实进了 tasks，并被读到第三档那节里。
  // ☆ 顺序要紧：这一行是 cancelled，默认那枚开关（只显示 pending）本来就藏着它。
  await page.goto('/tasks/all');
  await page.getByRole('button', { name: '更多选项' }).click();
  await page.getByRole('menuitemcheckbox', { name: '查看已完成的任务' }).click();
  const section = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { level: 2, name: /^已取消 · \d+$/ }) })
    .first();
  await expect(section.getByText(title, { exact: true })).toBeVisible({ timeout: 20_000 });
});
