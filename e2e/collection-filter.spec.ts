import { expect, test, type Page } from '@playwright/test';

const email = 'craft-test@example.com';
const password = 'test1234';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/documents/);
}

/**
 * Build a fresh collection instead of hunting the shared fixture: the account now holds dozens of
 * 「实验集合 <timestamp>」 cards, so the fixture is no longer on the first screen and a locator for
 * it would be asserting on list order. The create flow is the one `global-setup` already walks.
 * The new collection starts with the default `名称` text column, which is the column under test.
 */
async function createCollection(page: Page): Promise<void> {
  await page.goto('/collections');
  await page.getByRole('button', { name: /新建集合/ }).first().click();
  await page.fill('#name', `筛选测试 ${Date.now()}`);
  await page.getByRole('button', { name: /^创建$/ }).click();
  await page.waitForURL(/\/collections\//);
  const main = page.getByRole('main');
  await expect(main).toBeVisible();
  // The behaviour test counts rows before and after filtering, so the table needs one. The first
  // visit to a brand-new collection compiles the route (`Rendering…` in dev), and a single click
  // fired into that window was observed not to land — so ask, retry, and let the final wait be
  // the thing that fails if the table genuinely never gets a row.
  const rows = main.locator('tbody tr');
  const addRow = main.getByRole('button', { name: '新建', exact: true });
  await expect(addRow).toBeVisible({ timeout: 20_000 });
  for (let attempt = 0; attempt < 3 && !(await rows.count()); attempt++) {
    await addRow.click();
    try {
      await expect(rows.first()).toBeVisible({ timeout: 12_000 });
    } catch {
      // still empty — fall through and click again
    }
  }
  await expect(rows.first(), 'the new collection never got a row').toBeVisible({ timeout: 30_000 });
}

async function openFirstFilterRow(page: Page) {
  // The official name for this button is `collections.add.filter` =「添加筛选器」; the local build
  // used to say「添加筛选」, so this click doubles as the verbatim-copy assertion.
  await page.getByRole('button', { name: '添加筛选器' }).click();
  await page.getByRole('button', { name: '添加条件' }).click();
  return page.getByTestId('filter-row').first();
}

async function addProperty(page: Page, name: string, typeLabel: string) {
  await page.getByRole('button', { name: '属性', exact: true }).click();
  await page.getByLabel('属性名称').fill(name);
  // `getByRole('combobox').last()` picked the wrong select — the column was created as text and
  // the operator menu correctly kept showing the string tier, which read like a product bug.
  // G396: the type picker is a radiogroup of icon buttons, not a <select>.
  const typeGroup = page.getByLabel('属性类型');
  await typeGroup.getByRole('radio', { name: typeLabel }).click();
  // Assert before submitting: if the pick never took, the wrong tier reaching the menu
  // later would otherwise look like a permission-table bug.
  await expect(typeGroup.getByRole('radio', { name: typeLabel })).toBeChecked();
  await page.getByRole('button', { name: /^创建$|^添加$|^确定$/ }).first().click();
  await expect(page.getByLabel('属性名称')).toHaveCount(0);
}

/**
 * The operator menu is not free to hold whatever this build used to offer: protocol §9's `TKe`
 * table fixes the members *and* their printed labels per column type, and the number tier prints
 * literals (`= ≠ < ≤ > ≥`) instead of i18n words. Asserting the line values as well as the wording
 * is what makes a reshuffled menu fail rather than a reworded one pass — and switching the column
 * on a live row must re-check the stored operator against the new type's set.
 */
test('the operator menu is the official per-type set, labelled verbatim', async ({ page }) => {
  await signIn(page);
  await createCollection(page);

  const row = await openFirstFilterRow(page);
  const propertySelect = row.locator('select').first();
  const operatorSelect = row.getByTestId('filter-operator');

  await expect(propertySelect).toHaveValue(/.+/);
  // `toHaveValues` only accepts a multiple select; a single-select menu's whole offer is read off
  // its options instead, which is also what the assertion is about — the set, not the selection.
  const menuValues = () =>
    operatorSelect.locator('option').evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
  expect(await menuValues()).toEqual([
    'string_contains',
    'string_doesNotContain',
    'isEmpty',
    'isNotEmpty',
    'equals',
    'doesNotEqual',
  ]);
  expect(await operatorSelect.locator('option').allTextContents()).toEqual([
    '包含',
    '不包含',
    '为空',
    '不为空',
    '是',
    '不是',
  ]);

  const numberName = `数字列 ${Date.now()}`;
  await addProperty(page, numberName, '数字');
  // `addProperty` finishes with `revalidatePath`, and that landing *after* this switch made
  // TableView's `useEffect([view])` re-read the persisted config and silently revert the row to
  // its old column — observed on screen, not inferred. Let the revalidation land first, then
  // re-check that the selection survived before reading the menu it is supposed to drive.
  await page.waitForTimeout(1_500);
  const numberValue = (await propertySelect.locator('option', { hasText: numberName }).getAttribute('value'))!;
  await propertySelect.selectOption({ value: numberValue });
  await page.waitForTimeout(800);
  await expect(propertySelect, 'the column switch was reverted').toHaveValue(numberValue);

  expect(await menuValues()).toEqual([
    'number_equal',
    'number_notEqual',
    'number_smaller',
    'number_smallerOrEqual',
    'number_greater',
    'number_greaterOrEqual',
    'isEmpty',
    'isNotEmpty',
  ]);
  expect(await operatorSelect.locator('option').allTextContents()).toEqual(['=', '≠', '<', '≤', '>', '≥', '为空', '不为空']);
});

/**
 * The behaviour the official evaluator pins down that an intuitive one gets wrong: a contains
 * against an empty cell answers false in both directions, so the row stays hidden, while the
 * emptiness operator — which takes no operand at all — brings it back and drops the value field.
 */
test('a contains never matches an empty cell; isEmpty takes no value and brings it back', async ({ page }) => {
  await signIn(page);
  await createCollection(page);

  const rows = page.getByRole('main').locator('tbody tr');
  // The row that `createCollection` asked for can land a beat after the helper returns (the retry
  // may have clicked twice into a still-compiling route), so take the baseline only once the
  // count has stopped moving — otherwise the closing assertion reads its own setup as a failure.
  let baseline = await rows.count();
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(700);
    const next = await rows.count();
    if (next === baseline) break;
    baseline = next;
  }

  const row = await openFirstFilterRow(page);
  const operatorSelect = row.getByTestId('filter-operator');
  await operatorSelect.selectOption('string_contains');
  await row.getByTestId('filter-value').fill('绝对不存在的文本');
  await expect(rows, 'a contains should not match an empty cell').toHaveCount(0, { timeout: 10_000 });

  await operatorSelect.selectOption('isEmpty');
  await expect(rows, 'isEmpty should match the empty cell again').toHaveCount(baseline, { timeout: 10_000 });
  await expect(row.getByTestId('filter-value')).toHaveCount(0);
});
