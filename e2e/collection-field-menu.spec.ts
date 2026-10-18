import { expect, test, type Locator, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

/** 建一个全新集合（模板与 `collection-filter.spec.ts` 同源）：新集合自带默认「名称」文本列。 */
async function createCollection(page: Page): Promise<void> {
  await page.goto('/collections');
  await page.getByRole('button', { name: /新建集合/ }).first().click();
  await page.fill('#name', `字段菜单 ${Date.now()}`);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.waitForURL(/\/collections\//);
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  await expect(main.getByRole('button', { name: '字段操作 名称' })).toBeVisible({ timeout: 30_000 });
}

const dialog = (page: Page): Locator => page.locator('[data-testid="imperative-dialog"]');
const headerNames = (page: Page) => page.locator('thead th .truncate');

/**
 * G1537：集合字段（列）可改名／隐藏／删除／重排。
 *
 * 官方文案逐字：「编辑字段」`collections.edit.field`、「字段名称」`collections.field.name`、
 * 「隐藏字段」`collections.hide.fields`、「显示/隐藏字段」`collections.show.hide.fields`、
 * 「隐藏和排序字段」`collections.hide.order.fields`、删除确认句 `alert.delete.field.desc`。
 */
test('a collection field can be renamed, hidden, reordered and deleted', async ({ page }) => {
  await signIn(page);
  await createCollection(page);

  const main = page.getByRole('main');
  const stamp = Date.now();
  const renamed = `标题列 ${stamp}`;

  // ① 改名：入口是列头上的「编辑字段」，弹层里预填当前名
  await main.getByRole('button', { name: '字段操作 名称' }).click();
  await page.getByRole('menuitem', { name: '编辑字段' }).click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('textbox')).toHaveValue('名称');
  await dialog(page).getByRole('textbox').fill(renamed);
  await dialog(page).getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(main.getByRole('button', { name: `字段操作 ${renamed}` })).toBeVisible({ timeout: 20_000 });
  await page.screenshot({ path: 'screenshots/tmp-field-menu-rename.png', fullPage: true });

  // ② 再加一列，好验证排序真的动了位置（而不是只有一列时"动不了"）
  const second = `数字列 ${stamp}`;
  await main.getByRole('button', { name: '属性', exact: true }).click();
  await page.getByLabel('属性名称').fill(second);
  await page.getByLabel('属性类型').selectOption({ label: '数字' });
  await page.getByRole('button', { name: /^创建$/ }).click();
  await expect(page.getByLabel('属性名称')).toHaveCount(0);
  await expect(main.getByRole('button', { name: `字段操作 ${second}` })).toBeVisible({ timeout: 20_000 });

  await expect(headerNames(page)).toHaveText([renamed, second]);

  // ③ 重排：官方把「隐藏和排序字段」放在视图工具条上，面板里把第二列上移
  await main.getByRole('button', { name: '隐藏和排序字段' }).click();
  const panel = page.getByRole('dialog');
  await expect(panel.getByRole('heading', { name: '隐藏和排序字段' })).toBeVisible();
  await panel.getByRole('button', { name: `上移 ${second}` }).click();
  await expect(headerNames(page)).toHaveText([second, renamed], { timeout: 20_000 });
  await panel.getByRole('button', { name: '关闭' }).click();
  await expect(headerNames(page)).toHaveText([second, renamed]);
  await page.screenshot({ path: 'screenshots/tmp-field-menu-reorder.png', fullPage: true });

  // 刷新后字段顺序仍保持，确认 order 已持久化
  await page.reload();
  await expect(headerNames(page)).toHaveText([second, renamed], { timeout: 20_000 });

  // ④ 隐藏：官方「隐藏字段」；面板底部的隐藏计数是官方单复数两键
  await main.getByRole('button', { name: `字段操作 ${second}` }).click();
  await page.getByRole('menuitem', { name: '隐藏字段' }).click();
  await expect(main.getByRole('button', { name: `字段操作 ${second}` })).toHaveCount(0, { timeout: 20_000 });
  await expect(headerNames(page)).toHaveText([renamed]);

  // 刷新后隐藏状态仍保持，确认 isVisible 已持久化
  await page.reload();
  await expect(main.getByRole('button', { name: `字段操作 ${second}` })).toHaveCount(0, { timeout: 20_000 });
  await expect(headerNames(page)).toHaveText([renamed]);

  await main.getByRole('button', { name: '隐藏和排序字段' }).click();
  await expect(panel.getByTestId('hidden-field-count')).toHaveText('1 个隐藏字段');
  // 面板里那一行还在（隐藏≠删除），并能把它放回来
  await panel.getByRole('button', { name: `显示/隐藏字段 ${second}` }).click();
  await expect(panel.getByTestId('hidden-field-count')).toHaveText('0 隐藏字段', { timeout: 20_000 });
  await panel.getByRole('button', { name: '关闭' }).click();
  await expect(headerNames(page)).toHaveText([second, renamed], { timeout: 20_000 });

  // 恢复显示后再次刷新，确认 isVisible=false -> true 也已持久化
  await page.reload();
  await expect(headerNames(page)).toHaveText([second, renamed], { timeout: 20_000 });

  // ⑤ 删除：确认句逐字是官方那句，删完列从表头消失
  await main.getByRole('button', { name: `字段操作 ${second}` }).click();
  await page.getByRole('menuitem', { name: '删除字段' }).click();
  await expect(dialog(page)).toContainText('你确定要删除该字段吗？');
  await page.screenshot({ path: 'screenshots/tmp-field-menu-delete-confirm.png', fullPage: true });
  await dialog(page).getByRole('button', { name: '删除', exact: true }).click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(headerNames(page)).toHaveText([renamed], { timeout: 20_000 });

  // 刷新后仍是同一个结果（写入真的落了库，不只是本地乐观态）
  await page.reload();
  await expect(headerNames(page)).toHaveText([renamed], { timeout: 20_000 });
});
