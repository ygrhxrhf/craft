/**
 * 斜杠菜单逐项普查（第 392 批）：把 `/` 菜单 20 个名字逐个打进去看回什么。
 *
 * 为什么要这个脚本而不是一个 spec：每个名字都是一个独立观测点（20×2 步），
 * 写成 spec 会让矩阵里多出 20 个几乎同形的块；而这次要回答的问题只有一个——
 * **这 20 个名字是可插入项还是分组入口**。所以留一个可复跑的一次性普查器。
 *
 * 三个必须记住的坑（都在这份脚本里修掉了）：
 *  1. 只建空文档时正文块还不存在 ⇒ 打 `/` 会落进**标题**（得先用 REST 塞一个 SEED 文本块）；
 *  2. `command-menu` 节点是**常驻**的，折叠时宽 0 ⇒ 判在场必须用 getBoundingClientRect，不能判存在；
 *  3. 每项之间要**重新点回 SEED 块**再 Enter（Escape 后光标已经不在那个块里了）。
 *
 * 跑法：`ego-browser nodejs -e "await import('file:///…/slash-census.mjs')"`
 */
import { appendFileSync } from 'node:fs';
const DIR = 'C:/Users/zhanh/ego/craft-ilab-20261026';
const LOG = DIR + '/round-364-slashitems5.log';
const log = (m) => { appendFileSync(LOG, m + '\n'); console.log(m); };
const ITEMS = ['列表', '文本样式', '装饰', '颜色', '缩进', '对齐', '字体', '文字格式', '日期和时间', '插入文件',
  '插入片段', '插入表格', '插入分隔符', '动作', '提醒我…', '取消样式', '插入白板', '插入表格集合', '插入画廊集合', '插入看板集合'];
const BASE = 'https://connect.craft.do/links/11WSzp0AjQN/api/v1';
const TITLE = 'QODER-ILAB-slashitems5';
const task = await taskSpace('craft assets 20261023 r3');
const tabs = await task.tabs();
const off = tabs.find((t) => String(t.url).startsWith('https://docs.craft.do'));
const p = task.page(off.label);
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
  const items = m ? [...m.querySelectorAll('button,[role="menuitem"],[role="option"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean) : [];
  return { open, n: open ? items.length : 0, items: open ? items.slice(0, 8) : [] };
});
const after = () => p.evaluate(() => ({
  bd: document.querySelectorAll('[data-testid="popup-backdrop"]').length,
  dlg: [...document.querySelectorAll('[role="dialog"]')].map((d) => (d.innerText || '').replace(/\s+/g, ' ').slice(0, 70)),
  blocks: [...document.querySelectorAll('[data-testid="editor-body"] [contenteditable="true"]')].map((e) => (e.innerText || '').replace(/\s+/g, ' ').slice(0, 18)),
}));

// 每项独立：点 SEED → End → Enter（新块）→ '/' → 过滤 → Enter → 观测 → Escape → Ctrl+Z
for (const name of ITEMS) {
  await p.mouse.click(seedPoint.x, seedPoint.y);
  await p.waitForTimeout(700);
  await p.keyboard.press('End');
  await p.waitForTimeout(250);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(700);
  await p.keyboard.type('/', { delay: 85 });
  await p.waitForTimeout(1200);
  const pre = await menuInfo();
  if (!pre.open) { log(`ITEM ${name} | NO-MENU`); continue; }
  await p.keyboard.type(name, { delay: 55 });
  await p.waitForTimeout(1150);
  const filtered = await menuInfo();
  await p.keyboard.press('Enter');
  await p.waitForTimeout(1800);
  const post = await after();
  log(`ITEM ${name} | filtered=${filtered.n} ${JSON.stringify(filtered.items.slice(0, 4))} | post ${JSON.stringify({ bd: post.bd, dlg: post.dlg, blocks: post.blocks.slice(-2) })}`);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(350);
  await p.keyboard.press('Control+z');
  await p.waitForTimeout(700);
}
const d = await p.fetch(BASE + '/documents', { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ documentIds: [docId] }), timeout: 25000 });
log('CLEANUP ' + d.status);
