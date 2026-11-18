import { expect, test, type Locator, type Page } from '@playwright/test';
import { openEditorPanel } from './editor-panel';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

/** 建一篇新文档并打开「信息」页（标签区在那里），与 `tag-collection.spec.ts` 同一条路。 */
async function documentWithTagsPanel(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(`标签编辑 ${Date.now()}`);
  await page.waitForTimeout(1_500);
  await openEditorPanel(page, '信息');
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('textbox', { name: '添加标签' }) })
    .first();
  await expect(panel).toBeVisible({ timeout: 20_000 });
  return panel;
}

/**
 * G1540：标签可改名／换色。官方给标签编辑的 key 是 `tags.edit.tag`「编辑标签」。
 * 换色那一半没有官方 key，落在本地 `tag.color` 列与 `TAG_COLORS` 色板上。
 */
test('a tag can be renamed and recoloured from the editor panel', async ({ page }) => {
  await signIn(page);
  const panel = await documentWithTagsPanel(page);

  const stamp = Date.now();
  const before = `标签甲${stamp}`;
  const after = `标签乙${stamp}`;
  const input = panel.getByRole('textbox', { name: '添加标签' });
  await input.fill(before);
  await expect(page.locator('#tag-feedback')).toHaveAttribute('data-tag-feedback', 'valid');
  await input.press('Enter');
  await expect(panel.getByText(before)).toBeVisible({ timeout: 20_000 });

  // 入口可及名＝官方「编辑标签」＋标签名
  await panel.getByRole('button', { name: `编辑标签 ${before}` }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: '编辑标签' })).toBeVisible();
  await expect(dialog.getByRole('textbox', { name: '标签名称' })).toHaveValue(before);
  await page.screenshot({ path: 'screenshots/tmp-tag-edit-open.png', fullPage: true });

  await dialog.getByRole('textbox', { name: '标签名称' }).fill(after);
  // 换色：挑色板里的第二档（本地 TAG_COLORS[1] = #e0596b）
  await dialog.getByRole('button', { name: '颜色 #e0596b' }).click();
  await expect(dialog.getByRole('button', { name: '颜色 #e0596b' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  const pill = panel.getByText(after);
  await expect(pill).toBeVisible({ timeout: 20_000 });
  await expect(panel.getByText(before)).toHaveCount(0);
  // 颜色真的换了：胶囊的背景色就是色板第二档
  await expect(panel.locator('span').filter({ hasText: after }).first()).toHaveCSS(
    'background-color',
    'rgb(224, 89, 107)',
  );
  await page.screenshot({ path: 'screenshots/tmp-tag-edit-saved.png', fullPage: true });

  // 刷新后仍是新名字与新颜色（写入真的落了库）。右栏的展开态不持久，重开「信息」。
  await page.reload();
  await openEditorPanel(page, '信息');
  const panelAfter = page
    .locator('section')
    .filter({ has: page.getByRole('textbox', { name: '添加标签' }) })
    .first();
  await expect(panelAfter.getByText(after)).toBeVisible({ timeout: 20_000 });
  await expect(panelAfter.getByText(before)).toHaveCount(0);
  await expect(panelAfter.locator('span').filter({ hasText: after }).first()).toHaveCSS(
    'background-color',
    'rgb(224, 89, 107)',
  );
});
