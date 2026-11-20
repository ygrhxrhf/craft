import { expect, test } from '@playwright/test';
import { openEditorPanel } from './editor-panel';

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

/**
 * 跨块文本选区。**不能用 Ctrl+A**：本编辑器的 Ctrl/⌘-A 是两级阶梯（G1550）——先选中
 * 当前块文字，再变成块选中，永远不会跨块。所以这里按坐标从头一个块的末尾拖到目标块末尾。
 */
async function selectAcrossBlocks(page: import('@playwright/test').Page, from: number, to: number) {
  const boxes = await page
    .locator('.ProseMirror > *')
    .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  const a = boxes[from];
  const b = boxes[to];
  if (!a || !b) throw new Error(`selectAcrossBlocks: 块 ${from}/${to} 不存在`);
  await page.mouse.move(a.x + a.width - 8, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width - 8, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
}

/**
 * 面板里的控件都只有一枚 svg 当内容，可访问名来自 title；未混合时 title 恰为档位中文名，
 * 混合时变成 `<名>（混合）`。所以只锚住开头，并把结尾收到「整名」或「（混合）」两种形态上
 * ——裸 `^默认` 会连「默认字体」一起命中（字体段那枚是完整的一档，不是对齐段）。
 */
const segment = (page: import('@playwright/test').Page, label: string) =>
  page.locator('[role="tabpanel"]').getByRole('button', { name: new RegExp(`^${label}($|（混合）)`) });

async function newDoc(page: import('@playwright/test').Page, lines: string[]) {
  await page.goto('/documents');
  // ☆ 按需编译的 dev 首屏里，按钮比它自己的 onClick 先到：点空了不发路由，
  //   于是 `waitForURL` 把整分钟预算等成一次超时。重点几下才是这条路径本来的用法。
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

  const editor = page.locator('.ProseMirror');
  await editor.click();
  for (const [index, line] of lines.entries()) {
    if (index > 0) await page.keyboard.press('Enter');
    if (line) await editor.pressSequentially(line);
  }
  return editor;
}

/** 开面板并停在「格式」页签上（G1660 后入口是顶栏的面板开关＋面板自己的 tablist）。 */
async function openFormatTab(page: import('@playwright/test').Page) {
  await openEditorPanel(page, '格式');
  await expect(segment(page, '粗体')).toBeVisible();
}

const alignOf = (page: import('@playwright/test').Page, index: number) =>
  page.$$eval('.ProseMirror > *', (els, i) => els[i]?.getAttribute('style') ?? '', index);

/** 第 index 个块的书写方向；用 computed，这样「从左到右」清掉属性后读回来的是初值。 */
const writingOf = (page: import('@playwright/test').Page, index: number) =>
  page.$$eval('.ProseMirror > *', (els, i) => getComputedStyle(els[i]!).writingMode, index);

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

  await selectAcrossBlocks(page, 0, 1);
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

  // 两段要一起进列表 ⇒ 需要**跨块**选区。Ctrl+A 在本编辑器里是两级阶梯（G1550），
  // 第一级只选当前块，选不到第二段，所以按坐标拖选（同上面两条混合态用例）。
  await putCaretIn(page, '.ProseMirror > *', 0);
  await selectAcrossBlocks(page, 0, 1);
  await segment(page, '无序列表').click();
  await expect(page.locator('.ProseMirror ul > li')).toHaveCount(2);
  // ☆ G1485 结案＝这枚空段落不再出现：包装尾部块的是 StarterKit 的 `TrailingNode`
  //   （"最后一块不是段落就补一段"），列表已排进 `notAfter`（`Editor.tsx:294`）⇒ 包装是纯块级替换。
  //   历批把这枚游离空块钉进了下面两处"形状"，现在钉的是干净的形状。
  expect(await readRows(page), '整项进列表后的正文行').toEqual([
    { tag: 'UL', text: '列表项一列表项二' },
  ]);

  await putCaretIn(page, '.ProseMirror ul > li', 1);
  await segment(page, '取消列表格式').click();
  expect(await readRows(page), '摘走末项后的正文行').toEqual([
    { tag: 'UL', text: '列表项一' },
    { tag: 'P', text: '列表项二' },
  ]);
  // 相邻项没被带走，摘出的那块也没被拆成两行。
  await expect(page.locator('.ProseMirror ul > li')).toHaveText('列表项一');
});

test('尾部列表不留游离空块，而光标照样能出列表接着写', async ({ page }) => {
  await newDoc(page, ['尾列表项']);
  await openFormatTab(page);

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '无序列表').click();
  // 包装是纯块级替换：文档以列表收尾，尾巴上没有多出来的空段（G1485）。
  expect(await readRows(page), '包成列表后的正文行').toEqual([{ tag: 'UL', text: '尾列表项' }]);

  // 去掉那枚游离空块之后，"还能不能在列表后面打字"必须自己站得住＝官方那条
  // 空项上按回车离开列表的路径。两次回车＝先在末项后分出空项、再把空项请出列表。
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  // 空项被请出列表是一个 transaction：等它真的落地再打字，否则字会落进还没让位的空项里。
  await expect(page.locator('.ProseMirror > p'), '第二次回车没把空项请出列表').toHaveCount(1);
  await page.keyboard.type('接着写的正文');
  expect(await readRows(page), '离开列表后打的字').toEqual([
    { tag: 'UL', text: '尾列表项' },
    { tag: 'P', text: '接着写的正文' },
  ]);
  // 列表本身没被顺手拆掉，也没有多出的第三行。
  await expect(page.locator('.ProseMirror ul > li')).toHaveText('尾列表项');
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

test('方向是第三根轴：从上到下写进正文，从左到右清掉属性', async ({ page }) => {
  await newDoc(page, ['第一段文字', '第二段文字']);
  await openFormatTab(page);

  // G1484 的 Complaint 是这一族整面缺席：两档都得在屏上点得到。
  await expect(segment(page, '从上到下')).toBeVisible();
  await expect(segment(page, '从左到右')).toBeVisible();

  await putCaretIn(page, '.ProseMirror > *', 0);
  await expect(segment(page, '从左到右'), '没写过属性的块该落在缺省档').toHaveAttribute('aria-pressed', 'true');

  await segment(page, '从上到下').click();
  await expect.poll(() => writingOf(page, 0), { message: '从上到下没写进正文' }).toBe('vertical-rl');
  await expect(segment(page, '从上到下')).toHaveAttribute('aria-pressed', 'true');
  await expect(segment(page, '从左到右')).toHaveAttribute('aria-pressed', 'false');

  // ☆ 这一行守的是 G153 那类事故的另一半：对齐与方向都往 `style` 里渲染，
  //   若属性合并（TipTap `mergeAttributes`）失效，点方向就会把 textAlign 抹掉。
  await segment(page, '两端对齐').click();
  await expect
    .poll(() => alignOf(page, 0), { message: '方向与对齐没能共存于同一 style' })
    .toMatch(/text-align:\s*justify/);
  expect(await writingOf(page, 0)).toBe('vertical-rl');

  await segment(page, '从左到右').click();
  await expect.poll(() => writingOf(page, 0), { message: '从左到右没清掉属性' }).toBe('horizontal-tb');
  await expect(segment(page, '从左到右')).toHaveAttribute('aria-pressed', 'true');
  expect(await alignOf(page, 0)).toBe('text-align: justify;');
});

test('方向跨轴时整组显示混合，两档都不点亮', async ({ page }) => {
  await newDoc(page, ['第一段文字', '第二段文字']);
  await openFormatTab(page);

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '从上到下').click();

  await putCaretIn(page, '.ProseMirror > *', 1);
  await expect(segment(page, '从左到右')).toHaveAttribute('aria-pressed', 'true');

  await selectAcrossBlocks(page, 1, 0);
  const mixed = page.locator('[role="tabpanel"] [data-mixed-indicator=""]');
  await expect(mixed, '方向组的混合标记没出现').toHaveCount(1);
  await expect(mixed).toHaveText('混合');
  await expect(segment(page, '从上到下')).toHaveAttribute('aria-pressed', 'false');
  await expect(segment(page, '从左到右')).toHaveAttribute('aria-pressed', 'false');

  // 光标回到竖排那块，混合消失，该档重新点亮。
  await putCaretIn(page, '.ProseMirror > *', 0);
  await expect(page.locator('[role="tabpanel"] [data-mixed-indicator=""]')).toHaveCount(0);
  await expect(segment(page, '从上到下')).toHaveAttribute('aria-pressed', 'true');
});

test('书写方向随正文往返：刷新后属性还在，清掉后刷新也回不来', async ({ page }) => {
  await newDoc(page, ['第一段文字', '第二段文字']);
  await openFormatTab(page);

  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '从上到下').click();
  await expect.poll(() => writingOf(page, 0)).toBe('vertical-rl');

  // 正文真源是 Yjs：这一笔进了房间，刷新才该读得回来。
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.locator('.ProseMirror > *')).toHaveCount(2);
  await expect.poll(() => writingOf(page, 0), { message: '竖排在往返后丢了属性' }).toBe('vertical-rl');
  await expect(await writingOf(page, 1)).toBe('horizontal-tb');

  await openFormatTab(page);
  await putCaretIn(page, '.ProseMirror > *', 0);
  await segment(page, '从左到右').click();
  await expect.poll(() => writingOf(page, 0)).toBe('horizontal-tb');

  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.locator('.ProseMirror > *')).toHaveCount(2);
  await expect
    .poll(() => writingOf(page, 0), { message: '清掉的属性又从库里长了回来' })
    .toBe('horizontal-tb');
});
