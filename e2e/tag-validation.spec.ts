import { expect, test } from '@playwright/test';
import { openEditorPanel } from './editor-panel';

const email = 'craft-test@example.com';
const password = 'test1234';

/** G169/G170: the editor tag field runs the official rule table while you type — the six
 *  character rules each name themselves, the two-level tree caps at one `/`, and a legal
 *  hierarchy tag attaches and survives a reload. */
test('the tag input validates against the official rules', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  const stamp = Date.now();
  await page.getByRole('button', { name: '新建文档' }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(`标签校验 ${stamp}`);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);

  await openEditorPanel(page, '信息');
  const section = page.locator('section').filter({ has: page.getByRole('textbox', { name: '添加标签' }) }).first();
  await expect(section).toBeVisible({ timeout: 20_000 });
  const input = section.getByRole('textbox', { name: '添加标签' });
  const feedback = page.locator('#tag-feedback');

  await expect(input).toHaveAttribute('placeholder', /父级\/子级/);

  const CASES: [string, string, string][] = [
    ['紧急', 'valid', '标签有效'],
    ['阅读 清单', 'invalid', '标签中不允许使用空格和标点符号。'],
    [`急${stamp}🚀`, 'invalid', '标签不能包含表情符号'],
    ['#ff0000', 'invalid', '十六进制格式的颜色值，如 #ff0000 或 #ccc'],
    [`#${stamp}`, 'invalid', '仅包含数字的标签，例如#1'],
    ['父/子/孙', 'invalid', '仅允许一个“/”'],
    ['工作/', 'typing', '继续输入以创建有效标签'],
  ];

  for (const [typed, kind, message] of CASES) {
    await input.fill(typed);
    await expect(feedback).toHaveAttribute('data-tag-feedback', kind);
    await expect(feedback).toContainText(message);
  }

  // An illegal draft cannot be submitted, even with the keyboard.
  await input.fill('#ccc');
  await expect(section.getByRole('button', { name: '添加' })).toBeDisabled();

  const child = `校验${stamp}`;
  await input.fill(`工作/${child}`);
  await expect(feedback).toHaveAttribute('data-tag-feedback', 'valid');
  await input.press('Enter');

  const chip = section.getByText(`工作/${child}`);
  await expect(chip).toBeVisible({ timeout: 20_000 });

  await page.reload();
  await openEditorPanel(page, '信息');
  const reloaded = page.locator('section').filter({ has: page.getByRole('textbox', { name: '添加标签' }) }).first();
  await expect(reloaded.getByText(`工作/${child}`)).toBeVisible({ timeout: 20_000 });
});
