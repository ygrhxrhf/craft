import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

/** The account the visual matrix owns. No other spec signs in as it. */
export const VISUAL_USER = { email: 'craft-visual@example.com', password: 'visual-baseline-1' };

/** Entities the visual specs shoot; nothing else writes to them. */
export const FIXTURE = {
  doc: '视觉基线文档',
  docBody: '基线正文，用于像素回归。',
  collection: '视觉基线集合',
  board: '视觉基线白板',
};

/** Relative to the project root, which is also Playwright's working directory. */
export const STORAGE_STATE = path.resolve('e2e', '.visual-state.json');

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

/**
 * `next dev` compiles `/login` and `/documents` on first hit, and a cold start of
 * the three dev servers puts that compile inside the post-submit navigation window.
 * A 15s budget read that as "this account does not exist", so setup fell through to
 * `register()`, which then timed out against an email that is already taken — i.e.
 * the whole visual matrix died in setup for no product reason. This number is a
 * compile budget, not a login budget.
 */
const COLD_COMPILE = 90_000;

async function signIn(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', VISUAL_USER.email);
  await page.fill('input[type="password"]', VISUAL_USER.password);
  await page.click('button[type="submit"]');
  return page.waitForURL(/\/documents/, { timeout: COLD_COMPILE }).then(() => true).catch(() => false);
}

async function register(page: Page) {
  await page.goto('/register');
  await page.fill('#name', '视觉基线');
  await page.fill('#email', VISUAL_USER.email);
  await page.fill('#password', VISUAL_USER.password);
  await page.fill('#confirmPassword', VISUAL_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/documents|\/login/, { timeout: COLD_COMPILE });
}

/** The editor shows 已保存 once the autosave round-trip lands. */
async function expectSaved(page: Page) {
  await page.getByText('已保存').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(500);
}

async function ensureDocument(page: Page) {
  await page.goto('/documents');
  const existing = page.locator(`a:has-text("${FIXTURE.doc}")`).first();
  if (await existing.count()) {
    // Seeded already. Never touch the body again: the editor fills in from Yjs
    // asynchronously, so "does it contain the text?" can read empty and re-type.
    await page.goto((await existing.getAttribute('href'))!);
    return;
  }

  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(FIXTURE.doc);
  // The header debounces the title save by 500ms.
  await page.waitForTimeout(1_200);
  const body = page.locator('[contenteditable="true"]').first();
  await body.click();
  // `fill` writes the DOM directly and ProseMirror reconciles that as a bulk
  // mutation, which leaves thousands of empty paragraphs behind in the Yjs doc.
  await page.keyboard.type(FIXTURE.docBody, { delay: 12 });
  await expectSaved(page);
}

async function ensureCollection(page: Page) {
  await page.goto('/collections');
  const card = page.locator(`a:has-text("${FIXTURE.collection}")`).first();
  if (await card.count()) {
    await page.goto((await card.getAttribute('href'))!);
  } else {
    await page.getByRole('button', { name: /新建集合/ }).first().click();
    await page.fill('#name', FIXTURE.collection);
    await page.getByRole('button', { name: /^创建$/ }).click();
    await page.waitForURL(/\/collections\//);
  }

  // Desktop adds rows through the footer button; the aria-labelled one only exists
  // in the phone toolbar.
  const addRow = page.getByRole('main').getByRole('button', { name: '新建', exact: true });
  if (!(await page.getByRole('main').locator('tbody tr').count())) {
    await addRow.click();
    await page.waitForTimeout(1_500);
  }
}

async function ensureBoard(browser: Browser, page: Page) {
  await page.goto('/whiteboards');
  if (await page.locator(`a:has-text("${FIXTURE.board}")`).count()) return;

  await page.getByRole('button', { name: /新建白板/ }).click();
  await page.waitForURL(/\/whiteboards\//);
  await page.locator('input[aria-label="白板名称"]').fill(FIXTURE.board);
  await page.keyboard.press('Enter');
  await expectOnServer(browser, FIXTURE.board, '/whiteboards');
}

/**
 * `applyLocal` only queues; the kernel flushes on a 2s debounce and a timer that
 * has not fired when the browser closes dies with that context's IndexedDB. This
 * is how the setup came to leave 56 `未命名白板` rows behind: every run pressed
 * Enter, waited a fixed 1.5s, closed without the rename ever landing, so the next
 * run's fixture lookup missed again and created one more board.
 *
 * A fresh context is the only place that can tell "the app shows it" from "the
 * server has it": its mirror starts empty, so what it lists is server truth, not
 * the local pending overlay. Failing loudly here is the point — a seed that
 * silently no-ops turns the whole visual matrix into a diff against junk data.
 */
async function expectOnServer(browser: Browser, title: string, listPath: string) {
  const deadline = Date.now() + 40_000;
  let reason = 'never signed in';
  while (Date.now() < deadline) {
    const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
    try {
      const check = await context.newPage();
      check.setDefaultTimeout(30_000);
      if (await signIn(check)) {
        await check.goto(listPath);
        if (await check.locator(`a:has-text("${title}")`).count()) return;
        reason = `no "${title}" link on ${listPath}`;
      }
      await check.close();
    } finally {
      await context.close();
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`visual seed: "${title}" never reached the server (${reason})`);
}

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  page.setDefaultTimeout(30_000);

  try {
    if (!(await signIn(page))) {
      await register(page);
      if (!(await signIn(page))) throw new Error('visual seed: could not sign in');
    }

    await ensureDocument(page);
    await ensureCollection(page);
    await ensureBoard(browser, page);

    await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
