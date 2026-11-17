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

/** Every case starts from an empty body so one document serves all of them. */
async function reset(page: Page, editor: Locator) {
  await editor.click();
  // Atom blocks survive a single select-all delete as an empty sibling, so retry until
  // the body is one paragraph again.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.keyboard.press('Control+a');
    await page.keyboard.press('Backspace');
    if ((await editor.locator('> *').count()) === 1) return;
  }
  await expect(editor.locator('> *')).toHaveCount(1);
}

/**
 * The suggestion query ends at a space, so a name like `标题 1` is reached by typing its
 * first token and then picking the option whose *title* is that name. Matching the whole
 * option would be ambiguous — `卡片` also appears inside `网页链接`'s description.
 */
const typedQuery = (name: string) => `/${name.split(' ')[0]}`;

function slashOption(page: Page, name: string): Locator {
  const exact = new RegExp('^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$');
  return page.locator('[role="option"] span').filter({ hasText: exact }).first();
}

async function openSlash(page: Page, name: string) {
  await page.keyboard.type(typedQuery(name), { delay: 25 });
  const option = slashOption(page, name);
  await expect(option, `slash entry missing: ${name}`).toBeVisible({ timeout: 10_000 });
  return option;
}

const ALL_COMMANDS = [
  '正文', '标题', '副标题', '中标题', '小标题',
  '无序列表', '编号列表', '待办列表', '折叠列表', '取消列表格式', '引用', '插入代码区块', '表格',
  // 官方把分隔线列为四条命令（G31），一条一个权重档；本地曾经只有一条。
  '分隔线 - 极细', '分隔线 - 细', '分隔线 - 常规', '分隔线 - 粗',
  '从模板插入',
  '信息提示', '警告提示', '错误提示', '成功提示', '备注',
  'AI 生成图像', '绘图', '图片', '插入文件', '图片网格', '网页链接',
  '卡片', '@提及', '目录', '分栏', '插入 TeX 公式', '行内公式', '镜像块', '视频嵌入', '插入白板',
];

test('every slash command is reachable by name', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);

  for (const name of ALL_COMMANDS) {
    await editor.click();
    await openSlash(page, name);
    // Nothing is inserted, so the only residue is the typed query itself.
    for (let i = 0; i < typedQuery(name).length; i += 1) {
      await page.keyboard.press('Backspace');
    }
    await expect(editor.locator('> *')).toHaveCount(1);
    await expect(editor.locator('> *').first()).toHaveText('');
  }
});

/** Commands that land a node straight in the document, with the DOM that proves it. */
const INSERTS: { name: string; marker: string }[] = [
  { name: '标题', marker: 'h1' },
  { name: '副标题', marker: 'h2' },
  { name: '中标题', marker: 'h3' },
  { name: '小标题', marker: 'h4' },
  { name: '无序列表', marker: 'ul li' },
  { name: '编号列表', marker: 'ol li' },
  { name: '待办列表', marker: 'input[type="checkbox"]' },
  { name: '折叠列表', marker: '.toggle-summary' },
  { name: '引用', marker: 'blockquote' },
  { name: '插入代码区块', marker: '.crafty-code-block' },
  { name: '表格', marker: 'table' },
  // 逐档核 `data-style`：四档若都落成同一权重，只有带档名的 marker 会红。
  { name: '分隔线 - 极细', marker: 'hr[data-type="divider"][data-style="extraLight"]' },
  { name: '分隔线 - 细', marker: 'hr[data-type="divider"][data-style="light"]' },
  { name: '分隔线 - 常规', marker: 'hr[data-type="divider"][data-style="regular"]' },
  { name: '分隔线 - 粗', marker: 'hr[data-type="divider"][data-style="strong"]' },
  { name: '信息提示', marker: '.callout-content' },
  { name: '卡片', marker: '.card-block-content' },
  { name: '分栏', marker: 'div[data-type="columns"]' },
  { name: '插入 TeX 公式', marker: 'textarea' },
  { name: '绘图', marker: 'button:has-text("开始绘图")' },
  { name: '插入白板', marker: '[data-whiteboard-embed]' },
];

/** Chunked rather than one long pass: every block needs its own document, and 18 of them
 *  together overrun the per-test budget once `next dev` is warm rather than idle. */
const CHUNK = 6;

for (let start = 0; start < INSERTS.length; start += CHUNK) {
  const chunk = INSERTS.slice(start, start + CHUNK);
  const label = `${chunk[0].name} … ${chunk[chunk.length - 1].name}`;

  test(`slash commands insert their block (${label})`, async ({ page }) => {
    await signIn(page);

    for (const { name, marker } of chunk) {
      // One document per block: a leftover container (columns, table) cannot be cleared
      // down to a single paragraph reliably enough to keep the assertion honest.
      const editor = await blankDocument(page);
      await editor.click();
      await (await openSlash(page, name)).click();
      await expect(
        editor.locator(marker).first(),
        `block missing after /${name}: ${marker}`
      ).toBeVisible({ timeout: 15_000 });
    }
  });
}

test('markdown input rules convert while typing', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);

  await reset(page, editor);
  await page.keyboard.type('# 一级标题', { delay: 20 });
  await expect(editor.locator('h1')).toHaveText('一级标题');

  await reset(page, editor);
  await page.keyboard.type('### 三级标题', { delay: 20 });
  await expect(editor.locator('h3')).toHaveText('三级标题');

  await reset(page, editor);
  await page.keyboard.type('- 无序项', { delay: 20 });
  await expect(editor.locator('ul li')).toHaveText('无序项');

  await reset(page, editor);
  await page.keyboard.type('2. 有序项', { delay: 20 });
  await expect(editor.locator('ol li')).toHaveText('有序项');

  await reset(page, editor);
  await page.keyboard.type('> 引用内容', { delay: 20 });
  await expect(editor.locator('blockquote')).toContainText('引用内容');

  await reset(page, editor);
  await page.keyboard.type('[] 待办一项', { delay: 20 });
  await expect(editor.locator('input[type="checkbox"]')).toHaveCount(1);
  await expect(editor.locator('input[type="checkbox"]')).not.toBeChecked();

  await reset(page, editor);
  await page.keyboard.type('[x] 已完成项', { delay: 20 });
  await expect(editor.locator('input[type="checkbox"]')).toBeChecked();

  await reset(page, editor);
  await page.keyboard.type('```ts', { delay: 20 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('const a: number = 1;');
  await expect(editor.locator('.crafty-code-block pre')).toContainText('const a');

  await reset(page, editor);
  await page.keyboard.type('粗体 **重点** 收尾', { delay: 20 });
  await expect(editor.locator('strong')).toHaveText('重点');

  await reset(page, editor);
  // 规则是 `\s$` 收尾（markdown-mark-rules.ts）——不收尾空格不触发。
  await page.keyboard.type('划掉 ~~旧值~~ ', { delay: 20 });
  await expect(editor.locator('s')).toHaveText('旧值');

  await reset(page, editor);
  // 同上：所有 space-mark 规则都以 `\s$` 收尾。
  await page.keyboard.type('高亮 ==新值== ', { delay: 20 });
  await expect(editor.locator('mark')).toHaveText('新值');

  await reset(page, editor);
  await page.keyboard.type('[示例站](https://example.com) ', { delay: 20 });
  await expect(editor.locator('a[href="https://example.com"]')).toHaveText('示例站');

  await reset(page, editor);
  await page.keyboard.type('$x^2$', { delay: 20 });
  await expect(editor.locator('.crafty-math-inline')).toBeVisible();
});

/** Each typed sigil must produce its own official weight, not eat another. */
test('the typed divider sigils produce the official styles, each once', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);
  await reset(page, editor);

  // The forms the official docs spell out (`longtail.md`: "Type `=--` to insert strong rule"),
  // with the styles measured off the official rendered CSS. The local names this test used
  // before (`thin`/`medium`/`thick`) stay in the schema only so documents already storing them
  // still render.
  const sigils = ['..-', '.--', '---', '=--', '==='];
  const styles = ['extraLight', 'light', 'regular', 'strong', 'pageSeparator'];

  for (const sigil of sigils) {
    await page.keyboard.type(sigil, { delay: 30 });
    await page.keyboard.press('Enter');
  }

  const rules = editor.locator('hr[data-type="divider"]');
  await expect(rules).toHaveCount(5);
  for (const style of styles) {
    await expect(editor.locator(`hr[data-style="${style}"]`)).toHaveCount(1);
  }
});

test('the drag handle reorders top-level blocks', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);
  await reset(page, editor);

  await page.keyboard.type('第一块');
  await page.keyboard.press('Enter');
  await page.keyboard.type('第二块');
  await page.keyboard.press('Enter');
  await page.keyboard.type('第三块');

  const first = editor.locator('p', { hasText: '第一块' });
  const last = editor.locator('p', { hasText: '第三块' });
  await expect(first).toHaveCount(1);

  // The handle only arms while the pointer is in the editor's left gutter.
  const firstBox = await first.boundingBox();
  if (!firstBox) throw new Error('block geometry missing');
  await page.mouse.move(firstBox.x + 10, firstBox.y + firstBox.height / 2);
  const handle = page.locator('[data-drag-handle]').first();
  await expect(handle).toBeVisible();

  const from = await handle.boundingBox();
  const to = await last.boundingBox();
  if (!from || !to) throw new Error('drag geometry missing');

  // Not the handle's centre. It is 56px wide and packs a grip, a `+` and a `⋮`
  // side by side, so the centre lands on the `+` button — which stops the
  // pointerdown on purpose, leaving the drag unarmed and the reorder a no-op
  // that still looks like a clean pass. Measured: the grip is the first 16px.
  const gripX = from.x + 6;
  const gripY = from.y + from.height / 2;
  await page.mouse.move(gripX, gripY);
  await page.mouse.down();
  // The handle arms the drag only after a few pixels of travel.
  await page.mouse.move(gripX, gripY + 12, { steps: 4 });
  await page.mouse.move(gripX, to.y + to.height - 2, { steps: 12 });
  await page.mouse.up();

  await expect(editor.locator('p').first()).toHaveText('第二块');
  await expect(editor.locator('p').last()).toHaveText('第一块');

  await page.keyboard.press('Control+z');
  await expect(editor.locator('p').first()).toHaveText('第一块');
});

test('the four panel tabs each render their controls', async ({ page }) => {
  await signIn(page);
  await blankDocument(page);

  await page.getByRole('button', { name: '插入', exact: true }).click();
  // G1494 改判：这里原来断言 `getByText('标题 1')`，但**插入面板从来不列标题**（`InsertTab.tsx`
  // 的条目是 文本/页面/卡片/文件附件/图片/代码块/公式/白板/分隔线…；标题只活在斜杠菜单里），
  // 所以那是一条**陈旧选择器**（G1502 同族），与"点空了/水合慢"无关——本批连点五次都不出现，
  // 正是"内容本来就没有"的形状。判据换成面板真渲染出来的东西：它自己的 `data-testid` 与副标题。
  await expect(page.getByTestId('insert-panel')).toBeVisible();
  await expect(page.getByText('将任何项目拖放到文档中')).toBeVisible();

  await page.getByRole('button', { name: '格式', exact: true }).click();
  await expect(page.getByText('字号', { exact: true })).toBeVisible();
  await expect(page.getByLabel('增大字号')).toBeVisible();

  await page.getByRole('button', { name: '样式', exact: true }).click();
  await expect(page.getByText('文档颜色')).toBeVisible();

  await page.getByRole('button', { name: '信息', exact: true }).click();
  await expect(page.getByRole('heading', { name: '协作者' })).toBeVisible();
});

test('one command opens and closes every toggle block', async ({ page }) => {
  await signIn(page);
  const editor = await blankDocument(page);

  for (const title of ['折叠甲', '折叠乙']) {
    await editor.click();
    await page.keyboard.press('Control+End');
    await (await openSlash(page, '折叠列表')).click();
    await page.keyboard.type(title, { delay: 20 });
    await page.keyboard.press('Control+End');
  }
  await expect(editor.locator('.toggle-summary')).toHaveCount(2);

  // Asserted as the two endpoints rather than from a "both start closed"
  // baseline: the first block's content renders outside its own summary button
  // (toggle-block-view.tsx puts two NodeViewContent elements in one node view),
  // so which blocks are open on arrival is not something this command owns.
  await page.getByRole('button', { name: '格式', exact: true }).click();
  await page.getByRole('button', { name: '全部展开' }).click();
  await expect(editor.locator('[data-open="true"]')).toHaveCount(2);

  await page.getByRole('button', { name: '全部收起' }).click();
  await expect(editor.locator('[data-open="true"]')).toHaveCount(0);
});
