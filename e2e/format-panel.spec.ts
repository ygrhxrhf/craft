import { expect, test } from '@playwright/test';

// 「格式」页签的屏上半：G153／G154／G155 的判据在纯核里已经锁死，这一支要证明的是
// 真屏幕上点得到、正文真写得进去、混合真的显示得出。
// Own account so this spec never touches the visual matrix or the drag-handle fixtures.
const email = 'craft-format-panel@example.com';
const password = 'test1234';

// `next dev` 按需编译，首屏能吃掉一整分钟；默认 120s 会把编译等成登录失败。
test.describe.configure({ timeout: 240_000 });

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  const signedIn = await page
    .waitForURL(/\/documents/, { timeout: 90_000 })
    .then(() => true)
    .catch(() => false);
  if (signedIn) return;

  await page.goto('/register');
  await page.fill('#name', '格式面板测试');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents/, { timeout: 90_000 });
}

/** 面板里的控件都只有一枚 svg 当内容，可访问名来自 title；未混合时 title 恰为档位中文名。 */
const segment = (page: import('@playwright/test').Page, label: string) =>
  page.locator('[role="tabpanel"]').getByRole('button', { name: new RegExp(`^${label}`) });

async function newDoc(page: import('@playwright/test').Page, lines: string[]) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);

  const editor = page.locator('.ProseMirror');
  await editor.click();
  for (const [index, line] of lines.entries()) {
    if (index > 0) await page.keyboard.press('Enter');
    if (line) await editor.pressSequentially(line);
  }
  return editor;
}

/** 顶栏那一枚 aria-label="格式" 的图标按钮打开面板并停在「格式」页签上。 */
async function openFormatTab(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: '格式', exact: true }).click();
  await expect(segment(page, '粗体')).toBeVisible();
}

const alignOf = (page: import('@playwright/test').Page, index: number) =>
  page.$$eval('.ProseMirror > *', (els, i) => els[i]?.getAttribute('style') ?? '', index);

/** 顶层正文行的形状（标签＋文字），结构类断言用它，报错时能一眼看出多出来的是哪一行。 */
const readRows = (page: import('@playwright/test').Page) =>
  page.$$eval('.ProseMirror > *', (els) =>
    els.map((el) => ({ tag: el.tagName, text: (el.textContent ?? '').trim() }))
  );

/** 点第 index 个块的文字，把光标放进去。 */
async function putCaretIn(page: import('@playwright/test').Page, selector: string, index: number) {
  const box = await page.locator(selector).nth(index).boundingBox();
  if (!box) throw new Error(`no box for ${selector}[${index}]`);
  await page.mouse.click(box.x + 6, box.y + box.height / 2);
}

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

test('对齐是独立控件：两端对齐写进正文，默认档清掉属性', async ({ page }) => {
  await newDoc(page, ['第一段文字', '第二段文字']);
  await openFormatTab(page);

  // G153 的历史 Complaint 是「对齐按钮装的其实是缩进」——两档必须在屏上各自存在。
  await expect(segment(page, '两端对齐')).toBeVisible();
  await expect(segment(page, '默认')).toBeVisible();
  await expect(segment(page, '减少缩进')).toBeVisible();
  await expect(segment(page, '增加缩进')).toBeVisible();

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '两端对齐').click();
  await expect.poll(() => alignOf(page, 0), { message: '两端对齐没写进正文' }).toBe('text-align: justify;');
  await expect(segment(page, '两端对齐')).toHaveAttribute('aria-pressed', 'true');

  await segment(page, '默认').click();
  await expect.poll(() => alignOf(page, 0), { message: '默认档没清掉 textAlign' }).toBe('');
  await expect(segment(page, '默认')).toHaveAttribute('aria-pressed', 'true');
});

test('选区跨档时显示「混合」，且没有任何一档点亮', async ({ page }) => {
  await newDoc(page, ['第一段文字', '第二段文字']);
  await openFormatTab(page);

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '两端对齐').click();
  await putCaretIn(page, '.ProseMirror > *', 1);
  await segment(page, '左对齐').click();

  await page.keyboard.press('Control+A');
  const mixed = page.locator('[role="tabpanel"] [data-mixed-indicator=""]');
  await expect(mixed, '混合标记没出现').toHaveCount(1);
  await expect(mixed).toHaveText('混合');

  for (const label of ['左对齐', '居中对齐', '右对齐', '两端对齐', '默认']) {
    await expect(segment(page, label), `${label} 不该在混合时点亮`).toHaveAttribute('aria-pressed', 'false');
  }
  // 混合时官方把档位名带上「混合」，控件不替用户挑第一个值。
  await expect(segment(page, '两端对齐')).toHaveAccessibleName(/^两端对齐（混合）$/);

  // 光标回到单块后混合消失，该档重新点亮。
  await putCaretIn(page, '.ProseMirror > *', 0);
  await expect(page.locator('[role="tabpanel"] [data-mixed-indicator=""]')).toHaveCount(0);
  await expect(segment(page, '两端对齐')).toHaveAttribute('aria-pressed', 'true');
});

test('取消列表格式是显式一档：光标档只动当前块', async ({ page }) => {
  await newDoc(page, ['列表项一', '列表项二']);
  await openFormatTab(page);

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '无序列表').click();
  await expect(page.locator('.ProseMirror ul > li')).toHaveText('列表项一');
  await expect(segment(page, '取消列表格式')).toHaveAttribute('aria-pressed', 'false');

  await segment(page, '取消列表格式').click();
  await expect(page.locator('.ProseMirror ul'), '取消列表格式没把块放回正文').toHaveCount(0);
  expect(await readRows(page)).toEqual([
    { tag: 'P', text: '列表项一' },
    { tag: 'P', text: '列表项二' },
  ]);
  await expect(segment(page, '取消列表格式')).toHaveAttribute('aria-pressed', 'true');
});

test('两项列表摘走末项：前项留在列表里，且不多出正文行', async ({ page }) => {
  await newDoc(page, ['列表项一', '列表项二']);
  await openFormatTab(page);

  // 面板刚被点过，焦点在按钮上；先把光标放回正文，`Ctrl+A` 才是编辑器的全选而不是浏览器的。
  await putCaretIn(page, '.ProseMirror > *', 0);
  await page.keyboard.press('Control+A');
  await segment(page, '无序列表').click();
  await expect(page.locator('.ProseMirror ul > li')).toHaveCount(2);
  // ☆ 屏上实测到的既有行为（本批之前就如此，`toggleBulletList` 一字未改）＝把文档末尾的块包成列表时
  //   多出一个空段落。已另立 G1485 记账；这里把它钉进"摘之前"的形状，是为了下一行能证明
  //   取消列表格式自己既不添行也不删行。
  expect(await readRows(page), '整项进列表后的正文行').toEqual([
    { tag: 'UL', text: '列表项一列表项二' },
    { tag: 'P', text: '' },
  ]);

  await putCaretIn(page, '.ProseMirror ul > li', 1);
  await segment(page, '取消列表格式').click();
  expect(await readRows(page), '摘走末项后的正文行').toEqual([
    { tag: 'UL', text: '列表项一' },
    { tag: 'P', text: '列表项二' },
    { tag: 'P', text: '' },
  ]);
  // 相邻项没被带走，摘出的那块也没被拆成两行。
  await expect(page.locator('.ProseMirror ul > li')).toHaveText('列表项一');
});

test('行内格式三态：部分加粗显示混合，整段加粗才回到开', async ({ page }) => {
  await newDoc(page, ['前半后半']);
  await openFormatTab(page);

  // 块首是 gap 位，PM 会吃掉第一下方向键：这里不假设选中几个字，只要求"部分加粗"。
  await putCaretIn(page, '.ProseMirror > *', 0);
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.up('Shift');
  await segment(page, '粗体').click();

  const strong = page.locator('.ProseMirror strong');
  await expect(strong).toHaveCount(1);
  const marked = (await strong.textContent()) ?? '';
  expect(marked.length).toBeGreaterThan(0);
  expect(marked.length).toBeLessThan('前半后半'.length);

  await page.keyboard.press('Control+A');
  await expect(segment(page, '粗体'), '半粗选区不该显示为已加粗').toHaveAttribute('aria-pressed', 'mixed');
  await expect(segment(page, '粗体')).toHaveAccessibleName(/^粗体（混合）$/);

  // 同一选区再点一次＝整段加粗，三态回到「开」。
  await segment(page, '粗体').click();
  await page.keyboard.press('Control+A');
  await expect(page.locator('.ProseMirror strong')).toHaveText('前半后半');
  await expect(segment(page, '粗体')).toHaveAttribute('aria-pressed', 'true');
});
