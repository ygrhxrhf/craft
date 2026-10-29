/**
 * 交互实验台 · differ（Wave 0）
 *
 * 读同一 spec × 两个靶子的 record，出差异表。判定：match / differ / uncomparable。
 *
 * ─────────────────── 判定口径（Wave 0 修：旧版恒报 differ） ───────────────────
 * ★ 旧版的错：拿**绝对量**两侧互比（官方 domLength 121597 vs 本地 60602）⇒ 三个 spec 全报 differ。
 *   但两侧是两套实现（官方 Slate／本地 TipTap），DOM 规模天然不同 —— 绝对量不可比。
 *   真可比的是**动作引起的改变量**（delta = 第 i 步 − 基线），以及**文本名册的差集**。
 *
 * 分档（severity）：
 *   1 = 只记录、不判定 —— 绝对 DOM 规模、绝对可见文本长度（两侧实现不同，天然不等）
 *   2 = 参与判定 —— 具名文本计数的 **delta** 不一致、文本名册单侧增删、属性／块名册／选区不一致
 *   3 = 前置条件不成立
 *
 * 「已声明偏差」（spec.deviations）：产品级差异**照样列出来**，但带理由与出处 ⇒ severity 降为 0
 * 并在矩阵里单列。这样"两侧确实不同"与"这是有意偏差"两件事都能核，不会互相掩盖。
 *
 * 分组读 record 自己的 specId / target 字段（文件名里 spec id 与 tag 都含 -，切不可靠）。
 *
 * 入口：
 *   ego-browser nodejs -e "await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/diff.mjs')"
 * 参数写死在顶部（ego-browser 不传 process.env）。
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { normalizeText, diffTextNodes } from './observe.mjs';
import { loadSpecs } from './lab.mjs';

// ───────────────────────── 可改参数 ─────────────────────────
const ILAB_SPECS = null;   // null = 全部有双侧记录的 spec
const ILAB_TAG = null;     // null = 各 spec 各靶取最新一份
// ────────────────────────────────────────────────────────────

const RUNS = 'C:/code/craft/docs/craft-ref/interaction-lab/runs';
const MATRIX = 'C:/code/craft/docs/craft-ref/features/interaction-matrix.md';

/** 收集 runs 下所有 record，按 specId × target 分组，各留最新一份（文件名前缀是时间戳）。 */
function loadRecords() {
  const files = readdirSync(RUNS)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !f.endsWith('-summary.json') && !f.endsWith('-diff.json'))
    .sort();
  const bySpec = new Map();
  for (const f of files) {
    let rec;
    try {
      rec = JSON.parse(readFileSync(RUNS + '/' + f, 'utf8'));
    } catch {
      continue;
    }
    if (!rec || !rec.specId || !rec.target) continue;
    if (ILAB_TAG && !f.startsWith(ILAB_TAG + '-')) continue;
    if (!bySpec.has(rec.specId)) bySpec.set(rec.specId, {});
    // files 已字典序（时间戳前缀）⇒ 后写覆盖先写，自然取最新
    bySpec.get(rec.specId)[rec.target] = { file: f, rec };
  }
  return bySpec;
}

const countsAt = (rec, i, key) => rec.steps[i]?.fingerprint?.counts?.[key] ?? 0;
const scalarAt = (rec, i, field) => rec.steps[i]?.fingerprint?.[field] ?? null;
function breaksAt(rec, i) {
  const b = rec.steps[i]?.breaks;
  if (!b || !Array.isArray(b.blocks)) return null;
  return { totalBr: b.totalBr, blocks: b.blocks.map((x) => x.br + ':' + x.lines + ':' + x.text) };
}

/** 按键消费名册：把 {key, consumed} 摊成可比的串（只看带修饰键的那些）。 */
function keysAt(rec, i) {
  const k = rec.steps[i] && rec.steps[i].keys;
  if (!Array.isArray(k)) return null;
  return k.map((x) => x.key + (x.consumed ? '!' : '')).sort().join(',');
}
function blocksAt(rec, i) {
  const b = rec.steps[i]?.blocks?.blocks;
  return Array.isArray(b) ? b.map((x) => x.text) : null;
}

/** 一条 row 是否命中 spec 的「已声明偏差」。 */
function deviationFor(spec, facet) {
  for (const d of (spec && spec.deviations) || []) {
    if (d.facet && d.facet === facet) return d;
    if (d.prefix && facet.startsWith(d.prefix)) return d;
  }
  return null;
}

export function compare(specId, official, local, spec) {
  const result = { specId, verdict: 'match', rows: [], deviations: [] };
  if (!official || !local) {
    result.verdict = 'uncomparable';
    result.rows.push({
      facet: 'precondition',
      official: official ? official.rec.steps.length + ' steps, ' + official.rec.errors.length + ' errors' : 'no record',
      local: local ? local.rec.steps.length + ' steps, ' + local.rec.errors.length + ' errors' : 'no record',
      delta: null,
      severity: 3,
    });
    return result;
  }
  if ((official.rec.errors && official.rec.errors.length) || (local.rec.errors && local.rec.errors.length)) {
    result.verdict = 'uncomparable';
    result.rows.push({
      facet: 'precondition',
      official: (official.rec.errors || []).map((e) => e.message).join('; ') || 'ok',
      local: (local.rec.errors || []).map((e) => e.message).join('; ') || 'ok',
      delta: null,
      severity: 3,
    });
    return result;
  }
  if (official.rec.steps.length !== local.rec.steps.length) {
    result.verdict = 'uncomparable';
    result.rows.push({
      facet: 'precondition',
      official: official.rec.steps.length + ' steps',
      local: local.rec.steps.length + ' steps',
      delta: local.rec.steps.length - official.rec.steps.length,
      severity: 3,
    });
    return result;
  }

  const o = official.rec;
  const l = local.rec;
  const n = o.steps.length;

  const push = (row) => {
    const dev = deviationFor(spec, row.facet);
    if (dev) {
      result.rows.push({ ...row, severity: 0, deviation: dev.ref || dev.reason || 'declared' });
      result.deviations.push({ facet: row.facet, step: row.step, official: row.official, local: row.local, reason: dev.reason, ref: dev.ref });
    } else {
      result.rows.push(row);
    }
  };

  // ① 绝对规模：只记录、不判定（两侧实现不同，天然不等）
  for (let i = 0; i < n; i++) {
    for (const f of ['domLength', 'bodyTextLength']) {
      const a = scalarAt(o, i, f);
      const b = scalarAt(l, i, f);
      if (a !== b) {
        result.rows.push({ facet: f, step: i, label: o.steps[i].label, official: a, local: b, delta: a != null && b != null ? b - a : null, severity: 1 });
      }
    }
  }

  // ② 具名文本计数的 delta（第 i 步 − 基线）：行为可比量
  const keys = new Set();
  for (const st of o.steps) for (const k of Object.keys((st.fingerprint && st.fingerprint.counts) || {})) keys.add(k);
  for (const st of l.steps) for (const k of Object.keys((st.fingerprint && st.fingerprint.counts) || {})) keys.add(k);
  for (let i = 0; i < n; i++) {
    for (const k of [...keys].sort()) {
      const od = countsAt(o, i, k) - countsAt(o, 0, k);
      const ld = countsAt(l, i, k) - countsAt(l, 0, k);
      if (od !== ld) {
        push({ facet: 'countΔ:' + normalizeText(k), step: i, label: o.steps[i].label, official: od, local: ld, delta: ld - od, severity: 2 });
      }
    }
  }

  // ③ 文本名册差集（基线 → 末步）：主行为判据
  const ot = o.steps[0] && o.steps[0].textNodes;
  const lt = l.steps[0] && l.steps[0].textNodes;
  if (ot && lt) {
    const oD = diffTextNodes(ot, o.steps[n - 1] && o.steps[n - 1].textNodes);
    const lD = diffTextNodes(lt, l.steps[n - 1] && l.steps[n - 1].textNodes);
    const oAdd = new Set(oD.added);
    const lAdd = new Set(lD.added);
    const oRem = new Set(oD.removed);
    const lRem = new Set(lD.removed);
    for (const x of [...lAdd].filter((v) => !oAdd.has(v)).sort()) push({ facet: 'added-only-local', official: null, local: x, delta: null, severity: 2 });
    for (const x of [...oAdd].filter((v) => !lAdd.has(v)).sort()) push({ facet: 'added-only-official', official: x, local: null, delta: null, severity: 2 });
    for (const x of [...lRem].filter((v) => !oRem.has(v)).sort()) push({ facet: 'removed-only-local', official: null, local: x, delta: null, severity: 2 });
    for (const x of [...oRem].filter((v) => !lRem.has(v)).sort()) push({ facet: 'removed-only-official', official: x, local: null, delta: null, severity: 2 });
    result.textSummary = { oAdded: oD.added.length, lAdded: lD.added.length, oRemoved: oD.removed.length, lRemoved: lD.removed.length };
  }

  // ④ 属性面（placeholder / aria-*）：两侧都采了才比
  for (let i = 0; i < n; i++) {
    const oa = o.steps[i] && o.steps[i].attrs;
    const la = l.steps[i] && l.steps[i].attrs;
    if (!oa || !la) continue;
    for (const k of [...new Set([...Object.keys(oa), ...Object.keys(la)])].sort()) {
      const av = oa[k];
      const bv = la[k];
      if (JSON.stringify(av) === JSON.stringify(bv)) continue;
      const flat = (v) => (v == null ? null : v.placeholder != null ? v.placeholder : JSON.stringify(v));
      push({ facet: 'attr:' + k, step: i, label: o.steps[i].label, official: flat(av), local: flat(bv), delta: null, severity: 2 });
    }
  }

  // ⑤ 块名册：两侧都采了才比（逐字）
  for (let i = 0; i < n; i++) {
    const ob = blocksAt(o, i);
    const lb = blocksAt(l, i);
    if (!ob || !lb) continue;
    if (JSON.stringify(ob) !== JSON.stringify(lb)) {
      push({ facet: 'blocks', step: i, label: o.steps[i].label, official: JSON.stringify(ob), local: JSON.stringify(lb), delta: null, severity: 2 });
    }
  }

  // ⑤b 块内换行（breaks）：★ 必须与 blocks **同级**判。
  //   实测踩坑：一度写在 blocks 的 `if (不等)` 里面 ⇒ 块名册两侧相同（"AAA"/"BBB"）时整段不求值，
  //   而 Shift+Enter 的差异恰恰只体现在 breaks 上（名册压掉了空白）⇒ 该行永远不出现。
  for (let i = 0; i < n; i++) {
    const obr = breaksAt(o, i);
    const lbr = breaksAt(l, i);
    if (!obr || !lbr) continue;
    if (obr.totalBr !== lbr.totalBr || JSON.stringify(obr.blocks) !== JSON.stringify(lbr.blocks)) {
      push({ facet: 'breaks', step: i, label: o.steps[i].label, official: JSON.stringify(obr), local: JSON.stringify(lbr), delta: null, severity: 2 });
    }
  }

  // ⑤ 焦点：键失效时光标会**逃出编辑器**（比"无反应"强得多的判据）。
  //   实测：本地 Tab#2 后 activeElement 变 `nextjs-portal` → `body` → 按钮；官方 Tab#2 仍在编辑器内。
  for (let i = 0; i < n; i++) {
    const of = o.steps[i] && o.steps[i].focus;
    const lf = l.steps[i] && l.steps[i].focus;
    if (!of || !lf) continue;
    if (of.inEditor !== lf.inEditor) {
      push({ facet: 'focusInEditor', step: i, label: o.steps[i].label, official: of.inEditor, local: lf.inEditor, delta: null, severity: 2 });
    }
  }

  // ⑤c 按键消费（keys）：★ 加性档，只在两侧都采到时判。
  //   为什么必须有它：Ctrl+Left 两侧都让光标动 3 个字符，但官方把键消费掉、本地没有 ⇒
  //   只比选区偏移会把这类差异读成一致（实测踩到）。
  for (let i = 0; i < n; i++) {
    const ok = keysAt(o, i);
    const lk = keysAt(l, i);
    if (ok === null || lk === null) continue;
    if (ok !== lk) {
      push({ facet: 'keys', step: i, label: o.steps[i].label, official: ok, local: lk, delta: null, severity: 2 });
    }
  }
  // ⑤f 行内标记（inline）：★ 加性档，只在两侧都采到时判。
  //   为什么必须有它：行内标记不改块名册、不改文本计数（`**X**` 与 `X` 在名册里都只是"有文字"）
  //   ⇒ 现有各档都读不出"到底转换了没有"（实测 probe-w1bb：官方六条行内 markdown 全部原样不转换）。
  for (let i = 0; i < n; i++) {
    const oi = o.steps[i] && o.steps[i].inline;
    const li = l.steps[i] && l.steps[i].inline;
    if (!oi || !li) continue;
    // ★ 只比**归一后的枚举 `marks`**（两侧载体不同：官方 leaf 计算样式、本地标签）。
    //   第一版把原始计数也算进去 ⇒ 官方没有标签、计数恒 0，而本地恒 ≥1，
    //   **即使两边都转换成功**也会报红（假红）。枚举才是可比的那一层。
    const norm = (x) => JSON.stringify({ marks: x.marks || [], fw: x.leaf.fw, deco: x.leaf.deco, bg: x.leaf.bg, fs: x.leaf.fs });
    const os = norm(oi), ls = norm(li);
    if (os !== ls) push({ facet: 'inline', step: i, label: o.steps[i].label, official: os, local: ls, delta: null, severity: 2 });
  }
  // ⑤e 块类型（kinds）：★ 加性档，只在两侧都采到时判。
  //   为什么必须有它：官方块行 tag 恒为 span（Slate）⇒ 只看 tag 会把官方所有 markdown 转换
  //   读成"没反应"（实测）。本档把两侧的"类型"归一到同一枚举（para/task/list/item/headingN/divider/code/quote）。
  for (let i = 0; i < n; i++) {
    const ok = o.steps[i] && o.steps[i].kinds;
    const lk = l.steps[i] && l.steps[i].kinds;
    if (!ok || !lk) continue;
    const os = JSON.stringify(ok), ls = JSON.stringify(lk);
    if (os !== ls) push({ facet: 'kinds', step: i, label: o.steps[i].label, official: os, local: ls, delta: null, severity: 2 });
  }
  // ⑤d 框选（marquee）：★ 加性档，只在两侧都采到时判。
  //   判据口径照 G1138：选中看 role=checkbox 的 aria-checked，**不看** `_isActive_`（静止态也有）。
  for (let i = 0; i < n; i++) {
    const om = o.steps[i] && o.steps[i].marquee;
    const lm = l.steps[i] && l.steps[i].marquee;
    if (!om || !lm) continue;
    const norm = (m) => JSON.stringify({
      rect: m.rect ? { pos: m.rect.pos, z: m.rect.z, pe: m.rect.pe } : null,
      checked: m.checkedCount, cbTotal: m.checkboxTotal, itemIds: m.itemIdCount,
    });
    const os = norm(om), ls = norm(lm);
    if (os !== ls) push({ facet: 'marquee', step: i, label: o.steps[i].label, official: os, local: ls, delta: null, severity: 2 });
  }
  // ⑥ 选区：collapsed / 偏移（块 id 两侧命名空间不同，不比）
  // ⑦ 缩进级数（G218）：两侧载体不同（官方 --indent-w 标记元素 / 本地列表嵌套），
  //   但已在探针里归一到"级"，故**可比**。比的是整个级数名册（不只光标那一块）。
  for (let i = 0; i < n; i++) {
    const oi = o.steps[i] && o.steps[i].indent;
    const li = l.steps[i] && l.steps[i].indent;
    if (!oi || !li) continue;
    const ol = JSON.stringify(oi.levels || []);
    const ll = JSON.stringify(li.levels || []);
    if (ol !== ll) {
      push({ facet: 'indentLevels', step: i, label: o.steps[i].label, official: ol, local: ll, delta: null, severity: 2 });
    }
    if (oi.cursorLevel !== li.cursorLevel) {
      push({ facet: 'indentLevel', step: i, label: o.steps[i].label, official: oi.cursorLevel, local: li.cursorLevel, delta: null, severity: 2 });
    }
  }

  // ⑩ 具名选择器**命中数**（`state:<key>`）：两侧都采了才比。
  //   ★ 为什么必须补：`state:` 档一直能采、也能在 spec 里断言，但 differ **从来没比过它**
  //     ⇒ "弹窗开没开"这类最直观的差异在判定里是隐形的（第 311 批实测：官方 Ctrl-J 弹出
  //     新建任务弹窗、本地无反应，而 verdict 里只剩属性行）。
  for (let i = 0; i < n; i++) {
    const os = o.steps[i] && o.steps[i].stateAttrs && o.steps[i].stateAttrs.named;
    const ls = l.steps[i] && l.steps[i].stateAttrs && l.steps[i].stateAttrs.named;
    if (!os || !ls) continue;
    for (const k of new Set([...Object.keys(os), ...Object.keys(ls)])) {
      const ov = os[k];
      const lv = ls[k];
      if (ov === lv) continue;
      push({
        facet: "state:" + k,
        step: i,
        label: o.steps[i].label,
        official: ov,
        local: lv,
        delta: typeof ov === "number" && typeof lv === "number" ? lv - ov : null,
        severity: 2,
      });
    }
  }

  // ⑨ 动效（事件式探针）：比「哪些属性/元素在动 ＋ 各自多久」。
  //   ★ 动画名两侧不可比（官方是构建哈希、本地是语义名）⇒ 采集侧已归一成 (anim)。
  //   ★ 时长取事件 elapsedTime（规范值）⇒ 可直接比，不留容差。
  //   ★「仍在跑」的动效只记不判（severity 1）：它取决于该帧恰好在循环哪一段。
  // ★ 只比**末步**的累计清单：动效缓冲是累计的，中间步的清单会随挂载时机截断
  //   （同一批事件这次落在第 1 步、下次落在第 2 步），逐步比会制造假红。
  for (const i of (n > 0 ? [n - 1] : [])) {
    const oa = o.steps[i] && o.steps[i].animation;
    const la = l.steps[i] && l.steps[i].animation;
    if (!oa || !la) continue;
    const aKey = (x) => x.kind + "|" + x.name + "|" + x.target + "|" + (x.dur == null ? (x.interrupted ? "interrupted" : "?") : x.dur);
    const oSet = new Set((oa.events || []).map(aKey));
    const lSet = new Set((la.events || []).map(aKey));
    for (const x of [...lSet].filter((v) => !oSet.has(v)).sort()) push({ facet: "anim-only-local", step: i, label: o.steps[i].label, official: null, local: x, delta: null, severity: 2 });
    for (const x of [...oSet].filter((v) => !lSet.has(v)).sort()) push({ facet: "anim-only-official", step: i, label: o.steps[i].label, official: x, local: null, delta: null, severity: 2 });
    for (const x of (oa.running || [])) push({ facet: "anim-running-official", step: i, label: o.steps[i].label, official: x.kind + "|" + x.name + "|" + x.target, local: null, delta: null, severity: 1 });
    for (const x of (la.running || [])) push({ facet: "anim-running-local", step: i, label: o.steps[i].label, official: null, local: x.kind + "|" + x.name + "|" + x.target, delta: null, severity: 1 });
  }

  // ⑧ 可达性树（编辑器子树内，CDP 权威 AX 树）：比**可操作角色 × 可及名**的集合。
  //   结构节点（generic/StaticText…）已在采集侧丢掉 —— 两侧渲染框架不同，数量天然不等。
  //   ★ 名字按 set 比、不比条数：条数差异多半来自外壳（本地侧栏把每篇文档画成按钮）。
  for (let i = 0; i < n; i++) {
    const oa = o.steps[i] && o.steps[i].a11y;
    const la = l.steps[i] && l.steps[i].a11y;
    if (!oa || !la || !oa.found || !la.found) continue;
    const key = (x) => x.role + '|' + (x.name || '');
    const oSet = new Set((oa.rows || []).map(key));
    const lSet = new Set((la.rows || []).map(key));
    for (const x of [...lSet].filter((v) => !oSet.has(v)).sort()) {
      push({ facet: 'a11y-only-local', step: i, label: o.steps[i].label, official: null, local: x, delta: null, severity: 2 });
    }
    for (const x of [...oSet].filter((v) => !lSet.has(v)).sort()) {
      push({ facet: 'a11y-only-official', step: i, label: o.steps[i].label, official: x, local: null, delta: null, severity: 2 });
    }
    for (const r of new Set([...Object.keys(oa.roles || {}), ...Object.keys(la.roles || {})])) {
      const ov = (oa.roles || {})[r] || 0;
      const lv = (la.roles || {})[r] || 0;
      if (ov !== lv) {
        // 只记录不判定：两侧框架的原生控件数天然不同（见上），绝对量不参与判定。
        push({ facet: 'a11yCount:' + r, step: i, label: o.steps[i].label, official: ov, local: lv, delta: lv - ov, severity: 1 });
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const os = o.steps[i] && o.steps[i].selection;
    const ls = l.steps[i] && l.steps[i].selection;
    if (!os || !ls) continue;
    for (const f of ['collapsed', 'anchorOffset', 'focusOffset']) {
      if (os[f] !== ls[f]) {
        push({ facet: 'selection:' + f, step: i, label: o.steps[i].label, official: os[f], local: ls[f], delta: null, severity: 2 });
      }
    }
  }

  result.verdict = result.rows.some((r) => r.severity >= 2) ? 'differ' : 'match';
  return result;
}

function esc(v) {
  return String(v == null ? '' : v).replace(/\|/g, '\\|').slice(0, 160);
}

function renderMarkdown(results) {
  const L = [];
  L.push('# 交互矩阵（机器可核台账）');
  L.push('');
  L.push('> 由 `docs/craft-ref/interaction-lab/diff.mjs` 生成；原始 record 在 `interaction-lab/runs/`（gitignore）。');
  L.push('> 一行 = 一 spec × 官方/本地 判定。');
  L.push('');
  L.push('**判定口径**：');
  L.push('');
  L.push('- `match` —— 除噪声与 severity=1 的绝对量外无差异。');
  L.push('- `differ` —— 存在 severity≥2 的差异行（具名文本计数 **delta** 不一致 / 文本名册单侧增删 / 属性·块名册·选区不一致）。');
  L.push('- `uncomparable` —— 任一侧有 error，或两侧步数不一致（无法逐帧对齐）。');
  L.push('');
  L.push('**分档**：severity 1 = 只记录不判定（绝对 DOM 规模、绝对可见文本长度：两侧是两套实现，天然不等）；');
  L.push('severity 2 = 参与判定；severity 3 = 前置条件不成立。');
  L.push('');
  L.push('**已声明偏差**（severity 0）：产品级差异照样列出，但 spec 里 `deviations` 带了理由与出处 ⇒ 不参与判定。');
  L.push('');
  L.push('| spec | 判定 | 差异行 | severity 2+ | 已声明偏差 | 文本名册 +/− |');
  L.push('| --- | --- | --- | --- | --- | --- |');
  for (const r of results) {
    const s2 = r.rows.filter((x) => x.severity >= 2).length;
    const ts = r.textSummary
      ? '本地 +' + r.textSummary.lAdded + '/−' + r.textSummary.lRemoved + ' · 官方 +' + r.textSummary.oAdded + '/−' + r.textSummary.oRemoved
      : '';
    L.push('| `' + r.specId + '` | ' + r.verdict + ' | ' + r.rows.length + ' | ' + s2 + ' | ' + r.deviations.length + ' | ' + ts + ' |');
  }
  L.push('');
  L.push('## 已声明偏差明细');
  L.push('');
  if (!results.some((r) => r.deviations.length)) {
    L.push('（无）');
  } else {
    L.push('| spec | facet | step | official | local | 理由 | 出处 |');
    L.push('| --- | --- | --- | --- | --- | --- | --- |');
    for (const r of results) {
      for (const d of r.deviations) {
        L.push('| `' + r.specId + '` | ' + esc(d.facet) + ' | ' + (d.step == null ? '' : d.step) + ' | ' + esc(d.official) + ' | ' + esc(d.local) + ' | ' + esc(d.reason) + ' | ' + esc(d.ref) + ' |');
      }
    }
  }
  L.push('');
  L.push('## 逐行明细（severity ≥ 2）');
  L.push('');
  for (const r of results) {
    const judged = r.rows.filter((x) => x.severity >= 2);
    if (!judged.length) continue;
    L.push('### `' + r.specId + '` — ' + r.verdict);
    L.push('');
    L.push('| step | facet | official | local | delta | severity |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (const row of judged.slice(0, 200)) {
      L.push('| ' + (row.step == null ? '' : row.step) + ' | ' + esc(row.facet) + ' | ' + esc(row.official) + ' | ' + esc(row.local) + ' | ' + (row.delta == null ? '' : row.delta) + ' | ' + row.severity + ' |');
    }
    L.push('');
  }
  L.push('## spec 自带期望（selfCheck）');
  L.push('');
  L.push('每侧对**自己的观测**求 `spec.expect`（两侧互比由上表负责，两者是两件事）。');
  L.push('');
  L.push('| spec | 靶 | 期望 | 结果 | actual |');
  L.push('| --- | --- | --- | --- | --- |');
  for (const r of results) {
    for (const target of ['official', 'local']) {
      for (const c of (r.selfCheckRaw && r.selfCheckRaw[target]) || []) {
        L.push('| `' + r.specId + '` | ' + target + ' | ' + esc(c.facet + ' ' + c.op + ' ' + JSON.stringify(c.expected)) + ' | ' + (c.pass ? 'PASS' : '**FAIL**') + ' | ' + esc(JSON.stringify(c.actual)) + ' |');
      }
    }
  }
  L.push('');
  return L.join('\n');
}

async function main() {
  const bySpec = loadRecords();
  const specs = await loadSpecs(null);
  const specsById = new Map(specs.map((s) => [s.id, s]));
  const results = [];
  for (const [specId, slot] of bySpec) {
    if (ILAB_SPECS && !ILAB_SPECS.includes(specId)) continue;
    const r = compare(specId, slot.official, slot.local, specsById.get(specId));
    r.selfCheckRaw = {
      official: (slot.official && slot.official.rec.selfCheck) || [],
      local: (slot.local && slot.local.rec.selfCheck) || [],
    };
    results.push(r);
    console.log('[diff] ' + specId + ': ' + r.verdict + ' (' + r.rows.length + ' rows, ' + r.rows.filter((x) => x.severity >= 2).length + ' sev2+, ' + r.deviations.length + ' declared deviations)');
  }
  results.sort((a, b) => a.specId.localeCompare(b.specId));
  mkdirSync(RUNS, { recursive: true });
  writeFileSync(RUNS + '/latest-diff.json', JSON.stringify(results, null, 1), 'utf8');
  writeFileSync(MATRIX, renderMarkdown(results), 'utf8');
  console.log('[diff] matrix -> ' + MATRIX);
}

// 只有**直接跑**这个文件时才生成矩阵；被 import（例：对照实验里取 compare）不产生副作用。
// 判据＝argv[1] 的 file URL 指向本文件（ego-browser 的入口是 run.mjs/diff.mjs 自身）。
const invokedDirectly = (() => {
  try {
    return import.meta.url === new URL('file://' + process.argv[1].replace(/\\/g, '/')).href;
  } catch {
    return true;
  }
})();
if (invokedDirectly) await main();
