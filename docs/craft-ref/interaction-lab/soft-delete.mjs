/**
 * 交互实验台 · 软删通路（Wave 0）
 *
 * 硬规则 1 的收尾：临时文档采完必须软删。
 * 本文件只放**页面侧**定位函数（交给 `page.evaluate`，不能引用宿主变量）
 * 与**宿主侧**编排（由 lab.mjs 调用）。
 *
 * 两条通路都是本轮实测出来的，不是推断：
 *  - 官方：浏览列表 → 右键该卡片 → 菜单「删除」→ 确认框危险按钮「删除」
 *    ⇒ 卡片从列表消失（进「最近删除」，30 天内可恢复）。见 runs/ 的 official 记录。
 *  - 本地：侧栏树行右键 → 「移至"最近删除"」→ confirmDialog 确认。
 *
 * ★ 踩过的坑：确认框的按钮与上下文菜单项**文本相同**（都是"删除"），
 *   取"最后一个匹配"会点到菜单项、确认框留在原地。
 *   判别按 class（官方 `FilledDanger`、本地 `destructive`），不是按文本。
 */

// ───────────────────────── 页面侧 ─────────────────────────

/** 浏览列表里 `data-item-id` 命中的卡片中心（官方口径）。 */
export function findBrowseCard(arg) {
  const n = document.querySelector('[data-item-id="' + arg.id + '"]');
  if (!n) return null;
  const r = n.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
}

/**
 * 菜单里文本命中 `label` 的项中心。
 * `match: 'exact'`（默认）＝整条相等；`match: 'prefix'`＝以 label 开头。
 * 前缀档是为本地删除项准备的：它的文案是 `将"<标题>"移至最近删除`，标题是动态的。
 * 容器也放宽：官方是 `[role="menu"]`，本地 base-ui 是 `[data-slot="context-menu-content"]`。
 */
export function findMenuItem(arg) {
  // ★ 可选邻近校验（`arg.cx`/`arg.cy`）：官方页面上可能同时挂着**陈旧菜单**，
  //   实测把"删除"项定位到 x=86/95（与卡片相距 300+ px）⇒ 点错地方。给了锚点就要求落在 500px 内。
  const containers = [
    ...Array.from(document.querySelectorAll('[role="menu"]')),
    ...Array.from(document.querySelectorAll('[data-slot="context-menu-content"]')),
  ];
  const textOf = (b) => (b.innerText || '').replace(/\s+/g, ' ').trim();
  for (const menu of containers) {
    const items = Array.from(menu.querySelectorAll('button,[role="menuitem"]'));
    const hit =
      arg.match === 'prefix'
        ? items.find((b) => textOf(b).startsWith(arg.label))
        : items.find((b) => textOf(b) === arg.label);
    if (!hit) continue;
    const r = hit.getBoundingClientRect();
    const x = Math.round(r.x + r.width / 2);
    const y = Math.round(r.y + r.height / 2);
    if (typeof arg.cx === 'number' && Math.abs(x - arg.cx) > 500) continue;
    return { x, y, text: textOf(hit).slice(0, 60) };
  }
  return null;
}

/** 诊断：把菜单里所有项的文案列出来（匹配失败时用）。 */
export function dumpMenuItems() {
  const menu =
    document.querySelector('[role="menu"]') ||
    document.querySelector('[data-slot="context-menu-content"]');
  if (!menu) return { found: false, items: [] };
  return {
    found: true,
    items: Array.from(menu.querySelectorAll('button,[role="menuitem"]')).map((b) => (b.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean),
  };
}

/** 确认框里的危险按钮中心（按 class 判别，不按文本）。 */
export function findDangerButton(arg) {
  // ★ 本批（第 300 批续批）实测到的仪器缺陷：官方把**上下文菜单项**也画成了
  //   `_variantDanger_1j891_187` ⇒ 只按 class 过滤会**同时命中菜单项与确认框**，
  //   而 `hits[0]` 取 DOM 序在前的那个＝菜单项 ⇒ 点了个寂寞（`card-gone=false`，实测 5 张里失败 2 张）。
  //   判别改为：**排除菜单容器内的按钮**（菜单项永远在 `[role="menu"]` / `[data-slot="context-menu-content"]` 里）。
  const hits = Array.from(document.querySelectorAll('button')).filter(
    (b) =>
      (b.innerText || '').trim() === arg.label &&
      /FilledDanger|variantDanger|destructive/i.test(b.className) &&
      !b.closest('[role="menu"],[data-slot="context-menu-content"]'),
  );
  if (!hits.length) return null;
  const el = hits[0];
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), cls: el.className.slice(0, 80) };
}

/**
 * 侧栏树里某文档行的中心（本地口径）。
 *
 * ★ 坑：临时文档的标题是**空串**（QODER-ILAB 文档从不改名）⇒ 按标题找永远找不到。
 *   优先按 id 精确命中 `a[href="/documents/<id>"]`；只有拿不到 id 时才退回标题匹配。
 */
export function findTreeRow(arg) {
  const textOf = (n) => (n.innerText || '').replace(/\s+/g, ' ').trim();
  // ① 本地侧栏树行 = <aside> 里的 <button>，**无 id 属性** ⇒ 按唯一标题定位
  const aside = document.querySelector('aside');
  if (aside && arg.title) {
    const btns = Array.from(aside.querySelectorAll('button')).filter((b) => textOf(b) === arg.title);
    if (btns.length === 1) {
      const r = btns[0].getBoundingClientRect();
      return { x: Math.round(r.x + Math.min(60, r.width / 3)), y: Math.round(r.y + r.height / 2), via: 'sidebar-button' };
    }
    if (btns.length > 1) return { ambiguous: btns.length };
  }
  // ② 兜底：列表页卡片是 <a href="/documents/<id>">
  const rows = Array.from(document.querySelectorAll('a[href^="/documents/"]'));
  let hit = arg.id ? rows.find((a) => a.getAttribute('href') === '/documents/' + arg.id) : null;
  if (!hit && arg.title) hit = rows.find((a) => textOf(a).includes(arg.title));
  if (!hit) return null;
  const r = hit.getBoundingClientRect();
  return { x: Math.round(r.x + Math.min(60, r.width / 3)), y: Math.round(r.y + r.height / 2), via: 'list-anchor', href: hit.getAttribute('href') };
}

/** 本地命令式弹层（DialogHost）的提交按钮中心：`[data-testid="imperative-dialog"]` 内最后一枚 button。 */
export function findDialogSubmit() {
  const dlg = document.querySelector('[data-testid="imperative-dialog"]');
  if (!dlg) return null;
  const btns = Array.from(dlg.querySelectorAll('button')).filter((b) => (b.innerText || '').trim());
  if (!btns.length) return null;
  const el = btns[btns.length - 1];
  const r = el.getBoundingClientRect();
  return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), label: (el.innerText || '').trim(), cls: String(el.className).slice(0, 80) };
}

/** 侧栏树里某文档行是否还在（本地软删的判据）。无标题时退回按 id 找列表卡片。 */
export function treeRowGone(arg) {
  const textOf = (n) => (n.innerText || '').replace(/\s+/g, ' ').trim();
  const aside = document.querySelector('aside');
  if (aside && arg.title) {
    const still = Array.from(aside.querySelectorAll('button')).some((b) => textOf(b) === arg.title);
    return !still;
  }
  return !document.querySelector('a[href="/documents/' + arg.id + '"]');
}

/** 浏览列表里某卡片是否还在（官方软删的判据）。 */
export function browseCardGone(arg) {
  return !document.querySelector('[data-item-id="' + arg.id + '"]');
}

// ───────────────────────── 宿主侧 ─────────────────────────

/** 官方软删。返回是否真的消失。 */
export async function softDeleteOfficial(target, doc, log) {
  const p = target.page;
  const listUrl = target.baseUrl + (target.name === 'official' ? '/' : doc.listPath || '/documents');
  // ★ 与 lab.mjs 同一仪器缺陷：官方侧 `waitUntil: 'load'` 会超时（文档已提交、readyState 停在
  //   `interactive`）⇒ 旧写法抛错 ⇒ 软删失败 ⇒ 临时文档残留。只吞"导航已提交的超时"。
  try {
    await p.goto(listUrl, { waitUntil: 'load', timeout: 15000 });
  } catch (e) {
    const msg = String((e && e.message) || e);
    const committed = /navigation committed/i.test(msg) || /PageNavigationTimeoutError/i.test(msg);
    const ready = await p.evaluate(() => document.readyState);
    if (!committed || ready === 'loading') throw e;
    log('softDelete goto TIMEOUT-TOLERATED readyState=' + ready + ' ' + listUrl);
  }
  await p.waitForTimeout(2200);
  const card = await p.evaluate(findBrowseCard, { id: doc.id });
  if (!card) {
    log('softDeleteOfficial: 列表里找不到卡片 id=' + doc.id);
    return false;
  }
  await p.mouse.click(card.x, card.y, { button: 'right', label: 'right-click temp doc' });
  // ★ 本批实测两坑，合成一条稳妥写法：
  //   ① 菜单**带动画**：等太短（旧版 900ms）时坐标仍在移动 ⇒ 点到空处 ⇒ 菜单不关、确认框不出现；
  //   ② 但**不能**用"坐标稳定"当判据 —— 实测会命中一个**陈旧菜单**（菜单项落在 x=86/95，
  //      与卡片相距 300+ px），于是点了个别的东西、确认框永不出现（3 张里失败 3 张）。
  //   ⇒ 等固定 1500ms（已验证足够），并要求菜单项**就在卡片附近**（|dx| ≤ 500）。
  await p.waitForTimeout(1500);
  const del = await p.evaluate(findMenuItem, { label: '删除', cx: card.x, cy: card.y });
  if (!del) {
    log('softDeleteOfficial: 菜单里没有「删除」（或不在卡片附近）');
    return false;
  }
  log('softDeleteOfficial: 菜单项 ' + del.x + ',' + del.y + ' (dx=' + (del.x - card.x) + ')');
  await p.mouse.click(del.x, del.y, { label: 'delete temp doc' });
  // ★ 确认框是**异步**挂载的（实测：点菜单项后 1.6s 才稳定出现危险按钮，1300ms 时偶发还没有
  //   ⇒ 旧版直接判失败）。改为**轮询等待**，最多 8 次 × 600ms。
  let conf = null;
  for (let i = 0; i < 8 && !conf; i++) {
    await p.waitForTimeout(600);
    conf = await p.evaluate(findDangerButton, { label: '删除' });
  }
  if (!conf) {
    log('softDeleteOfficial: 找不到确认框的危险按钮（轮询 8×600ms 后仍无）');
    return false;
  }
  await p.mouse.click(conf.x, conf.y, { label: 'confirm delete temp doc' });
  await p.waitForTimeout(2400);
  const gone = await p.evaluate(browseCardGone, { id: doc.id });
  log('softDeleteOfficial: card-gone=' + gone + ' confirmCls=' + conf.cls);
  return gone;
}

/** 本地软删。返回是否真的消失。 */
export async function softDeleteLocal(target, doc, log) {
  const p = target.page;
  const listUrl = target.baseUrl + (target.name === 'official' ? '/' : doc.listPath || '/documents');
  // ★ 与 lab.mjs 同一仪器缺陷：官方侧 `waitUntil: 'load'` 会超时（文档已提交、readyState 停在
  //   `interactive`）⇒ 旧写法抛错 ⇒ 软删失败 ⇒ 临时文档残留。只吞"导航已提交的超时"。
  try {
    await p.goto(listUrl, { waitUntil: 'load', timeout: 15000 });
  } catch (e) {
    const msg = String((e && e.message) || e);
    const committed = /navigation committed/i.test(msg) || /PageNavigationTimeoutError/i.test(msg);
    const ready = await p.evaluate(() => document.readyState);
    if (!committed || ready === 'loading') throw e;
    log('softDelete goto TIMEOUT-TOLERATED readyState=' + ready + ' ' + listUrl);
  }
  await p.waitForTimeout(2200);
  const title = doc.name || doc.title;
  const row = await p.evaluate(findTreeRow, { id: doc.id, title });
  if (!row) {
    log('softDeleteLocal: 侧栏找不到行 id=' + doc.id + ' title=「' + title + '」');
    return false;
  }
  log('softDeleteLocal: 命中行 ' + row.href);
  await p.mouse.click(row.x, row.y, { button: 'right', label: 'right-click temp doc' });
  await p.waitForTimeout(1000);
  // ★ 本地删除项文案是 `将"<标题>"移至最近删除`（标题动态）⇒ 只能前缀匹配
  const item = await p.evaluate(findMenuItem, { label: '将"', match: 'prefix' });
  if (!item) {
    const dump = await p.evaluate(dumpMenuItems, {});
    log('softDeleteLocal: 菜单里没有「将"…"移至最近删除」；菜单实际项=' + JSON.stringify(dump.items));
    return false;
  }
  log('softDeleteLocal: 命中菜单项「' + item.text + '」');
  await p.mouse.click(item.x, item.y, { label: 'move to trash' });
  await p.waitForTimeout(1300);
  // ★ 本地确认框（DialogHost）的提交按钮**没有** destructive class（是默认 variant），
  //   所以不能按 class 判；按 data-testid="imperative-dialog" 里的**最后一枚按钮**取。
  const conf = await p.evaluate(findDialogSubmit, {});
  if (!conf) {
    log('softDeleteLocal: 找不到确认框的提交按钮');
    return false;
  }
  await p.mouse.click(conf.x, conf.y, { label: 'confirm move to trash' });
  await p.waitForTimeout(2000);
  const gone = await p.evaluate(treeRowGone, { id: doc.id, title: doc.title });
  log('softDeleteLocal: row-gone=' + gone + ' confirmLabel=' + conf.label + ' confirmCls=' + conf.cls);
  return gone;
}