import { chromium, expect, type Browser, type Page } from '@playwright/test';
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
  await page.getByText('所有更改已保存').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(500);
}

async function ensureDocument(browser: Browser, page: Page) {
  await page.goto('/documents');
  const existing = page.locator(`a:has-text("${FIXTURE.doc}")`).first();
  if (await existing.count()) {
    const href = (await existing.getAttribute('href'))!;
    // Seeded already — but "already" may only cover the metadata row. The body's
    // truth-source is the Yjs doc, and that write leaves over the collab socket on
    // its own schedule, so a run that closed the browser early can leave a titled,
    // empty document behind (that is exactly what the fixture was). Re-typing is
    // gated on a FRESH session reading no body, which is also what keeps this from
    // duplicating text the current client has merely not hydrated yet.
    if (!(await hasBodyOnServer(browser, href))) {
      await page.goto(href);
      await typeBody(browser, page);
    }
    return;
  }

  await page.getByRole('button', { name: /新建/ }).first().click();
  await page.waitForURL(/\/documents\//);
  await page.locator('input[placeholder="页面标题"]').fill(FIXTURE.doc);
  // The header debounces the title save by 500ms.
  await page.waitForTimeout(1_200);
  await typeBody(browser, page);
}

async function typeBody(browser: Browser, page: Page) {
  const body = page.locator('[contenteditable="true"]').first();
  await body.click();
  // `fill` writes the DOM directly and ProseMirror reconciles that as a bulk
  // mutation, which leaves thousands of empty paragraphs behind in the Yjs doc.
  await page.keyboard.type(FIXTURE.docBody, { delay: 12 });
  await expectSaved(page);
  const href = new URL(page.url()).pathname;
  await expectOnServer(browser, `the fixture body on ${href}`, (check) => hasBody(check, href));
}

function hasBody(page: Page, href: string) {
  return page
    .goto(href)
    .then(() => expect(page.locator('.ProseMirror').first()).toContainText(FIXTURE.docBody, { timeout: 10_000 }))
    .then(() => true)
    .catch(() => false);
}

const hasBodyOnServer = (browser: Browser, href: string) =>
  readOnServer(browser, (page) => hasBody(page, href));

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
  await expectOnServer(browser, `"${FIXTURE.board}" on /whiteboards`, async (check) => {
    await check.goto('/whiteboards');
    return (await check.locator(`a:has-text("${FIXTURE.board}")`).count()) > 0;
  });
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
async function readOnServer<T>(browser: Browser, read: (page: Page) => Promise<T>): Promise<T> {
  const context = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    if (!(await signIn(page))) throw new Error('visual seed: fresh session could not sign in');
    return await read(page);
  } finally {
    await context.close();
  }
}

async function expectOnServer(browser: Browser, what: string, read: (page: Page) => Promise<boolean>) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await readOnServer(browser, read)) return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  throw new Error(`visual seed: ${what} never reached the server`);
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

    await ensureDocument(browser, page);
    await ensureCollection(page);
    await ensureBoard(browser, page);

    await mkdir(path.dirname(STORAGE_STATE), { recursive: true });
    await page.context().storageState({ path: STORAGE_STATE });
  } finally {
    await browser.close();
  }
}
