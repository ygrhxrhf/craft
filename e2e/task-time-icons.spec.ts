import { expect, test, type Page } from '@playwright/test';

/**
 * `gap.md` G357 —— 任务行上的三枚并列时间入口（日历／旗子／提醒），官方量到的三条口径：
 *   - V33/V37：新建后那三枚是**选中或悬停才浮出**的临时 affordance；
 *   - V38：日历那枚在日期落定后升级成芯片「📅 10月9日」，旗子与提醒仍是纯图标；
 *   - V42：已点亮的常驻（刷新后仍在），没点亮的不在静息行上占位。
 * 另证悬停只走 meta 事务：既不把文档打回「未保存」，也不产生任何 console 错误。
 */
const email = 'craft-test@example.com';
const password = 'test1234';

test.setTimeout(300_000);

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 30_000 });
}

test('选中浮出三枚、日历落定成芯片、悬停复现且不标脏', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(String(error)));

  await signIn(page);
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('.ProseMirror');
  await editor.click();
  const title = `三枚图标-${Date.now()}`;
  await page.keyboard.type(`[] ${title}`, { delay: 20 });
  const row = editor.locator('.task-list-item').first();
  await expect(row).toHaveCount(1);

  // 1) 光标在行内 ⇒ 三枚一起浮出（V33/V37）。
  await expect(row.locator('.task-time-icon-schedule')).toHaveCount(1);
  await expect(row.locator('.task-time-icon-deadline')).toHaveCount(1);
  await expect(row.locator('.task-time-icon-reminder')).toHaveCount(1);

  // 2) 落到下一段、指针也移开 ⇒ 没有值的图标全部收起（V37）。
  await page.keyboard.press('Enter');
  await page.keyboard.type('正文', { delay: 20 });
  await page.mouse.move(5, 300);
  await expect(row.locator('.task-time-icon')).toHaveCount(0);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });

  // 3) 悬停该行 ⇒ 三枚复现（V37）。
  await row.hover();
  await expect(row.locator('.task-time-icon')).toHaveCount(3);

  // 4) 日历那枚开日菜单，选「明天」⇒ 芯片「📅 11月14日」落地（V38）。
  await row.locator('.task-time-icon-schedule').click();
  const menu = page.locator('[data-reminder-menu]');
  await expect(menu.getByText('明天')).toBeVisible();
  await menu.getByText('明天', { exact: true }).click();
  const chip = row.locator('.task-time-icon-schedule');
  await expect(chip).toHaveAttribute('data-time-icon-value', 'true');
  await expect(chip).toContainText('📅 ');
  const chipText = (await chip.textContent()) ?? '';
  expect(chipText).toMatch(/^📅 \d{1,2}月\d{1,2}日$/);
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });

  // 5) 选中离开 ⇒ 只剩已点亮的日历芯片（V42），另两枚收起。
  await editor.locator('p').last().click();
  await expect(row.locator('.task-time-icon')).toHaveCount(1);
  await expect(row.locator('.task-time-icon-schedule')).toHaveAttribute('data-time-icon-value', 'true');

  // 6) 刷新后芯片仍在（V42 跨重载）。
  await page.reload();
  await expect(page.locator('.ProseMirror').locator('.task-list-item').first().locator('.task-time-icon-schedule')).toHaveAttribute(
    'data-time-icon-value',
    'true',
    { timeout: 30_000 },
  );

  // 7) 旗子那枚开同一个日菜单；提醒那枚开七档（先关日菜单，别叠着）。
  const row2 = page.locator('.ProseMirror').locator('.task-list-item').first();
  await row2.locator('.task-time-icon-deadline').click();
  const menu2 = page.locator('[data-reminder-menu]');
  await expect(menu2.getByText('清除')).toBeVisible();
  await menu2.getByText('清除').click();
  await page.locator('.ProseMirror').locator('p').last().click();
  await row2.hover();
  await row2.locator('.task-time-icon-reminder').click();
  const presets = page.locator('[data-reminder-menu]');
  await expect(presets.getByText('20 分钟后')).toBeVisible();
  await expect(presets.getByText('留着以后用')).toBeVisible();
  await page.locator('.ProseMirror').locator('p').last().click();
  await expect(page.locator('[data-reminder-menu]')).toHaveCount(0);

  // 8) 悬停只走 meta 事务 ⇒ 不把文档打回「未保存」。
  await expect(page.getByText('所有更改已保存').first()).toBeVisible({ timeout: 30_000 });
  await row2.hover();
  await expect(row2.locator('.task-time-icon')).toHaveCount(3);
  await expect(page.getByText('未保存')).toHaveCount(0);

  expect(errors.filter((line) => !line.includes('favicon'))).toEqual([]);
});
