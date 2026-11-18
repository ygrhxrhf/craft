import { expect, test, type Page } from '@playwright/test';

/**
 * G1644 —— 任务页勾选完成改为离线内核写入后的端到端回路。
 *
 * 断链时点击勾选框：本机 `applyLocal` 落库（服务端请求发不出去），列表按「只看 pending」
 * 隐去该行；恢复联网后队列在 online 事件上自动推送，重载读到服务端同一状态；打开
 * 「显示已完成的任务」仍能找到那一行、勾选态还在。这条正是本批唯一改动的主流程。
 */
const email = 'craft-task-toggle@example.com';
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
  await page.fill('#name', '离线勾选');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 20_000 });
}

test('任务页勾选完成在断链时也落库，恢复联网后服务端读到同一状态', async ({ page, context }) => {
  await signIn(page);
  const title = `离线完成 ${Date.now()}`;

  await page.goto('/tasks');
  await page.getByRole('button', { name: '新建任务' }).click();
  const input = page.getByPlaceholder('添加任务，按回车确认…');
  await input.fill(title);
  await input.press('Enter');

  const row = page.getByRole('button', { name: title, exact: true });
  await expect(row).toBeVisible();
  await expect(row.getByRole('checkbox')).toBeVisible();

  /**
   * 新建那一下的 `handleAdd` 末尾还有一次 `router.refresh()`；不等它落地就切离线，
   * 点击会卡在"等待 /tasks 导航完成"上并把行从 DOM 里换掉（首跑就是这样超时的）。
   * 先等本机队列清空，再给 RSC 刷新一拍。
   */
  await expect(page.getByTestId('sync-indicator')).toHaveCount(0, { timeout: 30_000 });
  await page.waitForTimeout(1_500);

  // 断链：勾选只落本机内核，队列里留着一条待传
  await context.setOffline(true);
  await expect(page.getByTestId('sync-indicator')).toContainText('离线');
  await row.getByRole('checkbox').click();
  await expect(row, '完成的行应从默认「只看 pending」列表里消失').toHaveCount(0);
  await expect(page.getByTestId('sync-indicator')).toContainText('离线');

  // 恢复联网：online 事件触发 flush，指示器消失＝pending 清零
  await context.setOffline(false);
  await expect(page.getByTestId('sync-indicator')).toHaveCount(0, { timeout: 30_000 });

  // 重载读的是服务端权威行，仍应是已完成（默认列表里看不见）
  await page.reload();
  await expect(page.getByRole('button', { name: title, exact: true })).toHaveCount(0);

  // 打开「显示已完成的任务」：同一行回来，且勾选态真的落了
  // G1653：开关在分区 ⋯ 里（menuitemcheckbox），点完菜单自动收起。
  await page.getByRole('button', { name: '更多选项' }).click();
  await page.getByRole('menuitemcheckbox', { name: '查看已完成的任务' }).click();
  const completed = page.getByRole('button', { name: title, exact: true });
  await expect(completed).toBeVisible();
  await expect(completed.getByRole('checkbox')).toBeChecked();

  // 清理：这一行只属于本测试账号，删掉避免累积
  await completed.hover();
  await completed.getByRole('button', { name: '删除任务' }).click();
  await expect(completed).toHaveCount(0);
});
