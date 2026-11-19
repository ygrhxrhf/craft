import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

// 面板分组标题 → `user` 表列名。三开关各占一列，所以"这一笔推上去了没有"只能按列读。
const PREF = {
  '评论和提及': 'notifyComments',
  '提醒': 'notifyReminders',
  '每日电子邮件': 'notifyDaily',
} as const;
type Group = keyof typeof PREF;
const GROUPS = Object.keys(PREF) as Group[];

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

function switchOf(page: Page, group: Group) {
  // Each group holds one 电子邮件通知 switch, so address it through its own heading.
  return page.getByRole('heading', { name: group, exact: true })
    .locator('xpath=..')
    .getByRole('switch');
}

/**
 * 按一下开关，并且等到内核真的把它推上服务端。
 *
 * 写入走 `applyLocal`＝先画屏幕、入队，去抖 2s 后才发 POST。所以「刷新后还是关的」
 * 这句话必须等那一笔落地再说——否则重新加载读到的是旧行，测试就只是在测自己的时钟，
 * 而不是持久化（这正是 G03 一直没被验到的原因）。
 */
async function flip(page: Page, group: Group, checked: 'true' | 'false') {
  const key = PREF[group];
  // 先挂监听再点：POST 的体里带列名与目标值，所以不会和同 URL 上的读混起来。
  const accepted = page
    .waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        new URL(res.url()).pathname === '/api/v1/sync' &&
        (res.request().postData() ?? '').includes(`"${key}":${checked === 'true'}`),
      { timeout: 20_000 },
    )
    .then((res) => {
      expect(res.ok(), `内核没有把 ${key} 推上服务端（HTTP ${res.status()}）`).toBe(true);
      return res;
    });

  await switchOf(page, group).click();
  await expect(switchOf(page, group)).toHaveAttribute('aria-checked', checked);
  await accepted;
}

async function openNotifications(page: Page) {
  await page.goto('/settings');
  await page.getByRole('button', { name: '通知', exact: true }).click();
  // 面板里是 4 枚：三枚全局（评论/提醒/每日摘要）＋「空间」段的每空间邮件档（跟随全局设置）。
  await expect(page.getByRole('switch')).toHaveCount(4);

  // The account is shared with other specs, so normalize before asserting rather than
  // assuming the switches are on. 每次纠正都等到落地，后面的"重载后仍是这个值"才有的说。
  for (const group of GROUPS) {
    const toggle = switchOf(page, group);
    if ((await toggle.getAttribute('aria-checked')) !== 'true') await flip(page, group, 'true');
  }
  for (const group of GROUPS) {
    await expect(switchOf(page, group)).toHaveAttribute('aria-checked', 'true');
  }
}

async function reopenNotifications(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: '通知', exact: true }).click();
  // 面板里是 4 枚：三枚全局（评论/提醒/每日摘要）＋「空间」段的每空间邮件档（跟随全局设置）。
  await expect(page.getByRole('switch')).toHaveCount(4);
}

test('the comments switch comes back off after a reload, and its neighbours are untouched', async ({ page }) => {
  await signIn(page);
  await openNotifications(page);

  const comments = switchOf(page, '评论和提及');
  await expect(comments).toHaveAttribute('aria-checked', 'true');
  await flip(page, '评论和提及', 'false');

  // The reload re-reads the row, so this is the stored value rather than a local paint.
  await reopenNotifications(page);
  await expect(switchOf(page, '评论和提及')).toHaveAttribute('aria-checked', 'false');
  await expect(switchOf(page, '提醒')).toHaveAttribute('aria-checked', 'true');
  await expect(switchOf(page, '每日电子邮件')).toHaveAttribute('aria-checked', 'true');

  await flip(page, '评论和提及', 'true');
});

test('the daily switch comes back off on its own after a reload', async ({ page }) => {
  await signIn(page);
  await openNotifications(page);

  await flip(page, '每日电子邮件', 'false');

  await reopenNotifications(page);
  await expect(switchOf(page, '每日电子邮件')).toHaveAttribute('aria-checked', 'false');
  await expect(switchOf(page, '评论和提及')).toHaveAttribute('aria-checked', 'true');

  await flip(page, '每日电子邮件', 'true');
});
