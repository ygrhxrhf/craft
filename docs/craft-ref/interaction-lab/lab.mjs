/**
 * 交互实验台 · runner（Wave 0）
 *
 * 同一份 spec 在两个靶子上各跑一遍：
 *   official = https://docs.craft.do（复用已登录会话）
 *   local    = http://localhost:3000
 *
 * 本文件是**库**（纯导出，无副作用）；入口是同目录的 `run.mjs`。
 *
 * 环境变量不继承（ego-browser 不传 `process.env`），所以参数写死在文件顶部：
 *   ILAB_ONLY      = 'spec-id'  只跑一条
 *   ILAB_TARGETS   = 'official' | 'local' | 'both'
 *   ILAB_TAG       = 本次 run 的目录标签
 * 改参数就改这几行，别去 shell 里传。
 */
import { mkdirSync, readdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { softDeleteOfficial, softDeleteLocal } from './soft-delete.mjs';
import { queryDocDb, closeDb } from './db-probe.mjs';
import {
  captureFingerprint,
  captureTextNodes,
  captureStateAttrs,
  captureComputed,
  captureSelection,
  captureBlocks,
  captureAttrs,
  captureHtml,
  captureAll,
  captureA11y,
  installKeyProbe,
  installAnimProbe,
  readAnims,
  resetAnims,
  measureTrailingPoint,
  evalExpect,
  normalizeText,
  diffTextNodes,
} from './observe.mjs';

// ───────────────────────── 可改参数 ─────────────────────────
const ILAB_ONLY = null;              // 例：'editor.key.enter-mid-block'
const ILAB_TARGETS = 'both';         // 'official' | 'local' | 'both'
const ILAB_TAG = null;               // 例：'smoke-01'
// ────────────────────────────────────────────────────────────

export const ILAB_PROGRESS = 'C:/Users/zhanh/ego/craft-ilab-20261023/progress.log';
export const RUNS = 'C:/code/craft/docs/craft-ref/interaction-lab/runs';
export const SPECS = 'C:/code/craft/docs/craft-ref/interaction-lab/specs';
export const TARGETS = {
  official: 'https://docs.craft.do',
  local: 'http://localhost:3000',
};
/** 本仓既有的稳定视口；视口覆盖**按会话失效**，每个脚本开头必须重设。 */
export const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false };
/** 复用任务空间（硬规则：一个目标只用一个 TaskSpace）。 */
export const TASK_SPACE = 'craft assets 20261023 r3';
/** 靶子 → 该靶子用的 Page label。两侧各持自己的 cookie。 */
export const PAGE_LABEL = { official: 'p1', local: 'p4' };

export function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function ensureRunsDir() {
  mkdirSync(RUNS, { recursive: true });
}

export async function loadSpecs(only) {
  const files = readdirSync(SPECS).filter((f) => f.endsWith('.mjs')).sort();
  const out = [];
  for (const f of files) {
    const mod = await import('file:///' + SPECS + '/' + f);
    const spec = mod.default ?? mod;
    if (spec && spec.id) out.push(spec);
  }
  // `only` 既可是单个 id 字符串，也可是 id 数组（只跑本波那几条，省时间）。
  if (!only) return out;
  const wanted = Array.isArray(only) ? only : [only];
  return out.filter((s) => wanted.includes(s.id));
}

// ───────────────────────── 页面侧（不能引用宿主变量） ─────────────────────────

function capturePrefProbe(arg) {
  const el = document.documentElement;
  const probe = { dataTheme: el.getAttribute('data-theme'), attrs: {}, localStorage: {} };
  for (const a of (arg && arg.attrs) || []) probe.attrs[a] = el.getAttribute(a);
  try {
    for (const k of (arg && arg.storageKeys) || []) probe.localStorage[k] = localStorage.getItem(k);
  } catch {
    probe.localStorage = null;
  }
  return probe;
}

function applyPref(arg) {
  const el = document.documentElement;
  const path = arg.path || '';
  if (path.startsWith('attr:')) el.setAttribute(path.slice(5), String(arg.value));
  else if (path.startsWith('storage:')) {
    const k = path.slice(8);
    if (arg.value == null) localStorage.removeItem(k);
    else localStorage.setItem(k, String(arg.value));
  }
  return true;
}

function restorePref(arg) {
  const el = document.documentElement;
  const b = arg.before || {};
  if (b.dataTheme != null) el.setAttribute('data-theme', b.dataTheme);
  for (const [k, v] of Object.entries(b.attrs || {})) {
    if (v == null) el.removeAttribute(k);
    else el.setAttribute(k, v);
  }
  for (const [k, v] of Object.entries(b.localStorage || {})) {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  }
  return true;
}

// ───────────────────────── 靶子 ─────────────────────────

/**
 * 一个靶子 = 一个 ego-browser Page + 一组"两侧选择器"的解析。
 * spec 里所有 selector 写成 `{ official, local }` 或字符串，由这里按 target 取。
 */
export class Target {
  constructor(page, name, baseUrl) {
    this.page = page;
    this.name = name;
    this.baseUrl = baseUrl;
  }

  sel(spec, key) {
    const s = (spec.selectors || {})[key];
    if (!s) return null;
    if (typeof s === 'string') return s;
    return s[this.name] ?? null;
  }

  async resetViewport() {
    await this.page.cdp('Emulation.setDeviceMetricsOverride', VIEWPORT);
  }

  /**
   * 取一次完整观测。`want` 决定采哪些面。
   *
   * ★ 原子性（Wave 0 自查发现）：除截图外，**所有面在同一次 `page.evaluate` 里取回**
   *   （`captureAll`）。旧版每面一次求值 ⇒ 两次调用之间页面还能继续渲染，
   *   会采到自相矛盾的记录（实测：`counts.插入=0` 而同份 `textNodes` 里有 4 条「插入…」）。
   *   截图单独走 CDP（它本来就是另一条通路，且字节数不参与判定）。
   */
  async observe(spec, want) {
    const set = new Set(want || []);
    const texts = (spec.observeTexts || []).slice();
    // ★ stateSelectors 保留 **key**（不塌成选择器串）：
    //   `expect` 里的 `state:<key>` 要按 key 查命中数，塌成串就查不到了（Wave 0 自查发现）。
    const stateSelectors = (spec.stateSelectors || [])
      .map((k) => ({ key: typeof k === 'string' ? k : k.key, selector: this.sel(spec, typeof k === 'string' ? k : k.selectorKey) }))
      .filter((x) => x.selector);
    const attrProbes = (spec.attrProbes || [])
      .map((p) => ({ key: p.key, selector: this.sel(spec, p.selector), attrs: p.attrs || ['placeholder'] }))
      .filter((p) => p.selector);
    const computedProbes = (spec.computedProbes || [])
      .map((p) => ({ key: p.key, selector: this.sel(spec, p.selector) }))
      .filter((p) => p.selector);

    const snap = await this.page.evaluate(captureAll, {
      texts,
      stateSelectors,
      attrProbes,
      blockRoot: this.sel(spec, 'blockRoot'),
      // ★ 目标名：两侧的行内标记载体不同（官方读 leaf 计算样式、本地读标签）
      //   ⇒ `inline` 档需知道自己在哪一侧，否则官方恒读成“没反应”。
      targetName: this.name,
      // 焦点宿主：两侧各自的编辑器容器选择器（官方 editor-body / 本地 .ProseMirror）
      focusHost: this.sel(spec, 'editorBody'),
    });

    // 焦点面**总是**带上**：它不占位、不参与截图，但是"键被浏览器接管、光标逃出编辑器"
    // 这一类差异的唯一判据（块名册在这种情形下不变）。若只在 `observe` 里选，漏选就会把
    // "光标跑了"读成"没反应"。
    const out = { fingerprint: snap.fingerprint, focus: snap.focus };
    if (set.has('dom') || set.has('text')) out.textNodes = snap.textNodes;
    if (set.has('state')) out.stateAttrs = snap.stateAttrs;
    if (set.has('selection')) out.selection = snap.selection;
    if (set.has('blocks')) out.blocks = snap.blocks;
    if (set.has('breaks')) out.breaks = snap.breaks;
    if (set.has('keys')) out.keys = snap.keys;
    if (set.has('inline')) out.inline = snap.inline;
    if (set.has('kinds')) out.kinds = snap.kinds;
    if (set.has('marquee')) out.marquee = snap.marquee;
    if (set.has('db')) {
      // 库面只在**本地**采：官方没有可查的库 ⇒ 它是本地侧的自证面，不进两侧对比。
      out.db = this.name === 'local' ? await queryDocDb(this.tempDocId) : { skipped: 'official has no queryable db' };
    }
    if (set.has('animation')) {
      // 事件式采集：动作期间真正发生过的动效（采样法会漏掉短动画，见 observe.mjs 的注释）。
      // ★ **累计**读、不清空：动画在哪一步结束取决于挂载时机，逐步清空会把同一批事件记到
      //   不同步上（首跑实测：官方入场动画一次落在第 1 步、另一次落在第 2 步）。
      //   differ 因此只比**末步**的累计清单（见 diff.mjs ⑨）。
      out.animation = await this.page.evaluate(readAnims);
      out.animation.cumulative = true;
    }
    if (set.has('a11y')) {
      // 可达性树**必须走宿主侧 CDP**（`Accessibility.getFullAXTree`），页内 JS 拿不到权威 AX 树。
      // 收口到编辑器子树：本地侧栏把每篇文档都画成按钮，不收口就只是在比谁文档多。
      out.a11y = await captureA11y(this.page, this.sel(spec, 'editorBody'));
    }
    if (set.has('attrs')) out.attrs = snap.attrs;
    if (set.has('html')) {
      const htmlProbes = (spec.htmlProbes || [])
        .map((p) => ({ key: p.key, selector: this.sel(spec, p.selector) }))
        .filter((p) => p.selector);
      out.html = await this.page.evaluate(captureHtml, { probes: htmlProbes, limit: spec.htmlLimit || 700 });
    }
    if (set.has('indent')) out.indent = snap.indent;
    if (set.has('computed')) {
      // 计算样式与 rect 是另一档（读 getComputedStyle + 布局），单独一次求值；它不参与判定。
      out.computed = await this.page.evaluate(captureComputed, { probes: computedProbes, props: spec.computedProps });
    }
    if (set.has('screenshot')) {
      const r = await this.page.cdp('Page.captureScreenshot', { format: 'png' });
      out.screenshotBytes = Buffer.from(r.data, 'base64').length;
    }
    return out;
  }
}

// ───────────────────────── 步骤执行 ─────────────────────────

async function runSetup(target, spec, ctx, log) {
  for (const s of spec.setup || []) {
    switch (s.op) {
      case 'navigate': {
        // 两侧路由前缀不同：官方空间路由是 /s/<space>/<tab>，没有 /documents。
        // 约定：spec 的 url 写"本地路径"，官方侧统一改写成空间根（产品自己重定向到 /all）。
        const path = s.url.startsWith('http') ? s.url : target.baseUrl + (target.name === 'official' ? '/' : s.url);
        // ★ Wave 1 修（仪器缺陷）：官方侧 `waitUntil: 'load'` 会**超时**（文档已提交、readyState 停在
        //   `interactive`：编辑器挂着长连接/WebSocket，`load` 不再触发）。旧写法直接抛错 ⇒
        //   record.errors 非空 ⇒ differ 判 `uncomparable`，**每一条官方 spec 都采不到**。
        //   ego-browser 的错误文案自己就给了正解：导航已提交 ⇒ 留在本页、按需再等 load。
        //   处置＝只吞"导航超时但文档已提交"这一种；其余错误照旧上抛。
        try {
          await target.page.goto(path, { waitUntil: 'load', timeout: s.gotoTimeoutMs ?? 15000 });
        } catch (e) {
          const msg = String((e && e.message) || e);
          const committed = /navigation committed/i.test(msg) || /PageNavigationTimeoutError/i.test(msg);
          const ready = await target.page.evaluate(() => document.readyState);
          if (!committed || ready === 'loading') throw e;
          log('setup navigate TIMEOUT-TOLERATED readyState=' + ready + ' ' + path);
        }
        await target.page.waitForTimeout(s.settleMs ?? 1200);
        log(`setup navigate ${path}`);
        break;
      }
      case 'seedTempDoc': {
        const created = await seedTempDoc(target, spec, s, log);
        // ★ 记到 Target 上：`observe` 只拿得到 spec，拿不到 ctx。
        target.tempDocId = created && created.id ? created.id : null;
        ctx.tempDoc = created;
        break;
      }
      case 'placeCaret': {
        const sel = target.sel(spec, s.selector || 'editor');
        await target.page.click(sel);
        await target.page.waitForTimeout(s.settleMs ?? 300);
        log(`setup placeCaret ${sel}`);
        break;
      }
      case 'placeCaretTrailing': {
        // 空文档里正文块还不存在（官方只渲染标题块），点标题下方空白处让正文块生成。
        const pt = await target.page.evaluate(measureTrailingPoint, {
          title: target.sel(spec, s.title || 'titleBlock'),
          blockRoot: target.sel(spec, s.blockRoot || 'blockRoot'),
        });
        if (!pt) throw new Error('placeCaretTrailing: 取不到落点');
        await target.page.mouse.click(pt.x, pt.y, { label: 'focus editor body' });
        await target.page.waitForTimeout(s.settleMs ?? 700);
        log('setup placeCaretTrailing mode=' + pt.mode + ' ' + pt.x + ',' + pt.y + ' blocks=' + pt.blockCount);
        break;
      }
      case 'openPanel': {
        const sel = target.sel(spec, s.selector);
        await target.page.click(sel);
        await target.page.waitForTimeout(s.settleMs ?? 500);
        log(`setup openPanel ${sel}`);
        break;
      }
      case 'setPreference': {
        const probe = s.probe || {};
        const before = await target.page.evaluate(capturePrefProbe, probe);
        ctx.preferences = ctx.preferences || [];
        ctx.preferences.push({ key: s.key, before, probe });
        await target.page.evaluate(applyPref, { path: s.path, value: s.value });
        await target.page.waitForTimeout(s.settleMs ?? 500);
        log(`setup setPreference ${s.key}`);
        break;
      }
      default:
        throw new Error('未知 setup op: ' + s.op);
    }
  }
}

async function runStep(target, spec, step, ctx, log) {
  const p = target.page;
  switch (step.op) {
    case 'key':
    case 'chord':
      await p.keyboard.press(step.chord);
      break;
    case 'type':
      // `insertText` 走的是**插入文本**通路（对 CJK 安全），但**不触发 markdown 输入规则**
      // —— 官方与本地都只在真按键的 `input` 事件上匹配 `- `／`# ` 这类前缀。
      await p.keyboard.insertText(step.text);
      break;
    case 'typeKeys':
      // 真按键（逐字符），markdown 输入规则才生效。ASCII 用这个，CJK 用 `type`。
      await p.keyboard.type(step.text, step.delay ? { delay: step.delay } : undefined);
      break;
    case 'paste':
      await p.keyboard.paste(step.text);
      break;
    case 'pasteHtml': {
      // 加性 op（第 337 批）：富文本粘贴。`keyboard.paste` 只能塞纯文本，而"粘贴 HTML 会不会保格式"
      // 恰恰是粘贴面的主干问题 ⇒ 用页内合成 `ClipboardEvent`，同时给 text/html 与 text/plain
      // （两侧编辑器都读 `clipboardData.getData(...)`）。
      await p.evaluate((arg) => {
        const host = document.querySelector(arg.host) || document.activeElement;
        if (!host) throw new Error('pasteHtml: 没有可粘贴的宿主');
        host.focus();
        const dt = new DataTransfer();
        dt.setData('text/html', arg.html);
        dt.setData('text/plain', arg.text);
        const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true });
        host.dispatchEvent(ev);
      }, { host: target.sel(spec, step.host || 'editorBody'), html: step.html, text: step.text || '' });
      break;
    }
    case 'deleteTempDoc': {
      // 加性 step：走**真实产品路径**删掉本次临时文档，让 db 档能断言"库里 isDeleted 翻了"。
      // 与 teardown 的 softDeleteTempDoc 同一实现，区别只是发生在步骤里、可被观测到。
      const doc = ctx.tempDoc;
      if (!doc || !doc.id) throw new Error('deleteTempDoc: 没有 tempDoc.id');
      const fn = target.name === 'official' ? softDeleteOfficial : softDeleteLocal;
      const okDel = await fn(target, { ...doc, title: doc.title || doc.name, listPath: doc.listPath || '/documents' }, log);
      log('step deleteTempDoc ok=' + okDel);
      ctx.deletedInStep = true;
      break;
    }
    case 'hover':
      // 加性 step：悬停是动效（transition）的主触发通路，没有它就只能靠 click，
      // 而 click 会顺带改变状态、把悬停动效和状态动效混在一起。
      await p.hover(target.sel(spec, step.selector), { label: step.label || 'hover' });
      break;
    case 'click': {
      await p.click(target.sel(spec, step.selector));
      break;
    }
    case 'clickRef':
      await p.click(step.ref);
      break;
    case 'clickText': {
      // 加性 op（第 335 批）：按**文案**点菜单项。CSS 选不了文本，而斜线菜单的项是运行时渲染的，
      // 官方又是二级菜单（`列表` → `折叠列表`）⇒ 只能按文案命中。
      // 只在这几个容器里找（避免点到正文里同名的词），且要求元素足够大（真正可点）。
      const hit = await p.evaluate((text) => {
        const roots = [...document.querySelectorAll('[data-testid="command-menu"],[role="listbox"],[role="menu"],[role="dialog"]')];
        const scope = roots.length ? roots : [document.body];
        const norm = (s) => (s || '').replace(/\s+/g, '');
        for (const r of scope) {
          for (const el of r.querySelectorAll('button,[role="option"],[role="menuitem"],li,div,span')) {
            if (el.children.length > 2) continue;
            if (norm(el.innerText) !== text) continue;
            const b = el.getBoundingClientRect();
            if (b.width < 8 || b.height < 8) continue;
            return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
          }
        }
        return null;
      }, step.text);
      if (!hit) throw new Error('clickText: 菜单里找不到「' + step.text + '」');
      await p.mouse.click(hit.x, hit.y, { label: 'clickText ' + step.text });
      break;
    }
    case 'clickXY':
      await p.mouse.click(step.x, step.y, step.label ? { label: step.label } : undefined);
      break;
    case 'dragHold':
      // ★ 加性（本批）：按住不放的拖拽。框选的矩形只在**按住期间**存在（松手即卸载）
      //   ⇒ 用 drag 一条原子做完就只能看到松手后的状态，矩形恒 null（实测）。
      //   拆成 dragHold → 观测 → dragEnd 三步，矩形才可观测。
      await p.mouse.move(step.from.x, step.from.y);
      await p.mouse.down();
      await p.mouse.move(step.to.x, step.to.y, { steps: step.steps ?? 12 });
      break;
    case 'dragEnd':
      await p.mouse.up();
      break;
    case 'drag':
      await p.mouse.move(step.from.x, step.from.y);
      await p.mouse.down();
      await p.mouse.move(step.to.x, step.to.y, { steps: step.steps ?? 12 });
      await p.mouse.up();
      break;
    case 'wait':
      await p.waitForTimeout(step.ms);
      break;
    default:
      throw new Error('未知 step op: ' + step.op);
  }
  if (step.settleMs) await p.waitForTimeout(step.settleMs);
  log(`step ${step.op}${step.chord ? ' ' + step.chord : ''}${step.text ? ' ' + JSON.stringify(step.text) : ''}`);
}

async function runTeardown(target, spec, ctx, log) {
  for (const t of spec.teardown || []) {
    if (t.op === 'restorePreference') {
      for (const rec of (ctx.preferences || []).slice().reverse()) {
        const after = await target.page.evaluate(capturePrefProbe, rec.probe);
        let same = JSON.stringify(after) === JSON.stringify(rec.before);
        log(`teardown restorePreference ${rec.key} restored=${same}`);
        if (!same) {
          await target.page.evaluate(restorePref, { before: rec.before });
          await target.page.reload({ waitUntil: 'load' });
          await target.page.waitForTimeout(1500);
          const again = await target.page.evaluate(capturePrefProbe, rec.probe);
          same = JSON.stringify(again) === JSON.stringify(rec.before);
          log(`teardown restorePreference ${rec.key} verified-after-reload=${same}`);
        }
      }
    } else if (t.op === 'softDeleteTempDoc') {
      if (ctx.deletedInStep) { log('teardown softDeleteTempDoc skip (已在步骤里删过)'); continue; }
      const ok = await softDeleteTempDoc(target, ctx, log);
      log(`teardown softDeleteTempDoc ok=${ok} doc=${ctx.tempDoc?.url || ''}`);
    } else if (t.op === 'key' || t.op === 'chord') {
      // 收尾按键（例：关掉面板）。放 teardown 而不是 steps —— steps 的**末步**是被判定的端点，
      // 而 Escape 关不关得掉"按弹层×屏而异"（interactions.md V3/V7b/V29），不该当判据。
      await target.page.keyboard.press(t.chord);
      await target.page.waitForTimeout(t.settleMs ?? 600);
      log('teardown key ' + t.chord);
    } else if (t.op === 'restoreCaret') {
      log('teardown restoreCaret (noop)');
    }
  }
}

// ───────────────────────── 临时文档 ─────────────────────────

/**
 * 建临时文档。**硬规则 1**：不在真实文档里做插入/输入。
 * 命名前缀 `QODER-ILAB-<specId>`；采完按「信息 → 移至最近删除」软删。
 */
async function seedTempDoc(target, spec, seed, log) {
  const p = target.page;
  const listUrl = target.baseUrl + (target.name === 'official' ? '/' : seed.listPath || '/documents');
  // ★ 与 `navigate` 同一仪器缺陷（本批第三次踩到，前两次在 `navigate` 与 `soft-delete.mjs`）：
  //   官方侧 `waitUntil: 'load'` **会超时**（文档已提交、readyState 停在 `interactive`）⇒ 抛错 ⇒
  //   `record.errors` 非空 ⇒ 该条 spec 判 `uncomparable`，且**新记录会覆盖掉上一份好记录**（实测踩到）。
  //   处置＝同一写法：只吞"导航已提交的超时"。
  try {
    await p.goto(listUrl, { waitUntil: 'load', timeout: 15000 });
  } catch (e) {
    const msg = String((e && e.message) || e);
    const committed = /navigation committed/i.test(msg) || /PageNavigationTimeoutError/i.test(msg);
    const ready = await p.evaluate(() => document.readyState);
    if (!committed || ready === 'loading') throw e;
    log('seedTempDoc goto TIMEOUT-TOLERATED readyState=' + ready + ' ' + listUrl);
  }
  await p.waitForTimeout(seed.settleMs ?? 1500);
  const sel = seed.clickRef || target.sel(spec, seed.selectorKey);
  if (!sel) throw new Error('seedTempDoc: selectorKey ' + seed.selectorKey + ' 解析不到选择器');
  await p.click(sel);
  await p.waitForTimeout(seed.afterCreateMs ?? 2500);
  const url = await p.url();
  // 两侧 URL 形状不同：本地 /documents/<id>，官方 /editor/d/<spaceId>/<docId>?s=<sig>。
  // ★ 坑：旧版只用 /documents/ 那条正则 ⇒ 官方恒 id=null ⇒ 官方软删从没真正跑过（Wave 0 自查发现）。
  const m =
    /\/editor\/d\/[^/]+\/([^/?#]+)/.exec(url) ||
    /\/documents\/([^/?#]+)/.exec(url);
  const id = m ? m[1] : null;

  // 给临时文档一个**唯一标题**：本地侧栏行与列表卡都是 <button>/<a>，只有标题能唯一定位
  // （无标题文档的占位文案「无标题文档」是多行共用的，定位不到具体那一行）。
  // 写入类操作只发生在临时文档内（硬规则 1）。
  if (seed.title) {
    const tsel = target.sel(spec, seed.titleKey || 'titleBlock');
    if (tsel) {
      try {
        await p.click(tsel);
        await p.waitForTimeout(250);
        await p.keyboard.press('Control+a');
        await p.keyboard.press('Delete');
        await p.keyboard.insertText(seed.title);
        await p.waitForTimeout(seed.afterTitleMs ?? 1200);
        log('seedTempDoc title -> ' + seed.title);
      } catch (e) {
        log('seedTempDoc title FAILED ' + String((e && e.message) || e).slice(0, 200));
      }
    }
  }
  log(`seedTempDoc url=${url} id=${id}`);
  return { name: seed.name, title: seed.title, url, id, listPath: seed.listPath || '/documents' };
}

async function softDeleteTempDoc(target, ctx, log) {
  const doc = ctx.tempDoc;
  if (!doc?.id) {
    log('softDeleteTempDoc: 没有 tempDoc.id，跳过');
    return false;
  }
  try {
    return target.name === 'official'
      ? await softDeleteOfficial(target, doc, log)
      : await softDeleteLocal(target, doc, log);
  } catch (e) {
    log('softDeleteTempDoc: ERROR ' + String((e && e.message) || e).slice(0, 300));
    return false;
  }
}
// ───────────────────────── 主流程 ─────────────────────────

export async function runOne(spec, targetName, page) {
  const target = new Target(page, targetName, TARGETS[targetName]);
  const logLines = [];
  // ★ 加性：同时写一份到磁盘。ego-browser 的 console.log 有时不回传，run 挂起时
  //   磁盘日志是唯一能定位卡在哪一步的通路（本批 wave1-17/18 两次挂起都因此查不动）。
  const log = (m) => {
    logLines.push(m);
    try { appendFileSync(ILAB_PROGRESS, targetName + ' ' + spec.id + ' ' + m + String.fromCharCode(10)); } catch {}
  };
  const record = {
    specId: spec.id,
    target: targetName,
    builtFrom: spec.builtFrom ?? null,
    startedAt: new Date().toISOString(),
    steps: [],
    selfCheck: [],
    errors: [],
  };
  const ctx = {};

  await target.resetViewport();

  try {
    await runSetup(target, spec, ctx, log);
    // ★ 按键消费探针：只在 spec 声明了 keys 面时才装（加性，不影响既有记录）。
    //   ★ 必须在 runSetup **之后**装：setup 里的 navigate/seedTempDoc 会整页导航，
    //     装在之前的话监听器会被导航清掉 ⇒ keys 名册恒空（wave1-16 首跑实测）。
    if ((spec.observe || []).includes("animation")) {
      await target.page.evaluate(installAnimProbe);
      log("setup installAnimProbe");
    }
    if ((spec.observe || []).includes("keys")) {
      await target.page.evaluate(installKeyProbe);
      log("setup installKeyProbe");
    }
    record.steps.push({ index: 0, label: 'baseline', ...(await target.observe(spec, spec.observe)) });

    for (let i = 0; i < (spec.steps || []).length; i++) {
      const step = spec.steps[i];
      // 加性（第 335 批）：`step.targets` 给「只有某一侧才有的前置」用（例如官方斜线菜单是二级菜单、
      // 本地是扁平过滤）。跳过的步不写 record ⇒ 两侧步数会不同，differ 按**共有的 step index** 比，
      // 因此这类 spec 应把两侧步序对齐到同一观测点，别让跳步改变关键步的位置。
      if (step.targets && !step.targets.includes(target.name)) {
        log('step SKIP (' + target.name + ') ' + (step.label || step.op));
        record.steps.push({ index: i + 1, label: 'skipped: ' + (step.label || step.op), skipped: true, ...(await target.observe(spec, spec.observe)) });
        continue;
      }
      await runStep(target, spec, step, ctx, log);
      // 动作后**立刻**取一次观测（硬规则 4）
      record.steps.push({ index: i + 1, label: step.label || step.op, ...(await target.observe(spec, spec.observe)) });
    }
  } catch (e) {
    record.errors.push({ where: 'run', message: String((e && e.message) || e).slice(0, 600) });
    log('ERROR ' + String((e && e.message) || e).slice(0, 400));
  }

  // spec 的 expect 对**本侧自己的观测**求值（两侧互比由 differ 负责）
  try {
    // ★ 单侧面（例如 `db`）：官方没有可查的库 ⇒ 这些断言只对指定靶子求值。
    //   否则官方侧必然 FAIL，把"本来就没有这个面"伪装成仪器故障（第 304 批 a11y 踩过同类）。
    const only = spec.selfCheckOnly;
    record.selfCheck = only && !only.includes(target.name) ? [] : evalExpect(spec.expect, record.steps);
  } catch (e) {
    record.errors.push({ where: 'expect', message: String((e && e.message) || e).slice(0, 600) });
  }

  try {
    await runTeardown(target, spec, ctx, log);
  } catch (e) {
    record.errors.push({ where: 'teardown', message: String((e && e.message) || e).slice(0, 600) });
    log('TEARDOWN ERROR ' + String((e && e.message) || e).slice(0, 400));
  }

  record.finishedAt = new Date().toISOString();
  record.log = logLines;
  return record;
}

/** 写盘：`runs/<tag>-<specId>-<target>.json`。 */
export function persist(record, tag) {
  ensureRunsDir();
  const path = `${RUNS}/${tag || stamp()}-${record.specId}-${record.target}.json`;
  writeFileSync(path, JSON.stringify(record, null, 1), 'utf8');
  return path;
}


// ───────────────────────── 入口函数 ─────────────────────────

/**
 * 页签标签会漂：标签是建立时分配的（p1/p2/p4/p5…），某个页被关掉重开就会换号，
 * 而写死的 `PAGE_LABEL` 随即指向一个已关闭的句柄（报 `page p2 was closed`／
 * `No target with given id found`，实测已绊过两次）。⇒ 先按写死标签试一次，
 * 探不通就按**靶子 URL 前缀**在现有页里找；都没有才新建。
 */
async function resolvePage(task, targetName) {
  const preferred = PAGE_LABEL[targetName];
  const base = TARGETS[targetName];
  const alive = async (page) => {
    try { await page.evaluate(() => document.readyState); return true; } catch { return false; }
  };

  if (preferred && (await alive(task.page(preferred)))) return task.page(preferred);

  const tabs = await task.tabs();
  const match = tabs.find((t) => t.label && String(t.url).startsWith(base));
  if (match) {
    console.log('[run] page label drifted: ' + targetName + ' -> ' + match.label);
    return task.page(match.label);
  }

  const page = await task.newPage();
  console.log('[run] page created: ' + targetName + ' -> ' + page.label);
  return page;
}

export async function main(opts) {
  const only = (opts && opts.only) !== undefined ? opts.only : ILAB_ONLY;
  const targetsArg = (opts && opts.targets) || ILAB_TARGETS;
  const tag = (opts && opts.tag) || ILAB_TAG || stamp();
  const targets = targetsArg === 'both' ? ['official', 'local'] : [targetsArg];
  const specs = await loadSpecs(only);
  const summary = { tag, specs: specs.map((s) => s.id), targets, results: [], errors: [] };

  const task = await taskSpace(TASK_SPACE);
  const pages = {};
  for (const t of targets) {
    pages[t] = await resolvePage(task, t);
    await pages[t].cdp('Emulation.setDeviceMetricsOverride', VIEWPORT);
  }

  for (const spec of specs) {
    for (const t of targets) {
      try {
        const rec = await runOne(spec, t, pages[t]);
        const path = persist(rec, tag);
        summary.results.push({ specId: spec.id, target: t, path, steps: rec.steps.length, errors: rec.errors.length });
        console.log('[run] ' + spec.id + ' @ ' + t + ' -> ' + path + ' (steps=' + rec.steps.length + ' errors=' + rec.errors.length + ')');
      } catch (e) {
        const msg = String((e && e.message) || e).slice(0, 400);
        summary.errors.push({ specId: spec.id, target: t, message: msg });
        console.log('[run] ' + spec.id + ' @ ' + t + ' FAILED: ' + msg);
      }
    }
  }

  ensureRunsDir();
  writeFileSync(RUNS + '/' + tag + '-summary.json', JSON.stringify(summary, null, 1), 'utf8');
  console.log('[run] summary -> ' + RUNS + '/' + tag + '-summary.json');
  // ★ 必须收尾：`db` 档开着 Postgres 连接，不收 Node 的事件循环不退出
  //   （实测：记录写完、进程却挂到超时被移到后台）。
  await closeDb();
  return summary;
}
