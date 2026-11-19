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

async function blankDocument(page: Page): Promise<Locator> {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();
  return editor;
}

const dialog = (page: Page): Locator => page.locator('[data-testid="imperative-dialog"]');
const dialogInput = (page: Page): Locator => dialog(page).getByRole('textbox');

/** 弹层里那个动作按钮的名字由调用方给（官方没有通用「确定」）。 */
const submitButton = (page: Page, label: string): Locator =>
  dialog(page).getByRole('button', { name: label, exact: true });

async function selectAll(page: Page, editor: Locator) {
  await editor.click();
  await page.keyboard.press('Control+a');
}

/**
 * G460：命令式弹层要能说出"用户到底做了什么"。浏览器原生 `prompt` 把取消、空串、
 * 提交三种结局塌成两种，这里逐档验一遍。
 */
test('the link dialog tells cancelling from submitting an empty value', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);

  await editor.click();
  await page.keyboard.type('复刻链接');
  await page.keyboard.press('Control+a');
  await page.getByRole('button', { name: '链接', exact: true }).click();

  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('heading', { name: '链接' })).toBeVisible();
  await dialogInput(page).fill('https://www.craft.do/');
  await page.screenshot({ path: 'screenshots/tmp-imperative-dialog.png', fullPage: true });
  await page.keyboard.press('Enter');

  await expect(dialog(page)).toHaveCount(0);
  await expect(editor.locator(`a[href="https://www.craft.do/"]`)).toHaveText('复刻链接');

  // 第二次打开：现有链接作为默认值进弹层（`show()` 的 config 真的传到了宿主）。
  await selectAll(page, editor);
  await page.getByRole('button', { name: '链接', exact: true }).click();
  await expect(dialogInput(page)).toHaveValue('https://www.craft.do/');
  await submitButton(page, '取消').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(editor.locator('a[href="https://www.craft.do/"]')).toBeVisible();

  // 提交空串＝撤链接；这一步在 `window.prompt` 下写不出来（取消也回 falsy）。
  await selectAll(page, editor);
  await page.getByRole('button', { name: '链接', exact: true }).click();
  await dialogInput(page).fill('');
  await submitButton(page, '保存').click();
  await expect(dialog(page)).toHaveCount(0);
  await expect(editor.locator('a')).toHaveCount(0);
  await expect(editor).toContainText('复刻链接');
});

test('a slash command dialog resolves Esc and leaves no residue', async ({ page: p }) => {
  await signIn(p);
  const editor = await blankDocument(p);

  await editor.click();
  await p.keyboard.type('/网页链接', { delay: 25 });
  const option = p
    .locator('[role="option"] span')
    .filter({ hasText: /^网页链接$/ })
    .first();
  await expect(option).toBeVisible();
  await option.click();

  await expect(dialog(p)).toBeVisible();
  await expect(dialog(p).getByRole('heading', { name: '输入网页 URL' })).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(dialog(p)).toHaveCount(0);

  // ☆ 历批缺陷：那句 `deleteRange` 没有 `.run()`，斜杠文本会留在正文里。
  await expect(editor.locator('> *')).toHaveCount(1);
  await expect(editor.locator('> *').first()).toHaveText('');

  await editor.click();
  await p.keyboard.type('/网页链接', { delay: 25 });
  await p
    .locator('[role="option"] span')
    .filter({ hasText: /^网页链接$/ })
    .first()
    .click();
  await dialogInput(p).fill('https://www.craft.do/');
  await submitButton(p, '插入').click();
  await expect(editor.locator('div[data-type="link-preview"]')).toBeVisible();
});

/**
 * G458：剪贴板作用域。公式块里的 textarea 是一枚 DOM 边界；没有边界时，编辑器自己的
 * `handlePaste`（空选区 + 裸 URL → 生成链接预览卡片）会先吃掉这次粘贴。
 */
test('a paste inside a block-level input stays inside it', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);

  await editor.click();
  // G1544/G1613 之后斜杠菜单的官方名是「插入 TeX 公式」（editor.spec 的 ALL_COMMANDS 同）。
  await page.keyboard.type('/插入', { delay: 25 });
  await page
    .locator('[role="option"] span')
    .filter({ hasText: /^插入 TeX 公式$/ })
    .first()
    .click();

  const area = page.locator('textarea').first();
  await expect(area).toBeVisible();
  const boundary = page.locator('[data-paste-boundary]').first();
  await expect(boundary).toBeVisible();

  const data = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'https://www.craft.do/');
    return transfer;
  });
  await area.dispatchEvent('paste', { clipboardData: data });

  await expect(editor.locator('div[data-type="link-preview"]')).toHaveCount(0);
  await expect(page.locator('[data-paste-boundary="true"]')).toHaveCount(1);
});
