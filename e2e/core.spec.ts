import { expect, test } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

test('login redirects to documents', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
});

test('create document, edit, and persist content', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  // 新建文档
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);

  // 输入内容并等待自动保存
  const editor = page.locator('.ProseMirror .tiptap').first().or(page.locator('[contenteditable="true"]').first());
  const marker = `E2E 冒烟内容 ${Date.now()}`;
  await editor.click();
  await editor.fill(marker);
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 15_000 });

  // 刷新后内容仍在
  await page.reload();
  await expect(page.locator('.ProseMirror p', { hasText: marker })).toBeVisible();
});

test('settings persist preference selection', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await page.getByRole('button', { name: '外观', exact: true }).click();

  const themes = page.getByRole('button', { name: /^(系统|浅色|深色)$/ });
  await expect(themes).toHaveCount(3);
  // The panel loads preferences asynchronously; the pressed state only appears once they arrive.
  const pressedTheme = page.getByRole('button', { name: /^(系统|浅色|深色)$/, pressed: true });
  await expect(pressedTheme).toBeVisible();
  const original = (await pressedTheme.textContent())?.trim() ?? '';

  const next = original === '深色' ? '浅色' : '深色';
  await page.getByRole('button', { name: next, exact: true }).click();
  await expect(page.getByRole('button', { name: next, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );

  // The preference write rides the offline kernel (`applyLocal` + 2s 去抖 flush), so the row the
  // panel reads after a reload only agrees once the kernel has delivered it. Poll the reloaded
  // read instead of asserting once — 与 share-*.spec 同一裁定。
  await expect(async () => {
    await page.reload();
    await page.getByRole('button', { name: '外观', exact: true }).click();
    await expect(page.getByRole('button', { name: next, exact: true })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  }).toPass({ timeout: 60_000, intervals: [2_000] });

  await page.getByRole('button', { name: original, exact: true }).click();
  await expect(page.getByRole('button', { name: original, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

// 外观面板的主题写入走离线内核（`applyLocal` + 队列 flush，2s debounce）：
// 乐观绘制是红线要求，不是这个测试要防的事。它要防的是另一件事——**这一笔到不了服务端**
// （队列被丢弃 / boot 没补推 / 列白名单漏了 theme），那才是"屏上改了、库里没改"的分叉。
// 两个时钟都从不阻塞请求来读：按住 POST 会拖慢同一 URL 上的读，动的正是被测的延迟本身。
test('theme choice paints optimistically and the offline kernel delivers it', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  await page.goto('/settings');
  // 通知 renders 载入中… until `prefs` is non-null. The pressed theme in 外观 cannot be the
  // gate, because `prefs?.theme ?? 'system'` paints 系统 as chosen while the read is still
  // outstanding, so "some theme is pressed" is not evidence that preferences arrived.
  await page.getByRole('button', { name: '通知', exact: true }).click();
  await expect(page.getByText('载入中…').first()).toBeHidden({ timeout: 60_000 });
  await page.getByRole('button', { name: '外观', exact: true }).click();

  const pressedTheme = page.getByRole('button', { name: /^(系统|浅色|深色)$/, pressed: true });
  await expect(pressedTheme).toBeVisible();
  const original = (await pressedTheme.textContent())?.trim() ?? '';
  const next = original === '深色' ? '浅色' : '深色';
  const wire = { 系统: 'system', 浅色: 'light', 深色: 'dark' } as const;
  const nextButton = page.getByRole('button', { name: next, exact: true });

  // The write is the one POST whose body carries the value, so it cannot be confused with
  // the reads that share this URL.
  let acceptedAt = 0;
  const accepted = page
    .waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        (res.request().postData() ?? '').includes(`"${wire[next]}"`),
      { timeout: 60_000 }
    )
    .then((res) => {
      acceptedAt = Date.now();
      return res;
    });

  await nextButton.click();
  await expect(nextButton).toHaveAttribute('aria-pressed', 'true');
  const paintedAt = Date.now();
  const res = await accepted;
  expect(res.ok(), '离线内核没有把这次偏好写入推上服务端').toBe(true);

  // 队列的 debounce 是 2000ms，所以"绘制早于服务端接受"必然成立；留 500ms 余量而不是留 0，
  // 是为了让这条断言真的能区分乐观绘制与"等 POST 回来再画"（后者是红线要排除的形态）。
  expect(
    acceptedAt - paintedAt,
    `服务端在 ${acceptedAt - paintedAt}ms 内就接受了这次选择，乐观绘制无从证明；` +
      '若写入改回阻塞式 POST，这条断言应当失败'
  ).toBeGreaterThanOrEqual(500);

  // And the row agrees with what the panel claims.
  await page.reload();
  await page.getByRole('button', { name: '通知', exact: true }).click();
  await expect(page.getByText('载入中…').first()).toBeHidden();
  await page.getByRole('button', { name: '外观', exact: true }).click();
  await expect(nextButton).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: original, exact: true }).click();
  await expect(page.getByRole('button', { name: original, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true'
  );
});

// 侧栏的主题下拉与设置面板同一条通路：`setTheme` 立即画，`applyLocal` 入队后由内核推送。
// 这里同时验两件事——绘制不等服务端、换页不丢队列——用的是同一笔请求的两个时钟，
// 且不按住请求来读（按住会拖慢同 URL 的读，动的正是被测延迟）。
test('sidebar theme choice paints optimistically and survives a reload', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);

  const html = page.locator('html');
  const cls = (await html.getAttribute('class')) ?? '';
  const wasDark = cls.includes('dark');
  const choice = wasDark ? '浅色' : '深色';
  const wire = wasDark ? 'light' : 'dark';

  let acceptedAt = 0;
  const accepted = page
    .waitForResponse(
      (res) =>
        res.request().method() === 'POST' &&
        (res.request().postData() ?? '').includes(`"${wire}"`),
      { timeout: 20_000 }
    )
    .then((res) => {
      acceptedAt = Date.now();
      return res;
    });

  await page.getByRole('button', { name: '切换主题' }).click();
  await page.getByRole('menuitem', { name: choice, exact: true }).click();

  await expect(html).toHaveClass(new RegExp(`\\b${wire}\\b`));
  const paintedAt = Date.now();

  // 乐观绘制与入队之间的窗口：立刻换页测试队列是否还在。pending 只活在内存里时这一笔会
  // 静默丢失——屏上已改、库里没改，正是这条测试要拦的回归（spec 7.x 离线内核的持久性）。
  await page.reload();
  await expect(html).toHaveClass(new RegExp(`\\b${wire}\\b`));
  const res = await accepted;
  expect(res.ok(), '离线内核没有把侧栏的主题选择推上服务端').toBe(true);

  // 与设置面板同一裁定：先绘制、后入队，`localStorage`（next-themes）与服务端行只是短暂不同步，
  // 队列会在下一次 boot/flush 补上，不再需要"等服务端才画"。
  expect(
    acceptedAt - paintedAt,
    `侧栏在 ${acceptedAt - paintedAt}ms 内就等到服务端接受，乐观绘制无从证明`
  ).toBeGreaterThanOrEqual(500);

  // Back to the neutral default so the row is not left on whatever this run demoed.
  await page.getByRole('button', { name: '切换主题' }).click();
  await page.getByRole('menuitem', { name: '跟随系统', exact: true }).click();
  await expect(html).toHaveClass(/\b(light|dark)\b/);
});

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

async function newDocument(page: import('@playwright/test').Page) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  return page.locator('[contenteditable="true"]').first();
}

test('[[^ link addresses a single block and jumps back to it', async ({ page }) => {
  await signIn(page);
  const marker = `锚点段落 ${Date.now()}`;

  const target = await newDocument(page);
  const targetId = new URL(page.url()).pathname.split('/').pop()!;
  await target.click();
  await page.keyboard.type(marker, { delay: 8 });
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  const source = await newDocument(page);
  await source.click();
  await page.keyboard.type(`[[${marker}`, { delay: 40 });

  await expect(page.getByText('链接到块')).toBeVisible({ timeout: 20_000 });
  await page.locator(`button[data-block-hit-document="${targetId}"]`).first().click();

  // G32：块一打开就有稳定 id，所以链接存的是 `blockId`（chip 带 `data-block-target`），
  // 不再是"按位置"的 `data-block-index`——那条位置回退只服务 B3 之前的旧链接。
  const chip = page.locator('[data-block-target]').first();
  await expect(chip).toBeVisible();
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });
  // B3 之后每个块都带 id，`[data-block-id]`.first() 会命中空块 ⇒ 用 chip 上那枚 id 精确取。
  const targetBlockId = (await chip.getAttribute('data-block-target'))!;

  // G1495：那枚高亮 overlay 自带 1400ms 生命期（`block-anchor.ts:60` 到点就 `remove()`），
  // 而点完 chip 再等 `waitForURL` 才轮到断言 ⇒ dev 按需编译快过 1400ms 时这段窗口整个走完，
  // 第一次轮询必然 miss＝结构性假红（不是功能坏、也不是超时）。所以**先开观察再点**：
  // `waitForSelector(state:'attached')` 在点击之前就挂上监听，overlay 一被 append 就记下，
  // 它自己随后移除也不影响这个 promise 已经 resolve。
  // ☆ 不许把 `block-anchor.ts` 的 1400ms 调大来"修"这条断言——那是拿产品行为喂测试。
  const flashSeen = page.waitForSelector('.block-anchor-flash', { state: 'attached', timeout: 20_000 });
  await chip.click();
  // 跨文档跳转：地址必须落到**目标文档**的 id 锚点上。id 由 B3 常驻，所以这里直接是 `#b-`，
  // 不再先经过 `#i-N` 再被编辑器改写。
  await page.waitForURL(new RegExp(`/documents/${targetId}#b-${targetBlockId}`));

  // The jump stamps a stable id through the open editor, so the address bar ends up
  // on the id rather than the positional hint.
  const anchored = page.locator(`[data-block-id="${targetBlockId}"]`);
  await flashSeen;
  await expect(anchored).toHaveText(marker);
  await expect(page).toHaveURL(/#b-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/);

  const blockId = (await anchored.getAttribute('data-block-id'))!;
  await page.reload();
  await expect(page.locator(`[data-block-id="${blockId}"]`)).toHaveText(marker);
});

test('a block link into the current document still highlights its block', async ({ page }) => {
  await signIn(page);
  const marker = `同篇锚点 ${Date.now()}`;

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const docId = new URL(page.url()).pathname.split('/').pop()!;
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(marker, { delay: 8 });
  await page.keyboard.press('Enter');
  // The block roster is read from Postgres, not from the live editor: without this the
  // paragraph being searched has not been persisted yet and the menu has nothing to show.
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });
  await page.keyboard.type(`[[${marker}`, { delay: 40 });

  await expect(page.getByText('链接到块')).toBeVisible({ timeout: 20_000 });
  await page.locator(`button[data-block-hit-document="${docId}"][data-block-hit-index="0"]`).click();

  // G32：chip 现在带的是常驻 id（`data-block-target`），不再有位置回退的 `data-block-index`。
  const chip = page.locator('[data-block-target]').first();
  await expect(chip).toBeVisible();
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  // One document, two blocks: the push only changes the fragment, and `history.pushState`
  // fires no `hashchange` — so the address lands and nothing re-arms the anchor hunt.
  // A fragment change never emits a `load` event, so this asserts the URL rather than
  // waiting for a navigation (`waitForURL` would block on a load that cannot happen).
  await chip.click();
  await expect(page.locator('.block-anchor-flash')).toBeVisible({ timeout: 4_000 });
  await expect(page).toHaveURL(new RegExp(`/documents/${docId}#b-[0-9a-f]{8}-`));
  await expect(page.locator('[data-block-id]').first()).toHaveText(marker);
});

test('imports a markdown file into a real document', async ({ page }) => {
  await signIn(page);
  const title = `导入测试 ${Date.now()}`;
  const source = `# ${title}\n\n- [x] 已完成项\n- 普通项\n\n> 引用与 **粗体**\n\n\`\`\`ts\nconst a = 1;\n\`\`\`\n`;

  await page.locator('input[type="file"]').first().setInputFiles({
    name: `${title}.md`,
    mimeType: 'text/markdown',
    buffer: Buffer.from(source, 'utf-8'),
  });

  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor.locator('h1')).toHaveText(title);
  await expect(editor.getByRole('checkbox')).toHaveCount(2);
  await expect(editor.getByRole('checkbox').first()).toBeChecked();
  await expect(editor.locator('blockquote strong')).toHaveText('粗体');
  await expect(editor.locator('pre code')).toContainText('const a = 1;');
});

test('collection gains properties, a formula, and gallery and form views', async ({ page }) => {
  await signIn(page);
  const name = `实验集合 ${Date.now()}`;

  await page.goto('/collections');
  await page.getByRole('button', { name: '新建集合' }).click();
  await page.getByLabel('名称').fill(name);
  await page.getByRole('button', { name: '创建' }).click();
  await page.waitForURL(/\/collections\/[^/]+$/);

  const addProperty = async (label: string, typeLabel: string, expression?: string) => {
    await page.getByRole('button', { name: '属性' }).click();
    await page.getByLabel('属性名称').fill(label);
    // G396: the type picker is a radiogroup of icon buttons, not a <select>.
    await page.getByLabel('属性类型').getByRole('radio', { name: typeLabel }).click();
    if (expression) await page.getByLabel('公式表达式').fill(expression);
    await page.getByRole('button', { name: '创建' }).click();
    // The header's accessible name also carries the ⋯ menu button (`价格 字段操作 价格`),
    // so an exact match never lands; the label as a substring is the stable assertion.
    await expect(page.getByRole('columnheader', { name: label })).toBeVisible();
  };

  await addProperty('价格', '数字');
  await addProperty('数量', '数字');
  await addProperty('金额', '公式', '{价格} * {数量}');

  await page.getByRole('button', { name: '新建', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);

  const row = page.locator('tbody tr').first();
  // 无排序/分组/筛选的视图可拖拽重排，每行最前面多一格拖拽手柄 ⇒ 数据列从第 2 格起。
  // 写死下标会在两种视图形态间来回错位，所以先量出偏移。
  const offset = (await row.locator('td').first().locator('button[aria-label^="拖动排序"]').count()) > 0 ? 1 : 0;
  const cellAt = (column: number) => row.locator('td').nth(column + offset);
  const setCell = async (column: number, value: string) => {
    await cellAt(column).click();
    await cellAt(column).locator('input').fill(value);
    await page.keyboard.press('Enter');
    await expect(cellAt(column)).toContainText(value);
  };

  await setCell(0, '苹果');
  await setCell(1, '12');
  await setCell(2, '3');
  // The formula column reads its siblings from the same row.
  await expect(cellAt(3)).toHaveText('36');

  // 视图切换按钮的可见文本是「视图」，但工具条上还有一枚 `aria-label="视图操作"` 的按钮，
  // 不加 exact 会撞严格模式（两者都以「视图」开头）。
  await page.getByRole('button', { name: '视图', exact: true }).click();
  await page.getByRole('menuitem', { name: '画廊' }).click();
  await page.getByRole('tab', { name: '画廊' }).click();
  await expect(page.getByText('苹果').first()).toBeVisible();

  await page.getByRole('button', { name: '视图', exact: true }).click();
  await page.getByRole('menuitem', { name: '表单' }).click();
  await page.getByRole('tab', { name: '表单' }).click();
  const nameField = page.locator('form label').filter({ hasText: '名称' }).first();
  await nameField.locator('div.cursor-pointer').click();
  await nameField.locator('input').fill('橙子');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: '添加条目' }).click();
  await expect(page.getByText('橙子').first()).toBeVisible();
});

test('recurring task rolls forward to the next occurrence', async ({ page }) => {
  await signIn(page);
  const title = `每日复盘 ${Date.now()}`;
  // Local calendar date, not the UTC slice: 在 UTC+8 的 08:00 之前 `toISOString()` 还是昨天，
  // 而 `adoptDateExpression` 会静默忽略过去的日期 ⇒ 芯片永远停在「截止」。
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  await page.goto('/tasks');

  // 「显示已完成的任务」是设备级开关且默认关，已完成的一期不进列表 ⇒
  // 要看"完成的那期留作历史"必须先开开关，否则断言的是过滤器的结果而不是 rollForward 的结果。
  const showCompleted = page.getByRole('switch', { name: '显示已完成的任务' });
  await expect(showCompleted).not.toBeChecked();
  await showCompleted.check();

  await page.getByPlaceholder('添加任务，按回车确认…').fill(title);
  await page.keyboard.press('Enter');

  const card = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) }).first();
  await expect(card.getByText(title, { exact: true })).toBeVisible();

  // 截止日期是 popover 芯片（G332–G373）：`设置截止日期` 才是触发器，日期框在浮层里。
  const deadlineChip = card.getByRole('button', { name: '设置截止日期' });
  await deadlineChip.click();
  const datePanel = page.getByTestId('task-date-popover');
  await datePanel.locator('input[aria-label="日期"]').fill(today);
  await page.keyboard.press('Enter');
  await expect(deadlineChip).not.toHaveText(/^截止$/);

  // 重复是「设置提醒与重复」面板里的四档 select（值就是 daily），锚点由 repeatRuleFor 补足。
  // 取 role=combobox 而不是 getByLabel：这根 select 由 <label> 包着，label 的文本里还含各选项，
  // `getByLabel('重复', { exact: true })` 匹配不上；可及名（aria snapshot 里的 "重复"）才是准的。
  await card.getByLabel('设置提醒与重复').click();
  const repeat = card.getByRole('combobox', { name: '重复', exact: true });
  await repeat.selectOption('daily');
  await expect(repeat).toHaveValue('daily');
  await expect(card.locator('span', { hasText: '每天' })).toBeVisible();

  await card.getByRole('checkbox').click();

  // The completed instance stays as history and a fresh occurrence appears.
  const instances = page.locator('div.border-b', { has: page.getByText(title, { exact: true }) });
  await expect(instances).toHaveCount(2);
  await expect(page.locator('span.line-through', { hasText: title })).toHaveCount(1);
  await expect(instances.locator('span', { hasText: '每天' })).toHaveCount(2);

  // 显式指向已完成的那一期：`card` 是惰性 locator，此刻列表里已有两期，
  // 不锚定删除会随机打在新一期上，"留作历史"这条断言就变成空转。
  const completedInstance = page.locator('div.border-b', { has: page.locator('span.line-through', { hasText: title }) });
  await expect(completedInstance).toHaveCount(1);

  // 删除 → applyLocal(patch:null) + flushNow。刷新后仍只剩一期才算数：
  // 只验"屏上消失"会漏掉"仅本地 store 生效、服务端没落墓碑"这一类回归（读路径是服务端权威行）。
  await completedInstance.getByLabel('删除任务').click();
  await expect(instances).toHaveCount(1);
  await page.reload();
  await expect(instances).toHaveCount(1);
  await expect(page.locator('span.line-through', { hasText: title })).toHaveCount(0);
  await expect(instances.locator('span', { hasText: '每天' })).toHaveCount(1);
});

test('镜像 copies another document’s block in read-only form', async ({ page }) => {
  await signIn(page);
  const marker = `镜像源段落 ${Date.now()}`;

  const target = await newDocument(page);
  await target.click();
  await page.keyboard.type(marker, { delay: 8 });
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  const source = await newDocument(page);
  await source.click();
  await page.keyboard.type(`[[${marker}`, { delay: 40 });

  await expect(page.getByText('链接到块')).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: `镜像「${marker}」`, exact: true }).click();

  const card = page.locator('[data-mirror-block]').first();
  await expect(card).toBeVisible();
  await expect(card.locator('.mirror-block-body')).toHaveText(marker);

  // Read-only: the mirrored text is not part of this document’s editable content.
  await expect(page.locator('[contenteditable="true"] > p', { hasText: marker })).toHaveCount(0);

  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });
  await page.reload();
  await expect(page.locator('[data-mirror-block] .mirror-block-body')).toHaveText(marker, {
    timeout: 20_000,
  });
});

test('publishing a document serves it at a custom /p address', async ({ page, browser }) => {
  test.setTimeout(180_000);
  await signIn(page);
  const title = `公开文档 ${Date.now()}`;
  const marker = `公开页内容 ${Date.now()}`;
  const slug = `e2e-public-${Date.now()}`;

  const editor = await newDocument(page);
  await page.locator('input[placeholder="页面标题"]').fill(title);
  await editor.click();
  await page.keyboard.type(marker, { delay: 8 });
  // The public page reads Document.content, which the editor writes on a debounce;
  // save now so the published body is the one we just typed.
  await page.keyboard.press('Control+s');
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  // G931: 入口按钮的可见文本是「共享」，没有 aria-label。
  await page.getByRole('button', { name: '共享' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('switch', { name: '发布为公开页面' }).click();
  await expect(dialog.getByLabel('自定义地址')).toBeVisible();

  // App-owned paths must stay reachable, so a reserved address is refused outright.
  await dialog.getByLabel('自定义地址').fill('login');
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog.getByText('该地址已被系统占用')).toBeVisible();

  await dialog.getByLabel('自定义地址').fill(slug);
  await dialog.getByRole('button', { name: '保存' }).click();
  await expect(dialog.getByText(`/p/${slug}`)).toBeVisible();

  const docUrl = page.url();

  // 访客视角用另一个 context：元数据是服务端渲染的，只能重新导航去读；而开关的写入走本地镜像、
  // 异步 flush，导航**正在操作的那一页**会把这趟 flush 打断。让操作页留在文档上，轮询访客页。
  const visitor = await browser.newContext();
  const view = await visitor.newPage();

  // 发布开关与地址保存同样是异步 flush ⇒ 首次访客读也轮询，直到服务端真放行。
  await expect(async () => {
    await view.goto(`/p/${slug}`);
    expect(await view.getByText(marker).count()).toBe(1);
  }).toPass({ timeout: 60_000, intervals: [2_000] });
  await expect(view).toHaveTitle(new RegExp(title));

  // G143：搜索引擎索引默认关 ⇒ 公开页只留可读标题并显式 noindex，不输出 canonical。
  await expect(view.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(view.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

  // 打开索引后 canonical 才出现。开关外观不是写入落库的证据 ⇒ 轮询访客页直到服务端真改了。
  await page.goto(docUrl);
  await page.getByRole('button', { name: '共享' }).first().click();
  await page.getByRole('dialog').getByRole('switch', { name: '启用搜索引擎索引' }).click();
  await expect(async () => {
    await view.goto(`/p/${slug}`);
    expect(await view.locator('link[rel="canonical"]').count()).toBe(1);
  }).toPass({ timeout: 60_000, intervals: [2_000] });
  await expect(view.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/p/${slug}$`));
  await expect(view.locator('meta[name="robots"]')).toHaveCount(0);

  await visitor.close();
});

test('sidebar tree items expose a right-click menu', async ({ page }) => {
  await signIn(page);
  const title = `右键菜单 ${Date.now()}`;
  const renamed = `${title} 改名`;

  await newDocument(page);
  await page.locator('input[placeholder="页面标题"]').fill(title);
  // The header debounces the title write, and a reload would abort it in flight.
  await page.waitForTimeout(1_500);
  await page.keyboard.press('Control+s');
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  const sidebar = page.locator('aside');
  // The tree refetches on navigation, not on a title write, so reload to pick the row up.
  await page.reload();
  const row = sidebar.getByText(title, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });

  const openMenu = async (label: string) => {
    await sidebar.getByText(label, { exact: true }).first().click({ button: 'right' });
    await expect(page.getByRole('menu')).toBeVisible();
  };

  await openMenu(title);
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: '新建子文档' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '创建副本' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '添加到收藏' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: '复制链接' })).toBeVisible();

  // The rename field auto-focuses, so drive it from the keyboard.
  await menu.getByRole('menuitem', { name: '重命名' }).click();
  await page.keyboard.press('Control+a');
  await page.keyboard.type(renamed);
  await page.keyboard.press('Enter');
  await expect(sidebar.getByText(renamed, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  const parentId = page.url();
  const parentSlug = parentId.split('/').pop();
  await openMenu(renamed);
  await page.getByRole('menu').getByRole('menuitem', { name: '新建子文档' }).click();
  // router.push settles after the click returns, so retry on the address instead of reading it once.
  await expect(page).toHaveURL(new RegExp(`/documents/(?!${parentSlug})[0-9a-f-]+`), {
    timeout: 20_000,
  });
  await expect(page.getByText('所有更改已保存')).toBeVisible({ timeout: 20_000 });

  // Deleting the document you are reading bounces back to the document list.
  await page.keyboard.press('Control+s');
  await page.getByRole('link', { name: '文档' }).first().click();
  await openMenu(renamed);
  await page.getByRole('menu').getByRole('menuitem', { name: /移至最近删除/ }).click();
  // G233 confirms before the sidebar deletes; the confirm button repeats the menu sentence.
  await page
    .getByRole('dialog')
    .getByRole('button', { name: `将"${renamed}"移至最近删除` })
    .click();
  await expect(sidebar.getByText(renamed, { exact: true })).toHaveCount(0);
});

test('an embedded whiteboard previews its content and zooms into a dialog', async ({ page }) => {
  await signIn(page);

  await newDocument(page);
  const documentUrl = page.url();

  await page.locator('[contenteditable="true"]').first().click();
  await page.keyboard.type('/白板', { delay: 40 });
  await page.getByRole('option', { name: /白板/ }).first().click();

  const embed = page.locator('[data-whiteboard-embed]').first();
  await expect(embed).toBeVisible({ timeout: 20_000 });
  await expect(embed.getByText('只读预览')).toBeVisible();
  await expect(embed.locator(".tl-container").first()).toBeVisible({ timeout: 30_000 });

  // Draw on the board itself, then let the sync server checkpoint the snapshot.
  await embed.getByRole('button', { name: '打开白板' }).click();
  await page.waitForURL(/\/whiteboards\/[0-9a-f-]+/);
  await page.waitForFunction(() => Boolean((window as any).__craftyBoard), null, { timeout: 25_000 });
  await page.evaluate(() => (window as any).__craftyAddNote(120, 40, 'embed-marker'));
  await page.waitForTimeout(2_000);

  await page.goto(documentUrl);
  const preview = page.locator('[data-whiteboard-embed]').first();
  // The checkpointed snapshot really renders: the shape added on the board page is
  // visible inside the read-only canvas.
  await expect(preview.locator('[data-shape-id]').first()).toBeVisible({ timeout: 30_000 });

  // G111: 全屏不是嵌入头里的按钮，而是块 ⋯ 菜单里的「全屏」（嵌入头只有 只读预览 ＋ 打开白板）。
  const editorBox = await page.locator('.ProseMirror').first().boundingBox();
  expect(editorBox).not.toBeNull();
  const embedBox = await preview.boundingBox();
  expect(embedBox).not.toBeNull();
  // 把手只在编辑器左槽 64px 内亮起，且指针必须落在这一块的高度上（与 drag-handle-menu.spec 同一手法）。
  const gutterX = Math.min(embedBox!.x + 8, editorBox!.x + 20);
  await page.mouse.move(gutterX, embedBox!.y + embedBox!.height / 2);
  const handle = page.locator('[data-drag-handle]').first();
  await expect(handle).toBeVisible();
  await handle.getByRole('button', { name: '区块操作' }).click();
  await page.getByRole('menuitem', { name: '全屏' }).click();
  await expect(page.getByRole('dialog').locator('[data-shape-id]').first()).toBeVisible({
    timeout: 30_000,
  });
});

// Regression guard for the lost-title bug. DocumentEditor hands EditorHeader an
// inline onTitleChange, and while that closure sat in the debounce effect's
// dependency list every unrelated parent re-render cancelled the timer and re-armed
// it at a full 500ms -- so the write could only leave once rendering stopped, and a
// navigation before that dropped it. Read from inside the page, 18 panel-tab clicks
// produced 19 schedules and 18 cancellations, with the write leaving 420ms after the
// storm ended; the fixed header leaves it ~550ms after typing, mid-storm.
//
// What this is NOT: the earlier note here blamed the metadata-sync cycles and the
// sidebar fan-out, because it measured POST latency against an absolute budget. That
// instrument is confounded -- the same build reads 533-1133ms against one dev server
// and 2295-2562ms under the three this config starts. Collapsing the sidebar reads
// into one batched action did not move the title write at all (0/6 cycles met the old
// 1200ms budget), so keep the assertion here about persistence, not milliseconds.
test('a typed title reaches the server while the editor keeps re-rendering', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);

  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);

  const marker = `标题落库 ${Date.now()}`;
  const sent: number[] = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && (req.postData() ?? '').includes(marker)) sent.push(Date.now());
  });

  const titleInput = page.locator('input[placeholder="页面标题"]');
  await titleInput.waitFor({ state: 'visible' });
  const typedAt = Date.now();
  await titleInput.fill(marker);

  // Keep the parent re-rendering and then leave, which is what a user actually does
  // to lose a title. A panel tab click lands in DocumentEditor's own state, so every
  // one hands EditorHeader a fresh inline onTitleChange; if the debounce restarts on
  // that, it can only fire once rendering stops, and navigating away aborts it.
  //
  // Asserting persistence rather than a millisecond budget is deliberate. The first
  // version here demanded the write leave within 1200ms, and the same build measured
  // 533-1133ms against a single dev server but 2295-2562ms under the three this config
  // starts -- so that number tracked CPU contention, not the product. Two follow-up
  // versions then passed against a deliberately broken header, because Playwright's
  // click() is a CDP round trip that took over 500ms each under load and handed the
  // starving debounce a quiet gap to fire in. Clicking from inside the page keeps the
  // real cadence whatever the machine is doing, and the count proves the churn ran.
  const churn = await page.evaluate(async () => {
    const labels = ['插入', '格式'];
    // Match the accessible name, not the text: at 1440px the rail renders these as
    // icon buttons named by aria-label, so a textContent comparison finds nothing
    // and the churn silently clicks nothing (which is how two earlier versions of
    // this test passed against a broken header).
    const name = (el: Element) =>
      (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? el.textContent ?? '').trim();
    const find = (label: string) =>
      Array.from(document.querySelectorAll('button')).find((b) => name(b) === label);
    let clicked = 0;
    let missing = 0;
    for (let i = 0; i < 20; i += 1) {
      const tab = find(labels[i % 2]);
      if (tab) {
        tab.click();
        clicked += 1;
      } else {
        missing += 1;
      }
      await new Promise((r) => setTimeout(r, 130));
    }
    return { clicked, missing, endedAt: Date.now() };
  });
  expect(
    churn.missing,
    'the panel tabs were absent from the DOM, so nothing re-rendered and the churn proved nothing',
  ).toBe(0);

  // Leave while a re-armed debounce still has its 500ms to run. Returning by URL
  // rather than by clicking the sidebar row keeps the assertion about persistence:
  // looking the row up by the new title would also time out merely because the tree
  // has not refreshed, which is a different question.
  const docUrl = page.url();
  await page.goto('/documents');
  const stormMs = churn.endedAt - typedAt;

  await page.goto(docUrl);
  const reopened = page.locator('input[placeholder="页面标题"]');
  await reopened.waitFor({ state: 'visible' });

  expect(
    await reopened.inputValue(),
    `the title never reached the server (${sent.length} write(s) sent during the storm, ` +
      `first ${sent.length ? Math.min(...sent) - typedAt : -1}ms after typing, ` +
      `${stormMs}ms of re-rendering before leaving)`,
  ).toBe(marker);
});
