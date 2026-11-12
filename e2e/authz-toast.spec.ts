import { expect, test, type Page } from '@playwright/test';

// One account per case. They share nothing except the schema, because a case that
// asserts "the only row in the trash" would break the moment a previous run left a row.
const REJECTION = '文档不存在或不属于你';
const STALE_RESTORE = { email: 'craft-authz-restore@example.com', password: 'test1234', name: '越权恢复测试' };
const STALE_BATCH = { email: 'craft-authz-batch@example.com', password: 'test1234', name: '越权批量测试' };
const STALE_TREE = { email: 'craft-authz-tree@example.com', password: 'test1234', name: '越权删除测试' };
const LEGIT = { email: 'craft-authz-legit@example.com', password: 'test1234', name: '合法恢复测试' };

type Account = typeof LEGIT;

async function signIn(page: Page, account: Account) {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 20_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', account.name);
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.fill('#confirmPassword', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 25_000 });
}

async function titledDoc(page: Page, title: string) {
  await page.goto('/documents');
  // ☆ 与 `format-panel.spec.ts` 的 `newDoc` 同族：按需编译的 dev 首屏里，按钮比它自己的
  //   onClick 先到 ⇒ 点空了不发路由，`waitForURL` 会把整分钟预算等成一次超时（本批改完
  //   回收站清理后，进编辑器前多了一次 `/trash` 往返，这一发就现场复现了一次）。
  const create = page.getByRole('button', { name: /新建/ }).first();
  for (let attempt = 0; attempt < 5; attempt++) {
    await create.click();
    const arrived = await page
      .waitForURL(/\/documents\//, { timeout: 8_000 })
      .then(() => true)
      .catch(() => false);
    if (arrived) break;
  }
  await expect(page).toHaveURL(/\/documents\//);
  await page.getByPlaceholder('页面标题').fill(title);
  await expect(page.getByText('所有更改已保存', { exact: true })).toBeVisible({ timeout: 20_000 });
}

/** Sends a document from the sidebar tree to the trash. */
async function moveToTrash(page: Page, title: string) {
  await page.reload();
  const row = page.locator('aside').getByText(title, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  const gone = page.locator('aside').getByText(title, { exact: true });

  // ☆ The action is retried; the assertion is not.
  //
  // This row has a second write in flight when the click lands (the title typed a moment
  // ago is still on its way), and the server stamps every apply with its own arrival clock.
  // So the earlier op arrives *after* the click and re-stamps the row to a moment later
  // than the click's own stamp — the trash write then loses to itself and the row bounces
  // back. Registered as its own hole; here the retry is what a real user does when the row
  // comes back, and the second stamp is by construction later than that arrival.
  for (let attempt = 0; attempt < 3; attempt++) {
    await row.click({ button: 'right' });
    await page.getByRole('menu').getByRole('menuitem', { name: /移至最近删除/ }).click();
    // G233 put a confirmation in front of the sidebar's move-to-trash. Its confirm button
    // carries the same sentence as the menu item, so it is scoped to the dialog.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: `将"${title}"移至最近删除` })
      .click();
    const took = await expect(gone)
      .toHaveCount(0, { timeout: 6_000 })
      .then(() => true)
      .catch(() => false);
    if (took) return;
    await page.reload();
    await expect(row).toBeVisible({ timeout: 20_000 });
  }
  // All three bounced: say so with the original, unweakened judgment.
  await expect(gone).toHaveCount(0, { timeout: 20_000 });
}

/** G242: the trash screen's 「选择」 is an item in the ⋯ menu, not a toolbar button. */
async function enterSelection(page: Page) {
  await page.getByRole('button', { name: '更多', exact: true }).click();
  await page.getByRole('menuitem', { name: '选择', exact: true }).click();
}

/** Permanently deletes the one row this case put into the trash. */
async function purgeFromTrash(page: Page, title: string) {
  await page.goto('/trash');
  const row = page.locator('main').getByText(title, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await enterSelection(page);
  await page.locator('main').getByRole('checkbox', { name: `选择 ${title}` }).click();
  await page.getByRole('button', { name: '永久删除所选' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(row).toHaveCount(0, { timeout: 20_000 });
}

/**
 * ☆ 进门先把这个账号的回收站清干净。
 *
 * 本 spec 的三处判据都吃严格模式（`getByRole('button',{name:'恢复',exact:true})` ⇒ "回收站里
 * 只有这一行"就是断言本体），而"上一轮崩在清理之前"留下的 `B123-*` 行会永久留在共享账号里
 * ⇒ 一轮真红之后，每一轮都红（现跑取证：restore 账号 1 行残留、legit 账号 2 行、tree 账号 3 行，
 * 三枚标题逐字都是本 spec 自己造的 `B123-越权恢复 1791…`／`B123-合法恢复 1791…`）。
 * ☆ 这四处账号只属于本 spec，清掉的都是本 spec 自己造的行；判据一个字不松＝清空之后仍然
 *   只剩本轮那一行。与 `tasks-upcoming-sections.spec.ts`（G1504）同族、同改法。
 */
async function emptyTrash(page: Page) {
  await page.goto('/trash');
  const restoreButtons = page.getByRole('button', { name: '恢复', exact: true });
  if ((await restoreButtons.count()) === 0) return;
  await enterSelection(page);
  await page.getByRole('checkbox', { name: '全选' }).click();
  await page.getByRole('button', { name: '永久删除所选' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(restoreButtons).toHaveCount(0, { timeout: 20_000 });
}

test('a stale 恢复 row reports the rejection instead of pretending success', async ({ page, context }) => {
  test.setTimeout(240_000);
  await signIn(page, STALE_RESTORE);
  await emptyTrash(page);
  const title = `B123-越权恢复 ${Date.now()}`;
  await titledDoc(page, title);
  await moveToTrash(page, title);

  // Two tabs look at the same trash; one of them destroys the row the other still lists.
  const stale = await context.newPage();
  await stale.goto('/trash');
  await expect(stale.locator('main').getByText(title, { exact: true })).toBeVisible({ timeout: 20_000 });

  await purgeFromTrash(page, title);

  await stale.getByRole('button', { name: '恢复', exact: true }).click();
  await expect(stale.getByText(REJECTION)).toBeVisible({ timeout: 20_000 });
  await stale.close();
});

test('the batch 还原 path reports the same rejection through the same signal', async ({ page, context }) => {
  test.setTimeout(240_000);
  await signIn(page, STALE_BATCH);
  await emptyTrash(page);
  const title = `B123-越权批量 ${Date.now()}`;
  await titledDoc(page, title);
  await moveToTrash(page, title);

  const stale = await context.newPage();
  await stale.goto('/trash');
  await expect(stale.locator('main').getByText(title, { exact: true })).toBeVisible({ timeout: 20_000 });

  await purgeFromTrash(page, title);

  await enterSelection(stale);
  await stale.locator('main').getByRole('checkbox', { name: `选择 ${title}` }).click();
  await stale.getByRole('button', { name: '还原所选' }).click();
  await expect(stale.getByText(REJECTION)).toBeVisible({ timeout: 20_000 });
  await stale.close();
});

test('a second tab keeps listing a row it missed, and the next poll drops it', async ({ page, context }) => {
  await signIn(page, STALE_TREE);
  const title = `B123-越权删除 ${Date.now()}`;
  await titledDoc(page, title);

  const stale = await context.newPage();

  // A tab that is not looking at the stream cannot see a deletion, so the row
  // outlives it. That is the state this case is about: it is the reason the
  // action below has to re-check on the server instead of trusting the tree.
  //
  // Blocking the route is the honest stand-in for a background tab. It is also
  // what makes this case decidable at all: with the stream intact, the row is
  // gone before a click can ever reach it, which is the reason the original
  // version of this test could not hold a stale row in the first place.
  let cut = true;
  let passed = 0;
  await stale.route('**/api/v1/sync**', async (route) => {
    if (cut) {
      await route.abort();
      return;
    }
    passed += 1;
    await route.continue();
  });

  await stale.goto('/documents');
  const staleRow = stale.locator('aside').getByText(title, { exact: true }).first();
  await expect(staleRow).toBeVisible({ timeout: 20_000 });

  await moveToTrash(page, title);

  // Stage one: the row is still there, because this tab never heard about it.
  // Without this the final assertion would be vacuous — a row that was already
  // gone would also satisfy "gone after the poll".
  await expect(staleRow).toBeVisible({ timeout: 10_000 });

  // Stage two: let the stream through and wait out the backoff. The aborted
  // requests counted as failures, and the offline kernel backs off exponentially
  // up to 300s. Measured: nothing had come through by T+5s, and the row was
  // gone by T+10s.
  cut = false;
  await stale.bringToFront();
  await expect
    .poll(async () => stale.locator('aside').getByText(title, { exact: true }).count(), {
      timeout: 40_000,
      intervals: [500, 1000, 2000, 3000],
    })
    .toBe(0);

  // The stream really did run; the row did not vanish for want of a poll.
  expect(passed).toBeGreaterThan(0);

  await stale.close();
});

test('the same action on a row that does exist clears the row and says nothing', async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, LEGIT);
  await emptyTrash(page);
  const title = `B123-合法恢复 ${Date.now()}`;
  await titledDoc(page, title);
  await moveToTrash(page, title);

  await page.goto('/trash');
  const row = page.locator('main').getByText(title, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: '恢复', exact: true }).click();

  // The positive control: the identical click on a row that still exists takes it out
  // of the trash without an authorization message.
  await expect(row).toHaveCount(0, { timeout: 20_000 });
  await expect(page.getByText(REJECTION)).toHaveCount(0);
});
