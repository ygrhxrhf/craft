import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

// The authenticated `/documents` render costs seconds on a warm dev server (the tree + editor
// compile and query together), so the default 20 s expect budget is a coin flip. Same reasoning
// as `COLD_COMPILE` in `e2e/global-setup.ts`: this is a compile/render budget, not a login budget.
const RENDER_BUDGET = 90_000;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/, { timeout: RENDER_BUDGET });
}

async function openFindOnNewDoc(page: Page) {
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  // Probe the editor, type a body that mixes case, then open the panel via the editor keymap.
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type('ABC abc Abc aBc', { delay: 4 });
  await page.keyboard.press('Control+f');
  return page.getByTestId('find-replace-panel');
}

/**
 * G1418 residual (a): the four options no longer sit flat on the bar — they live in the popup
 * opened by the header's 「选项」 button, exactly like the captured `frsidebar`. Every option
 * assertion has to unroll that list first.
 */
async function openOptions(page: Page) {
  await page.getByTestId('find-replace-options-trigger').click();
  await expect(page.getByTestId('find-replace-options')).toBeVisible();
}

/**
 * G1418 in-registry shape: `match.case` is its own toggle alongside mode and scope. Off by default
 * the panel's count is case-insensitive; flipping it pins the RegExp to no `i` flag and the count
 * changes accordingly. A single regression loop toggling once each direction would never catch a
 * wiring that forgot the flag, so the test toggles twice and asserts both states.
 */
test('the case-sensitive toggle narrows and widens the count as expected', async ({ page }) => {
  await signIn(page);
  const panel = await openFindOnNewDoc(page);
  await expect(panel).toBeVisible();

  await page.getByTestId('find-replace-query').fill('abc');
  // Off: the count must reflect every match across the mixed-case body — the four substrings
  // `ABC`, `abc`, `Abc`, `aBc` all contain `abc` case-insensitively.
  await expect(panel.getByTestId('find-replace-count')).toHaveText('4 结果 在页面上');
  await openOptions(page);
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'false');

  // On: the count drops to the lower-case 'abc' alone (4 → 1), the button flips to pressed.
  await page.getByTestId('find-replace-case').click();
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('1 个结果 在页面上');

  // Off again: every match returns and the count climbs back to 4.
  await page.getByTestId('find-replace-case').click();
  await expect(page.getByTestId('find-replace-case')).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('4 结果 在页面上');
});

/**
 * G1418's fourth option 「忽略变音符号（例如 ä = a）」, selected by default in the captured panel.
 * Typing accented body text and searching for the unaccented spelling must hit; switching the
 * option off must make the same query miss, which is what proves the toggle is wired to the
 * matcher rather than merely painted.
 */
test('the diacritics toggle folds accents on by default and stops folding when off', async ({ page }) => {
  await signIn(page);
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type('Café crème', { delay: 4 });
  await page.keyboard.press('Control+f');
  const panel = page.getByTestId('find-replace-panel');
  await expect(panel).toBeVisible();

  await page.getByTestId('find-replace-query').fill('cafe');
  await openOptions(page);
  // Default on: 「Café」 answers to the unaccented query.
  await expect(page.getByTestId('find-replace-diacritics')).toHaveAttribute('aria-pressed', 'true');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('1 个结果 在页面上');

  // Off: the same query no longer reaches the accented word.
  await page.getByTestId('find-replace-diacritics').click();
  await expect(page.getByTestId('find-replace-diacritics')).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.getByTestId('find-replace-count')).toHaveText('暂无结果');

  // On again: the hit returns.
  await page.getByTestId('find-replace-diacritics').click();
  await expect(panel.getByTestId('find-replace-count')).toHaveText('1 个结果 在页面上');
});

/**
 * G1570: the panel has two tiers. `Ctrl-F` opens it with the query field alone; `Ctrl-Shift-F`
 * unrolls the replacement row. The official reading is `findInput:1 / replaceInput:0` after `Ctrl-F`
 * and both fields after `Ctrl-Shift-F`, so the assertion is on the replacement row's presence.
 */
test('Ctrl-F opens find-only; Ctrl-Shift-F unrolls the replacement row', async ({ page }) => {
  await signIn(page);
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type('hello', { delay: 4 });

  await page.keyboard.press('Control+f');
  const panel = page.getByTestId('find-replace-panel');
  await expect(panel).toBeVisible();
  // Find-only tier: the query field is there, the replacement row is not.
  await expect(panel.getByTestId('find-replace-query')).toBeVisible();
  await expect(panel.getByTestId('find-replace-replacement-row')).toHaveCount(0);

  // Close, then open the replace tier. Focus has to be back in the editor for the editor keymap
  // to see the chord at all (Escape returns focus to the page, not necessarily the editable).
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await editor.click();
  await page.keyboard.press('Control+Shift+f');
  await expect(panel).toBeVisible();
  await expect(panel.getByTestId('find-replace-replacement-row')).toBeVisible();
});

/**
 * G1418 residual (b): 「完整文档」 must search the whole tree, not just the open page. A subpage is
 * its own `Document` row, so its text is never in the open ProseMirror doc — the count an
 * unchanged page-scope query reports is the proof that the scope switch does real work: same
 * query, same editor, only the scope differs, and the count plus the listed subpage row change.
 */
test('完整文档 reaches a subpage that 这一页 cannot see', async ({ page }) => {
  // Four page loads plus two debounced title writes and the collab mirror's own debounce, each
  // budgeted at RENDER_BUDGET — the suite default of 120 s cannot hold that many 90 s ceilings.
  test.setTimeout(300_000);
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(String(error)));

  await signIn(page);
  const stamp = Date.now();
  const parentTitle = `父页 ${stamp}`;
  const childTitle = `子页 ${stamp}`;
  const needle = 'Kx7';

  // Parent page: two hits.
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const parentUrl = page.url();
  await page.locator('input[placeholder="页面标题"]').fill(parentTitle);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(`alpha ${needle} beta ${needle}`, { delay: 4 });
  // The header debounces the title write by 500ms. No save chord exists
  // (`src/lib/editor/mod-k-dispatch.test.ts` pins its absence), and the 「所有更改已保存」
  // badge tracks metadata and derived-table writes, not the body — so the gate is the row
  // appearing in the tree. A reload here used to abort the title's queued push in flight,
  // which left the row as 无标题文档 and this wait with nothing to find.
  await page.waitForTimeout(1_500);
  const sidebar = page.locator('aside');
  const parentRow = sidebar.getByText(parentTitle, { exact: true }).first();
  await expect(parentRow).toBeVisible({ timeout: RENDER_BUDGET });

  // Subpage under it: three hits, nothing else.
  await parentRow.click({ button: 'right' });
  await expect(page.getByRole('menu')).toBeVisible();
  await page.getByRole('menu').getByRole('menuitem', { name: '新建子文档' }).click();
  await expect(page).toHaveURL(new RegExp(`/documents/(?!${parentUrl.split('/').pop()})[0-9a-f-]+`), {
    timeout: RENDER_BUDGET,
  });
  const childUrl = page.url();
  await page.locator('input[placeholder="页面标题"]').fill(childTitle);
  const childEditor = page.locator('[contenteditable="true"]').first();
  await childEditor.click();
  await page.keyboard.type(`${needle} ${needle} ${needle}`, { delay: 4 });
  // Same as the parent: the title write is debounced, and the body reaches the subpage read path
  // only after the collab mirror lands. Both are observed below by the panel's own re-poll.
  await page.waitForTimeout(1_500);

  // Back on the parent, the same query answers differently per scope. The body arrives over the
  // collab websocket after the route renders, so clicking into an empty editor would count zero:
  // wait for the restored text before opening the panel.
  await page.goto(parentUrl);
  const backEditor = page.locator('[contenteditable="true"]').first();
  await expect(backEditor).toContainText(needle, { timeout: RENDER_BUDGET });
  await backEditor.click();
  await page.keyboard.press('Control+f');
  const panel = page.getByTestId('find-replace-panel');
  await expect(panel).toBeVisible();

  // Dismiss any previous query focus, then search.
  await page.getByTestId('find-replace-query').fill(needle);
  await expect(panel.getByTestId('find-replace-count')).toHaveText('2 结果 在页面上');
  await expect(panel.getByTestId('find-replace-subpage-results')).toHaveCount(0);

  await openOptions(page);
  // Both halves of the subpage arrive on their own schedule: the body through the collab mirror
  // (debounced), the title through the local mirror's push queue (a navigation can leave the write
  // in flight, and the queue delivers it later). So the re-toggle re-runs `getSubpageStats` and
  // both facts are asserted inside the same poll rather than once after it.
  await expect(async () => {
    await page.getByTestId('find-replace-scope-page').click();
    await page.getByTestId('find-replace-scope-doc').click();
    // 2 on the open page + 3 in the subpage, and the reason must say 在文档中.
    await expect(panel.getByTestId('find-replace-count')).toHaveText('5 结果 在文档中');
    const hitRows = panel.getByTestId('find-replace-subpage-hit');
    await expect(hitRows).toHaveCount(1);
    await expect(hitRows.first().getByText(childTitle, { exact: true })).toBeVisible();
    await expect(hitRows.first().getByText('3', { exact: true })).toBeVisible();
  }).toPass({ timeout: RENDER_BUDGET, intervals: [1_500] });
  const hitRows = panel.getByTestId('find-replace-subpage-hit');

  // The options list floats over the panel and stays open while several rows are flipped, so it
  // covers the hit list until dismissed. Escape is the panel's own close path for it.
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('find-replace-options')).toHaveCount(0);

  // The row is an entry, not a note: pressing it opens that page.
  await hitRows.first().click();
  await expect(page).toHaveURL(childUrl, { timeout: RENDER_BUDGET });

  expect(consoleErrors.filter((line) => !line.includes('favicon'))).toEqual([]);
});

/**
 * G1418 residual (c): the official regex bit (`isRegexp`) persists, and the three other options
 * live in the same row. Flipping two of them and reloading must come back with those two still on,
 * which is what proves the row is written through to storage and re-read at startup rather than
 * being reset to the defaults every time the editor mounts.
 */
test('the option row survives a page reload', async ({ page }) => {
  await signIn(page);
  await page.goto('/documents');
  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.press('Control+f');
  const panel = page.getByTestId('find-replace-panel');
  await expect(panel).toBeVisible();

  // Move off the defaults: 文本 → 正则, 在页面上 → 在文档中, and turn the diacritics fold off.
  await openOptions(page);
  await page.getByTestId('find-replace-mode-regex').click();
  await page.getByTestId('find-replace-scope-doc').click();
  await page.getByTestId('find-replace-diacritics').click();
  await expect(page.getByTestId('find-replace-mode-regex')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('find-replace-scope-doc')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('find-replace-diacritics')).toHaveAttribute('aria-pressed', 'false');

  await page.reload();
  const reloaded = page.locator('[contenteditable="true"]').first();
  await reloaded.click();
  await page.keyboard.press('Control+f');
  await expect(page.getByTestId('find-replace-panel')).toBeVisible();
  await openOptions(page);
  await expect(page.getByTestId('find-replace-mode-regex')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('find-replace-scope-doc')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('find-replace-diacritics')).toHaveAttribute('aria-pressed', 'false');
});
