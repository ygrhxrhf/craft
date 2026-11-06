/**
 * 斜杠菜单第二段普查（族拆批 2c 前置）：G1544/G1613 定案了第一段是 20 个分组入口，
 * 但 8 个纯分组头（文本样式/装饰/文字格式/日期和时间/插入片段/插入分隔符/动作/提醒我…/取消样式
 * 过滤后 0 项）的**子项集**从未采到——过滤通路对它们是空的，只有「箭头选中 → Enter」
 * 这条选择通路能打开第二段。本普查器逐项走选择通路并落日志。
 *
 * 沿用 slash-census（第 392 批）踩过的坑：
 *  1. 空文档没有正文块 ⇒ REST 建文档后先塞 SEED 文本块；
 *  2. `command-menu` 常驻、折叠时宽 0 ⇒ 在场判矩形尺寸；
 *  3. 每项之间重新点回 SEED 块（Escape 会把焦点送到 body）；
 *  4. 退出通路 DELETE /documents 用 `documentIds`。
 *
 * 跑法：ego-browser nodejs -e "await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/slash-stage2-census.mjs')"
 */
import { appendFileSync } from 'node:fs';

const DIR = 'C:/Users/zhanh/ego/craft-ilab-20261026';
const LOG = DIR + '/round-430-slashstage2.log';
const log = (m) => { appendFileSync(LOG, m + '\n'); console.log(m); };

const ITEMS = ['列表', '文本样式', '装饰', '颜色', '缩进', '对齐', '字体', '文字格式', '日期和时间', '插入文件',
  '插入片段', '插入表格', '插入分隔符', '动作', '提醒我…', '取消样式', '插入白板', '插入表格集合', '插入画廊集合', '插入看板集合'];
const BASE = 'https://connect.craft.do/links/11WSzp0AjQN/api/v1';
const TITLE = 'QODER-ILAB-slashstage2';

const task = await taskSpace('craft assets 20261023 r3');
const tabs = await task.tabs();
const off = tabs.find((t) => String(t.url).startsWith('https://docs.craft.do'));
if (!off) { console.log('NO-OFFICIAL-TAB'); process.exit(1); }
const p = off.label ? task.page(off.label) : await task.adopt(off.page);
await p.cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
await p.cdp('Page.bringToFront', {});

const post = async (path, body) => {
  const r = await p.fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), timeout: 25000 });
  return String(r.body);
};

try { await p.goto('https://docs.craft.do/', { waitUntil: 'load', timeout: 35000 }); } catch (e) {}
await p.waitForTimeout(2500);
let docId = null;
try { docId = JSON.parse(await post('/documents', { documents: [{ title: TITLE }] })).items[0].id; } catch (e) {}
if (!docId) { log('NO DOC'); process.exit(1); }
await post('/blocks', { type: 'text', markdown: 'SEED', position: { pageId: docId, position: 'end' } });
log('DOC ' + docId);
await p.waitForTimeout(1500);
try { await p.goto('https://docs.craft.do/', { waitUntil: 'load', timeout: 35000 }); } catch (e) {}
await p.waitForTimeout(4000);
const card = await p.evaluate((t) => {
  for (const a of document.querySelectorAll('a[href*="/editor/"]')) {
    if ((a.textContent || '').includes(t)) { const r = a.getBoundingClientRect(); return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }; }
  }
  return null;
}, TITLE);
if (card) { await p.mouse.click(card.x, card.y); await p.waitForTimeout(6500); }
for (let i = 0; i < 3; i++) { await p.evaluate(() => { const b = document.querySelector('[data-testid="open-in-app-popup-close"]'); if (b) b.click(); }); await p.waitForTimeout(400); }

const seedPoint = await p.evaluate(() => {
  const body = document.querySelector('[data-testid="editor-body"]');
  if (!body) return null;
  for (const e of body.querySelectorAll('[contenteditable="true"]')) {
    if ((e.innerText || '').trim() !== 'SEED') continue;
    const r = e.getBoundingClientRect();
    return { x: Math.round(r.x + 20), y: Math.round(r.y + r.height / 2) };
  }
  return null;
});
if (!seedPoint) { log('NO SEED'); process.exit(1); }

const menuInfo = () => p.evaluate(() => {
  const m = document.querySelector('[data-testid="command-menu"]');
  const b = m && m.getBoundingClientRect();
  const open = !!b && b.width > 40 && b.height > 40;
  const raw = m ? [...m.querySelectorAll('button,[role="menuitem"],[role="option"]')] : [];
  const items = raw.map((e) => ({
    text: (e.innerText || '').replace(/\s+/g, ' ').trim(),
    sel: e.getAttribute('aria-selected') === 'true' || e.getAttribute('data-state') === 'active' || /active|selected|highlight/i.test(e.className || ''),
    haspopup: e.getAttribute('aria-haspopup') || '',
    role: e.getAttribute('role') || '',
  })).filter((x) => x.text);
  return { open, n: items.length, items };
});

const after = () => p.evaluate(() => ({
  blocks: [...document.querySelectorAll('[data-testid="editor-body"] [contenteditable="true"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 40)),
}));

// 首段结构快照（20 项 + 每项的 aria/role 线索）
await p.mouse.click(seedPoint.x, seedPoint.y);
await p.waitForTimeout(700);
await p.keyboard.press('End');
await p.waitForTimeout(250);
await p.keyboard.press('Enter');
await p.waitForTimeout(700);
await p.keyboard.type('/', { delay: 85 });
await p.waitForTimeout(1300);
const stage1 = await menuInfo();
log('STAGE1 ' + JSON.stringify(stage1));
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
await p.keyboard.press('Control+z');
await p.waitForTimeout(600);

// 逐项：点 SEED → End → Enter → '/' → ArrowDown × i → Enter → 观测
for (let i = 0; i < ITEMS.length; i += 1) {
  const name = ITEMS[i];
  await p.mouse.click(seedPoint.x, seedPoint.y);
  await p.waitForTimeout(700);
  await p.keyboard.press('End');
  await p.waitForTimeout(250);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(700);
  await p.keyboard.type('/', { delay: 85 });
  await p.waitForTimeout(1200);
  const pre = await menuInfo();
  if (!pre.open) { log(`ITEM ${i} ${name} | NO-MENU`); continue; }
  for (let d = 0; d < i; d += 1) { await p.keyboard.press('ArrowDown'); await p.waitForTimeout(160); }
  await p.waitForTimeout(300);
  const highlighted = await menuInfo();
  const selIdx = highlighted.items.findIndex((x) => x.sel);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1600);
  const postState = await menuInfo();
  const doc = await after();
  const inserted = doc.blocks.filter((b) => b !== 'SEED' && b.trim() !== '');
  let outcome;
  if (postState.open && postState.n > 0 && JSON.stringify(postState.items.map((x) => x.text)) !== JSON.stringify(highlighted.items.map((x) => x.text))) {
    outcome = 'STAGE2 ' + JSON.stringify(postState.items.map((x) => x.text));
  } else if (postState.open && postState.n > 0) {
    outcome = 'SAME-MENU ' + postState.n;
  } else if (inserted.length > 0) {
    outcome = 'INSERTED ' + JSON.stringify(inserted);
  } else {
    outcome = 'NOOP';
  }
  log(`ITEM ${i} ${name} | selIdx=${selIdx} | ${outcome}`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(350);
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(700);
  const cleaned = await after();
  if (cleaned.blocks.some((b) => b !== 'SEED' && b.trim() !== '')) log(`  WARN dirty ${JSON.stringify(cleaned.blocks)}`);
}

const d = await p.fetch(BASE + '/documents', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ documentIds: [docId] }), timeout: 25000 });
log('CLEANUP ' + d.status);
