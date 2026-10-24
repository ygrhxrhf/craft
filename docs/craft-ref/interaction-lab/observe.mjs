/**
 * 交互实验台 · 共享观测库（Wave 0）
 *
 * 设计约束（来自 `capture.md` 路径 C 与任务书硬规则）：
 *  - 页面侧函数必须自包含：`page.evaluate()` 的回调读不到宿主变量，
 *    所以每个函数只吃一个 JSON 可序列化的 arg。
 *  - 指纹主判据 = `domLength` + 具名文本计数（本仓既有口径，见 `interactions.md` §四）。
 *    截图字节**不可**单独当证据（静止页也会漂移，见 V7b）。
 *  - 动作后**立刻**取一次观测。`page.evaluate` 里跑 `setInterval` 轮询会阻塞 React 渲染、
 *    把浮层"等"没（`capture.md` §取 DOM 快照 教训 2）。
 */

// ───────────────────────── 页面侧（交给 page.evaluate） ─────────────────────────

/** 主指纹：整页 DOM 字节长度 + 具名文本出现次数 + 可见文本长度。 */
export function captureFingerprint(arg) {
  const texts = (arg && arg.texts) || [];
  const hay = (document.body && document.body.innerText) || '';
  const counts = {};
  for (const t of texts) {
    let n = 0;
    let i = 0;
    while ((i = hay.indexOf(t, i)) !== -1) {
      n += 1;
      i += t.length;
    }
    counts[t] = n;
  }
  return {
    url: location.href,
    title: document.title,
    domLength: document.documentElement.outerHTML.length,
    bodyTextLength: hay.length,
    counts,
  };
}

/**
 * 文本节点名册：用于算 added/removed 差集。
 * 取 `document.body` 下所有非空文本节点的 trim 值，带一个"第几次出现"后缀去重，
 * 这样"同一个词多出现一次"能表现为新增一条而不是同一条。
 */
export function captureTextNodes(arg) {
  const limit = (arg && arg.limit) || 4000;
  const out = [];
  const seen = new Map();
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const v = (node.nodeValue || '').trim();
      if (v) {
        const k = seen.get(v) || 0;
        seen.set(v, k + 1);
        out.push(k === 0 ? v : v + '#' + k);
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
    for (const child of el.childNodes) walk(child);
  };
  walk(document.body);
  return out.slice(0, limit);
}

/**
 * 状态判据：官方全站 50 处 `data-state`（Base UI 开合态）、`data-whatinput` /
 * `data-whatintent`（输入方式探测）、`aria-expanded` / `aria-selected` / `aria-pressed`。
 * 这些比截图字节直接（`interactions.md` §二）。
 */
export function captureStateAttrs(arg) {
  const sel = (arg && arg.selectors) || [];
  const countBy = (attr) => {
    const nodes = document.querySelectorAll('[' + attr + ']');
    const tally = {};
    for (const n of nodes) {
      const v = n.getAttribute(attr) || '';
      tally[v] = (tally[v] || 0) + 1;
    }
    return { total: nodes.length, tally };
  };
  const html = document.documentElement;
  const named = {};
  for (const s of sel) named[s] = document.querySelectorAll(s).length;
  return {
    dataState: countBy('data-state'),
    dataWhatinput: html.getAttribute('data-whatinput'),
    dataWhatintent: html.getAttribute('data-whatintent'),
    ariaExpandedTrue: document.querySelectorAll('[aria-expanded="true"]').length,
    ariaSelectedTrue: document.querySelectorAll('[aria-selected="true"]').length,
    ariaPressedTrue: document.querySelectorAll('[aria-pressed="true"]').length,
    dialogCount: document.querySelectorAll('[role="dialog"],[role="menu"],[role="listbox"]').length,
    named,
  };
}

/**
 * 属性探针（页面侧）：读具名选择器的属性值。
 * 用途＝placeholder / aria-* / data-state 这些**不在 innerText 里**、却是判据本身的字段。
 * 例：官方 ⌘K 面板的输入框 placeholder 是「打开」，本地是「搜索文档、内容…」。
 */
export function captureAttrs(arg) {
  const probes = (arg && arg.probes) || [];
  const out = {};
  for (const p of probes) {
    const el = p.selector ? document.querySelector(p.selector) : null;
    if (!el) {
      out[p.key] = null;
      continue;
    }
    const rec = {};
    for (const a of p.attrs || ['placeholder']) rec[a] = el.getAttribute(a);
    rec._tag = el.tagName.toLowerCase();
    out[p.key] = rec;
  }
  return out;
}

/** 计算样式：对每个选择器取首个命中元素的具名属性。 */
export function captureComputed(arg) {
  const probes = (arg && arg.probes) || [];
  const props = (arg && arg.props) || [
    'display',
    'visibility',
    'opacity',
    'color',
    'backgroundColor',
    'fontSize',
    'fontWeight',
    'textAlign',
    'textDecorationLine',
    'paddingLeft',
    'width',
    'height',
  ];
  const out = {};
  for (const p of probes) {
    const el = document.querySelector(p.selector);
    if (!el) {
      out[p.key] = null;
      continue;
    }
    const cs = getComputedStyle(el);
    const rec = {};
    for (const prop of props) rec[prop] = cs[prop];
    const r = el.getBoundingClientRect();
    rec._rect = { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    out[p.key] = rec;
  }
  return out;
}

/**
 * 选区几何：光标落在哪个块、偏移多少。
 * 官方 Slate 与本地 TipTap 都用 DOM 原生选区，所以两边同一口径。
 * 块判定：向上找最近的 `data-block-id`（官方），否则找最近的块级祖先。
 */
export function captureSelection() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return { present: false };
  const blockOf = (node) => {
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el) {
      if (el.hasAttribute && el.hasAttribute('data-block-id')) return el.getAttribute('data-block-id');
      el = el.parentElement;
    }
    return null;
  };
  const indexOf = (node) => {
    let el = node && node.nodeType === 3 ? node.parentElement : node;
    while (el && el.parentElement) {
      const sib = el.previousElementSibling;
      let n = 0;
      let s = sib;
      while (s) {
        n += 1;
        s = s.previousElementSibling;
      }
      if (el.parentElement.classList && el.parentElement.classList.contains('ProseMirror')) return n;
      el = el.parentElement;
    }
    return null;
  };
  return {
    present: true,
    collapsed: sel.isCollapsed,
    text: (sel.toString() || '').slice(0, 200),
    anchorBlock: blockOf(sel.anchorNode),
    focusBlock: blockOf(sel.focusNode),
    anchorOffset: sel.anchorOffset,
    focusOffset: sel.focusOffset,
    anchorChildIndex: indexOf(sel.anchorNode),
  };
}

/**
 * 块名册：把编辑器正文里每个"块"的名字与文本列出来。
 *
 * 两侧口径不同，都取"正文块"这一层：
 *  - 官方：正文块带 `id="blockrowwrap-<blockId>"`（标题块是 `blockwrap-<id>`，不算正文）；
 *  - 本地：TipTap 的 `.ProseMirror` 的直接子元素（列表要摊平，见 `flatten`）。
 */
export function captureBlocks(arg) {
  const rootSel = (arg && arg.root) || null;
  // 列表摊平：命中的根若是 UL/OL，展开到每个 li 的首个文本块（递归嵌套）。
  const flatten = (rootSel) => {
    const out2 = [];
    const pushList = (listEl) => {
      for (const li of Array.from(listEl.children)) {
        if (li.tagName !== 'LI') continue;
        const tb = Array.from(li.children).find((c) => /^(P|H1|H2|H3|H4|H5|H6|DIV)$/.test(c.tagName));
        if (tb) out2.push(tb);
        for (const sub of Array.from(li.children)) {
          if (sub.tagName === 'UL' || sub.tagName === 'OL') pushList(sub);
        }
      }
    };
    for (const el of Array.from(document.querySelectorAll(rootSel))) {
      if (el.tagName === 'UL' || el.tagName === 'OL') pushList(el);
      else out2.push(el);
    }
    return out2;
  };
  const els = rootSel ? flatten(rootSel) : [];
  const blocks = els.map((el) => {
    const blockId =
      el.getAttribute('data-block-id') ||
      (el.id && el.id.startsWith('blockrowwrap-') ? el.id.slice('blockrowwrap-'.length) : null) ||
      (el.id && el.id.startsWith('blockwrap-') ? el.id.slice('blockwrap-'.length) : null);
    const isTitle = el.getAttribute('data-testid') === 'editor-title';
    return {
      tag: el.tagName.toLowerCase(),
      blockId,
      isTitle,
      // 行首项目符号：官方把圆点画成**文本节点**（进 innerText），本地用 CSS `list-style`
      // （不进 innerText）⇒ 那是**呈现机制**差异、不是内容差异。两侧都剥掉圆点类字形，
      // 块名册才比内容。只剥圆点（• · ● ◦ ▪ ▫ ‣ ⁃），**不剥** `-`／`*`
      // —— 以短横开头的正文（负号、破折号）会被误伤。
      text: (el.innerText || '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^[•·●◦▪▫‣⁃]+[ \t]*/, '')
        .slice(0, 120),
    };
  });
  return { found: blocks.length, blocks };
}

/**
 * 落点测量：给"点正文空白处"这类动作算一个坐标。
 * 官方空文档只有标题块，正文区是标题下方的一段空白；本地 TipTap 会先渲染一个空段落。
 */
export function measureTrailingPoint(arg) {
  const titleSel = arg && arg.title;
  const blockSel = arg && arg.blockRoot;
  const title = titleSel ? document.querySelector(titleSel) : null;
  const tr = title ? title.getBoundingClientRect() : null;
  // 列表摊平：命中的根若是 UL/OL，展开到每个 li 的首个文本块（递归嵌套）。
  const flatten = (rootSel) => {
    const out2 = [];
    const pushList = (listEl) => {
      for (const li of Array.from(listEl.children)) {
        if (li.tagName !== 'LI') continue;
        const tb = Array.from(li.children).find((c) => /^(P|H1|H2|H3|H4|H5|H6|DIV)$/.test(c.tagName));
        if (tb) out2.push(tb);
        for (const sub of Array.from(li.children)) {
          if (sub.tagName === 'UL' || sub.tagName === 'OL') pushList(sub);
        }
      }
    };
    for (const el of Array.from(document.querySelectorAll(rootSel))) {
      if (el.tagName === 'UL' || el.tagName === 'OL') pushList(el);
      else out2.push(el);
    }
    return out2;
  };
  const blocks = blockSel ? flatten(blockSel) : [];
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  // 口径一：正文块已经渲染（本地 TipTap 总会先给一个空段落）⇒ 点最后一块的中部。
  if (blocks.length) {
    const last = blocks[blocks.length - 1];
    const r = last.getBoundingClientRect();
    return {
      mode: 'last-block',
      x: Math.round(r.x + Math.min(60, Math.max(8, r.width / 6))),
      y: Math.round(r.y + Math.max(6, Math.min(r.height / 2, 14))),
      blockCount: blocks.length,
      blockRect: rectOf(last),
      titleRect: tr ? rectOf(title) : null,
    };
  }
  // 口径二：正文块还没渲染（官方空文档只挂标题块）⇒ 点标题下方 60px 的空白，让正文块生成。
  if (!tr) return null;
  return {
    mode: 'title-below',
    x: Math.round(tr.x + Math.min(60, Math.max(8, tr.width / 12))),
    y: Math.round(tr.bottom + 60),
    blockCount: 0,
    blockRect: null,
    titleRect: rectOf(title),
  };
}
// ───────────────────────── 宿主侧 ─────────────────────────

/**
 * 噪声屏蔽。必须在 differ 里先过这一道，否则每轮假红。
 * 清单来自任务书：相对时间文案、光标闪烁、`已保存` 落定时机、
 * 头像与文档预览图 URL、空间名/作者名、uuid、滚动位置微差。
 */
const NOISE_RULES = [
  [/\d+\s*(秒|分钟|小时|天|周|个月|年|月)\s*前/g, '<REL>'],
  [/\b\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago\b/gi, '<REL>'],
  [/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '<TIME>'],
  [/所有更改已保存|已保存|未保存|Unsaved|Saved|All changes saved/gi, '<SAVED>'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>'],
  [/https?:\/\/resv?2?\.craft\.do\/[^\s"'<>)]*/gi, '<AVATAR>'],
  [/https?:\/\/[^\s"'<>)]*document_preview[^\s"'<>)]*/gi, '<PREVIEW>'],
  [/\/api\/files\/[^\s"'<>)]*/gi, '<FILE>'],
  // 编辑器占位提示（光标进出时出现/消失，不是行为差异）
  [/输入 \/ 使用命令\.\.\./g, '<PLACEHOLDER>'],
  [/页面标题/g, '<TITLE_PH>'],
  // 项目符号：官方把圆点画成文本节点（进名册），本地用 CSS `list-style: disc`（不进）。
  // 两侧屏上都有圆点（实测 probe-bullet：本地 listStyleType=disc / 官方 textNode `•`）
  // ⇒ chrome 不是内容，只留纯圆点的条目整个丢掉（由 PURE_NOISE 那条路兜底）。
  [/^[•·●◦▪▫‣⁃]+(#\d+)?$/g, ''],
  // 协作连接横幅（本地 dev 常驻，官方无）
  [/协作连接已断开[^\n]*/g, '<COLLAB_BANNER>'],
];

/** 把一段文本里的噪声抹成占位符。 */
export function normalizeText(input, extra) {
  let s = String(input == null ? '' : input);
  for (const [re, rep] of NOISE_RULES) s = s.replace(re, rep);
  for (const [re, rep] of extra || []) s = s.replace(re, rep);
  return s;
}

/**
 * 纯占位符文本（整条只剩噪声 token，可带 `#n` 去重后缀）——这类节点从名册里**整个丢掉**，
 * 而不是保留成 `<SAVED>`。理由：`已保存`/`未保存` 的**落定时机**两侧本就不同（任务书明列噪声），
 * 保留占位符仍会在差集里表现为 added-only/removed-only 的假红。
 */
const PURE_NOISE = /^(<[A-Z_]+>)(#d+)?$/;

/** 文本节点名册的差集：added / removed（归一化 + 丢弃纯噪声）。 */
export function diffTextNodes(before, after, extra) {
  const clean = (list) =>
    new Set(
      (list || [])
        .map((x) => normalizeText(x, extra))
        .filter((x) => x && !PURE_NOISE.test(x)),
    );
  const a = clean(before);
  const b = clean(after);
  const added = [...b].filter((x) => !a.has(x));
  const removed = [...a].filter((x) => !b.has(x));
  return { added, removed };
}

/** 两个指纹的逐字段差。 */
export function diffFingerprint(before, after, extra) {
  const rows = [];
  for (const f of ['domLength', 'bodyTextLength']) {
    const o = before?.[f] ?? null;
    const n = after?.[f] ?? null;
    rows.push({ facet: f, official: o, local: n, delta: o != null && n != null ? n - o : null });
  }
  const keys = new Set([...Object.keys(before?.counts || {}), ...Object.keys(after?.counts || {})]);
  for (const k of keys) {
    const o = before?.counts?.[k] ?? 0;
    const n = after?.counts?.[k] ?? 0;
    rows.push({ facet: 'count:' + normalizeText(k, extra), official: o, local: n, delta: n - o });
  }
  return rows;
}

// ───────────────────────── 期望求值（宿主侧） ─────────────────────────

/**
 * spec 的 `expect` 逐条求值。每条期望针对**某一侧自己的观测**求值（不是两侧互比），
 * 结果进 record.selfCheck，由 differ 汇总成矩阵的一列。
 *
 * facet 口径：
 *   `text:<名>`   = 该具名文本在第 N 步指纹里的出现次数
 *   `blocks`      = 正文块文本数组（equals/contains 按 JSON 比）
 *   `blocksCount` = 正文块个数
 *   `breaks:totalBr` = 正文块内 `<br>` 总数；`breaks:lines` = 逐块非空行数（块内软换行/硬换行都会 >1）
 *   `dom`         = domLength
 *   `selection:*` = 选区字段
 *   `indentLevel` = 光标所在块的缩进级数（两侧载体已归一）
 */
export function evalExpect(expectations, steps) {
  const list = expectations || [];
  if (!list.length) return [];
  const arr = steps || [];
  // `at` 指定对第几步求值（默认末步）。理由＝有的 spec 要断"某一步当时的状态"
  // （例：斜线菜单**在打斜杠那一刻**开着、过滤后才收起），只看末步表达不出来。
  const pick = (e) => (typeof e.at === 'number' ? arr[e.at] : arr[arr.length - 1]) || {};
  const actualOf = (facet, step) => {
    if (facet === 'focusInEditor') return step.focus?.inEditor ?? null;
    if (facet === 'dom') return step.fingerprint?.domLength ?? null;
    if (facet === 'bodyText') return step.fingerprint?.bodyTextLength ?? null;
    if (facet === 'blocks') return step.blocks?.blocks?.map((b) => b.text) ?? [];
    if (facet === 'breaks:totalBr') return step.breaks?.totalBr ?? null;
    if (facet === 'breaks:lines') return step.breaks?.blocks?.map((b) => b.lines) ?? [];
    if (facet === 'blocksCount') return step.blocks?.blocks?.length ?? 0;
    if (facet.startsWith('text:')) return step.fingerprint?.counts?.[facet.slice(5)] ?? 0;
    if (facet.startsWith('selection:')) return step.selection?.[facet.slice(10)] ?? null;
    if (facet.startsWith('state:')) {
      // `state:<selector>` 优先读**具名选择器命中数**（stateAttrs.named），
      // 退回扁平属性名（ariaExpandedTrue / dialogCount / dataWhatinput…）。
      const k = facet.slice(6);
      const sa = step.stateAttrs || {};
      if (sa.named && Object.prototype.hasOwnProperty.call(sa.named, k)) return sa.named[k];
      return sa[k] ?? null;
    }
    if (facet === 'indentLevel') {
      // 光标所在块的缩进级数（两侧载体不同、已归一到"级"）。
      // 取不到光标块时退回"最深的非零级"，好过静默给 0。
      const ind = step.indent;
      if (!ind) return null;
      if (ind.cursorLevel != null) return ind.cursorLevel;
      return (ind.levels || []).reduce((m, x) => (x > m ? x : m), 0);
    }
    if (facet.startsWith('attr:')) {
      const k = facet.slice(5);
      const a = step.attrs?.[k];
      return a == null ? null : (a.placeholder ?? a.role ?? JSON.stringify(a));
    }
    return null;
  };

  const out = [];
  for (const e of list) {
    const step = pick(e);
    const actual = actualOf(e.facet, step);
    let pass = false;
    switch (e.op) {
      case 'equals':
        pass = JSON.stringify(actual) === JSON.stringify(e.value);
        break;
      case 'contains':
        pass = typeof actual === 'string' ? actual.includes(String(e.value))
          : Array.isArray(actual) ? actual.some((x) => String(x).includes(String(e.value)))
          : false;
        break;
      case 'count':
        pass = Number(actual) === Number(e.value);
        break;
      case 'gt':
        pass = Number(actual) > Number(e.value);
        break;
      case 'lt':
        pass = Number(actual) < Number(e.value);
        break;
      case 'exists':
        // 「在场」：非 null、非空串、非空数组、非零。用于**两侧取值不同但都存在**的东西。
        pass = !(actual == null || actual === 0 || actual === '' || (Array.isArray(actual) && actual.length === 0));
        break;
      case 'absent':
        pass = actual == null || actual === 0 || (Array.isArray(actual) && actual.length === 0) || actual === '';
        break;
      default:
        pass = false;
    }
    out.push({ facet: e.facet, op: e.op, at: typeof e.at === 'number' ? e.at : null, expected: e.value ?? null, actual, pass });
  }
  return out;
}

/**
 * **原子观测**：一次 `page.evaluate` 把全部面一起取回。
 *
 * ★ 为什么必须有它（Wave 0 自查发现的仪器缺陷）：
 *   旧版把 fingerprint / textNodes / state / blocks 拆成**多次** `page.evaluate`，
 *   两次调用之间页面可以继续渲染 ⇒ 采到**自相矛盾**的记录。
 *   实测样本（smoke-02 · local）：`counts.插入 = 0`（指纹说菜单没开）
 *   而同一份 `textNodes` 里有 4 条「插入…」（名册说菜单开着）—— 两个面来自不同时刻。
 *   ⇒ 观测必须原子：同一次求值里取完，页面没有机会在中间变。
 */
/**
 * 按键消费探针 - 加性档 keys。
 *
 * 为什么需要它 - Wave 1 实测的仪器缺口。
 *   Ctrl+Left 在两侧都让光标移动了同样的字符数，但官方把键消费掉了，本地没有。
 *   两侧对这个键归谁的判断不同，而这在块名册/选区偏移里看不出来。
 *
 * 记法：capture 与 bubble 两处各挂一个 window 监听。同一次 keydown 在 bubble 处缺失
 *   即为中途被 stopPropagation；在 bubble 处 defaultPrevented=true 即为被 preventDefault。
 *   两种都算被消费。
 *
 * 只记带 Ctrl/Alt 的 keydown：typeKeys 会产出大量纯字母 keydown，
 *   与组合键归谁这件事无关，混进来只会淹掉判据。
 */
export function installKeyProbe() {
  if (window.__ilabKeyProbe) return 'already';
  window.__ilabKeyProbe = true;
  window.__ilabKeys = [];
  const mk = (phase) => (e) => {
    if (!e.ctrlKey && !e.altKey) return;
    window.__ilabKeys.push({ phase, key: e.key, prevented: !!e.defaultPrevented });
  };
  window.addEventListener('keydown', mk('cap'), true);
  window.addEventListener('keydown', mk('bub'), false);
  return 'installed';
}

/** 读走并清空按键名册，与其它面同一次求值，故原子。 */
function readKeys() {
  const raw = window.__ilabKeys || [];
  window.__ilabKeys = [];
  const byKey = new Map();
  for (const r of raw) {
    if (!byKey.has(r.key)) byKey.set(r.key, { key: r.key, cap: 0, bub: 0, prevented: false });
    const e = byKey.get(r.key);
    if (r.phase === 'cap') e.cap += 1; else e.bub += 1;
    if (r.phase === 'bub' && r.prevented) e.prevented = true;
  }
  return [...byKey.values()].map((e) => ({ key: e.key, consumed: e.bub === 0 || e.prevented }));
}
export function captureAll(arg) {
  const a = arg || {};
  const texts = a.texts || [];
  const limit = a.textLimit || 4000;

  // 列表摊平（一行一块）：命中的根若是 UL/OL，展开到每个 li 的首个文本块（递归嵌套）。
  // ★ 两侧文档模型不同：官方是扁平块名册（每个列表项各是一条 `blockrowwrap-*`），
  //   本地是树（一个 `<ul>` 包住所有项）。不摊平就是官方两块、本地一块 ⇒ 假红。
  const flatten = (rootSel) => {
    const out2 = [];
    const pushList = (listEl) => {
      for (const li of Array.from(listEl.children)) {
        if (li.tagName !== 'LI') continue;
        const tb = Array.from(li.children).find((c) => /^(P|H1|H2|H3|H4|H5|H6|DIV)$/.test(c.tagName));
        if (tb) out2.push(tb);
        for (const sub of Array.from(li.children)) {
          if (sub.tagName === 'UL' || sub.tagName === 'OL') pushList(sub);
        }
      }
    };
    for (const el of Array.from(document.querySelectorAll(rootSel))) {
      if (el.tagName === 'UL' || el.tagName === 'OL') pushList(el);
      else out2.push(el);
    }
    return out2;
  };

  // ── 指纹 ──
  const hay = (document.body && document.body.innerText) || '';
  const counts = {};
  for (const t of texts) {
    let n = 0;
    let i = 0;
    while ((i = hay.indexOf(t, i)) !== -1) {
      n += 1;
      i += t.length;
    }
    counts[t] = n;
  }
  const fingerprint = {
    url: location.href,
    title: document.title,
    domLength: document.documentElement.outerHTML.length,
    bodyTextLength: hay.length,
    counts,
  };

  // ── 文本名册 ──
  const out = [];
  const seen = new Map();
  const walk = (node) => {
    if (!node) return;
    if (node.nodeType === 3) {
      const v = (node.nodeValue || '').trim();
      if (v) {
        const k = seen.get(v) || 0;
        seen.set(v, k + 1);
        out.push(k === 0 ? v : v + '#' + k);
      }
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
    for (const child of el.childNodes) walk(child);
  };
  walk(document.body);

  // ── 状态属性 ──
  const sel = a.stateSelectors || [];
  const countBy = (attr) => {
    const nodes = document.querySelectorAll('[' + attr + ']');
    const tally = {};
    for (const n of nodes) {
      const v = n.getAttribute(attr) || '';
      tally[v] = (tally[v] || 0) + 1;
    }
    return { total: nodes.length, tally };
  };
  const html = document.documentElement;
  const named = {};
  for (const x of sel) {
    // x 既可是选择器串（旧口径），也可是 {key, selector}（新口径：expect 按 key 查）
    if (x && typeof x === 'object') named[x.key] = x.selector ? document.querySelectorAll(x.selector).length : null;
    else named[x] = document.querySelectorAll(x).length;
  }
  const stateAttrs = {
    dataState: countBy('data-state'),
    dataWhatinput: html.getAttribute('data-whatinput'),
    dataWhatintent: html.getAttribute('data-whatintent'),
    ariaExpandedTrue: document.querySelectorAll('[aria-expanded="true"]').length,
    ariaSelectedTrue: document.querySelectorAll('[aria-selected="true"]').length,
    ariaPressedTrue: document.querySelectorAll('[aria-pressed="true"]').length,
    dialogCount: document.querySelectorAll('[role="dialog"],[role="menu"],[role="listbox"]').length,
    named,
  };

  // ── 选区 ──
  const selection = (() => {
    const s = window.getSelection();
    if (!s || s.rangeCount === 0) return { present: false };
    const blockOf = (node) => {
      let el = node && node.nodeType === 3 ? node.parentElement : node;
      while (el) {
        if (el.hasAttribute && el.hasAttribute('data-block-id')) return el.getAttribute('data-block-id');
        el = el.parentElement;
      }
      return null;
    };
    const indexOf = (node) => {
      let el = node && node.nodeType === 3 ? node.parentElement : node;
      while (el && el.parentElement) {
        const sib = el.previousElementSibling;
        let n = 0;
        let p = sib;
        while (p) {
          n += 1;
          p = p.previousElementSibling;
        }
        if (el.parentElement.classList && el.parentElement.classList.contains('ProseMirror')) return n;
        el = el.parentElement;
      }
      return null;
    };
    return {
      present: true,
      collapsed: s.isCollapsed,
      text: (s.toString() || '').slice(0, 200),
      anchorBlock: blockOf(s.anchorNode),
      focusBlock: blockOf(s.focusNode),
      anchorOffset: s.anchorOffset,
      focusOffset: s.focusOffset,
      anchorChildIndex: indexOf(s.anchorNode),
    };
  })();

  // ── 块名册（列表摊平：一行一块，见 flatten） ──
  let blocks = null;
  if (a.blockRoot) {
    const els = flatten(a.blockRoot);
    blocks = {
      found: els.length,
      blocks: els.map((el) => ({
        tag: el.tagName.toLowerCase(),
        blockId:
          el.getAttribute('data-block-id') ||
          (el.id && el.id.startsWith('blockrowwrap-') ? el.id.slice('blockrowwrap-'.length) : null) ||
          (el.id && el.id.startsWith('blockwrap-') ? el.id.slice('blockwrap-'.length) : null),
        isTitle: el.getAttribute('data-testid') === 'editor-title',
        // 行首圆点两侧画法不同（官方文本节点 / 本地 CSS list-style）⇒ 都剥掉，见 captureBlocks 注释。
        text: (el.innerText || '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/^[•·●◦▪▫‣⁃]+[ \t]*/, '')
          .slice(0, 120),
      })),
    };
  }

  // ── 块内换行（breaks）──
  //  动机：块名册（blocks）把空白压成空格 ⇒ **块内软换行 / <br> 在名册里不可见**。
  //  官方 `Shift+Enter` 实测插入行内换行（`<br>` 0→1、文本 `AAA\n\uFEFF\n`），名册两侧都读 "AAA"。
  //  ⇒ 单列一档：逐块给 `<br>` 计数与**不压空白**的行数。
  let breaks = null;
  if (a.blockRoot) {
    const els2 = flatten(a.blockRoot);
    breaks = {
      found: els2.length,
      totalBr: els2.reduce((n, el) => n + el.querySelectorAll('br').length, 0),
      blocks: els2.map((el) => {
        const raw = el.innerText || '';
        return {
          br: el.querySelectorAll('br').length,
          lines: raw.split(/\n/).filter((s) => s.trim() !== '').length,
          text: raw.replace(/\uFEFF/g, '').replace(/\n/g, '|').slice(0, 60),
        };
      }),
    };
  }
  // ── 属性面 ──
  let attrs = null;
  if (a.attrProbes && a.attrProbes.length) {
    attrs = {};
    for (const p of a.attrProbes) {
      const el = p.selector ? document.querySelector(p.selector) : null;
      if (!el) {
        attrs[p.key] = null;
        continue;
      }
      const rec = {};
      for (const at of p.attrs || ['placeholder']) rec[at] = el.getAttribute(at);
      rec._tag = el.tagName.toLowerCase();
      attrs[p.key] = rec;
    }
  }

  // ── 缩进级数（G218）：两侧载体不同，归一到"级" ──
  //   ① 官方：变量载体是一个**同层并列**的标记元素《<div class="_indent_1oz2o_33" style="--indent-w: 28px">》，
  //      它与块行同在 `div._flexRow_1oz2o_1` 下 ⇒ 沿祖先链**找不到**（旧版因此恒读 0）。
  //      改成「标记 → 属主块」归位：先收全树所有非零标记，再为每个标记向上找
  //      **只包含一个块根**的最近祖先 ⇒ 那个块根即属主。标记是祖先、同层兄弟还是后代都能归位。
  //   ② 本地：无 `--indent-w`（纯核 `src/lib/editor/block-indent.ts` 零消费者）⇒ 载体是
  //      **列表嵌套档**（`ul`/`ol` 层数，最外层不计）。两者都是"缩进一级 28px"的同一件事，故归一。
  let indent = null;
  if (a.blockRoot) {
    const STEP = 28;
    const varByBlock = new Map();
    for (const m of document.querySelectorAll('*')) {
      const v = parseFloat(getComputedStyle(m).getPropertyValue('--indent-w'));
      if (Number.isNaN(v) || v <= 0) continue;
      let q = m;
      let hops = 0;
      let owner = null;
      while (q && hops < 12) {
        const inner = q.querySelectorAll(a.blockRoot);
        if (inner.length === 1) { owner = inner[0]; break; }
        if (inner.length > 1) break; // 再往上就跨块 ⇒ 停
        q = q.parentElement;
        hops += 1;
      }
      if (owner) varByBlock.set(owner, Math.max(varByBlock.get(owner) || 0, Math.round(v / STEP)));
    }
    const nestLevelOf = (el) => {
      let n = 0;
      let q = el;
      while (q && q !== document.body) {
        const tag = q.tagName;
        if (tag === 'UL' || tag === 'OL') n += 1;
        q = q.parentElement;
      }
      // 最外层列表不算缩进：顶层列表项 = 0 级（与官方 --indent-w 口径对齐）
      return Math.max(0, n - 1);
    };
    const els = flatten(a.blockRoot);
    // ★ 光标块要从**摊平后的名册**里找，不能沿选择器往上爬：
    //   本地列表里往上爬会先撞到**最外层 `<ul>`**（它正好是 `.ProseMirror > *`）
    //   ⇒ 永远读成 0 级（实测：子项已缩进、cursorLevel 仍为 0）。
    //   改成在 `els`（摊平后的行名册）里找**包住光标那一行**。
    const s2 = window.getSelection();
    let cursorLevel = null;
    if (s2 && s2.rangeCount) {
      const anchor = s2.anchorNode;
      const hit = els.find((el) => el && anchor && el.contains(anchor));
      if (hit) cursorLevel = varByBlock.get(hit) || nestLevelOf(hit);
    }
    indent = {
      found: els.length,
      levels: els.map((el) => varByBlock.get(el) || nestLevelOf(el)),
      modes: els.map((el) => (varByBlock.has(el) ? 'var' : nestLevelOf(el) ? 'nest' : 'none')),
      varMarks: varByBlock.size,
      cursorLevel,
    };
  }

  // ── 焦点面（Wave 1 新增）──
  //   为什么要有它：有类键失效时**焦点会逃出编辑器**，而键自己不改 DOM
  //   ⇒ 只看块名册会读成"无反应"，实则是"键被浏览器接管、光标跑了"。
  //   实测样本（wave1 本地 Tab#2）：activeElement 从 `.ProseMirror` 变成 `nextjs-portal`，
  //   再变 `body`、再变一枚按钮 —— 而官方 Tab#2 仍在编辑器内。
  const focus = (() => {
    const ae = document.activeElement;
    if (!ae) return { tag: null, inEditor: false };
    // 宿主由 spec 传入（两侧不同：官方 `[data-testid="editor-body"]` / 本地 `.ProseMirror`），
    // 没传就退回两个常见候选。
    const host = (a.focusHost ? document.querySelector(a.focusHost) : null) || document.querySelector('.ProseMirror') || document.querySelector('[data-testid="editor-body"]') || document.querySelector('[contenteditable="true"]') || null;
    return {
      tag: ae.tagName.toLowerCase(),
      id: ae.id || null,
      cls: String(ae.className || '').slice(0, 60),
      inEditor: !!(host && (ae === host || host.contains(ae))),
      editable: ae.getAttribute ? ae.getAttribute('contenteditable') : null,
    };
  })();

  return {
    kinds: (() => {
      // ★ 加性档：块**语义档**面（markdown 输入规则的唯一判据）。
      //   为什么必须有它：官方块行的 tag **恒为 `span`**（Slate 扁平渲染）⇒ 只看 tag 会把官方
      //   所有 markdown 转换读成"没反应"（实测 probe-w1an：`# ` 之后官方仍 `span`，只有字号变了）。
      //   两侧的"类型"信号不同：官方在**后代**上（`data-task-schedule-anchor` 判任务、leaf 的
      //   字号/字重判标题档、行首记号 `• `／`N. ` 判列表），本地在**标签/祖先**上（`h1..h4`、
      //   `li` 的父是 UL/OL、`input[type=checkbox]`）。本档把两者归一到**同一枚举**，故可比。
      //   ☆ 与 `indent` 档同一先例（两侧载体不同、归一到"级"再比）。
      //   ☆ 诚实边界：官方**折叠块**（`+ `）在本档无可靠信号（与任务块同为 svg=1、无独有 data-*）
      //     ⇒ 该档两侧都落 `para`，**本档不区分**；已在 spec 注释里登记，不写成"一致"。
      const root = a.blockRoot ? a.blockRoot : null;
      const els = root ? flatten(root) : [];
      const norm = (el) => {
        if (!el) return null;
        // 任务：官方是后代锚点，本地是 checkbox 或 li[data-checked]
        if (el.querySelector && el.querySelector("[data-task-schedule-anchor], [data-task-deadline-anchor]")) return "task";
        if (el.querySelector && el.querySelector("input[type=checkbox], [role=checkbox]")) return "task";
        const t = el.tagName.toLowerCase();
        if (t === "h1") return "title";
        if (t === "h2") return "subtitle";
        if (t === "h3") return "heading";
        if (t === "h4") return "heading4";
        // 列表：本地看 li 的父容器；官方看行首记号（圆点/序号画进文本节点）
        const li = el.closest ? el.closest("li") : null;
        if (li) {
          const par = li.parentElement;
          const dt = par && par.getAttribute ? par.getAttribute("data-type") : null;
          if (dt === "taskList" || (li.getAttribute && li.getAttribute("data-checked") != null)) return "task";
          if (par && par.tagName === "OL") return "numbered";
          return "bullet";
        }
        const leaf = (el.matches && el.matches('[data-slate-node="text"]')) ? el : (el.querySelector ? el.querySelector('[data-slate-node="text"]') : null);
        const txt = (el.innerText || "").replace(/\s+/g, " ").trim();
        // ★ 空列表项的行首记号**后面没有空格**（官方实测 innerText 就是 "•"／"1."）
        //   ⇒ 判据必须允许"记号后直接结束"，否则空列表项一律落 para（本批踩到）。
        if (/^[•·●◦▪▫‣⁃](\s|$)/.test(txt)) return "bullet";
        if (/^\d+\.(\s|$)/.test(txt)) return "numbered";
        const cs = leaf ? getComputedStyle(leaf) : null;
        if (cs) {
          const fs = parseFloat(cs.fontSize);
          const fw = cs.fontWeight;
          if (fs >= 23 && fw === "700") return "title";
          if (fs >= 20 && fw === "700") return "subtitle";
          if (fs >= 18 && fw === "600") return "heading";
          if (fs >= 16 && fw === "700") return "strong";
        }
        return "para";
      };
      return els.map(norm);
    })(),
    marquee: (() => {
      // ★ 加性档：框选面（矩形 ＋ 选中集）。只在 spec 声明 keys/selection 之外单独要时才有值。
      //   判据口径照 G1138：选中看 role=checkbox 的 aria-checked，**不看** `_isActive_`（静止态也有）。
      const rb = document.querySelector('[class*="rubberBand"], [class*="rubber"]');
      let rect = null;
      if (rb) {
        const r = rb.getBoundingClientRect();
        const st = getComputedStyle(rb);
        rect = {
          cls: String(rb.className || '').slice(0, 80),
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          pos: st.position, bg: st.backgroundColor, border: st.borderTopStyle + ' ' + st.borderTopWidth + ' ' + st.borderTopColor,
          radius: st.borderRadius, z: st.zIndex, pe: st.pointerEvents,
        };
      }
      const cbs = Array.from(document.querySelectorAll('[role=checkbox]'));
      const checked = cbs.filter((el) => el.getAttribute('aria-checked') === 'true');
      return {
        rect,
        checkboxTotal: cbs.length,
        checkedCount: checked.length,
        checkedOwners: checked.map((el) => { const o = el.closest('[data-item-id]'); return o ? o.getAttribute('data-item-id') : null; }).slice(0, 12),
        itemIdCount: document.querySelectorAll('[data-item-id]').length,
      };
    })(),
    focus, fingerprint, textNodes: out.slice(0, limit), stateAttrs, selection, blocks, breaks, attrs, indent, keys: (() => {
      // ★ 内联（不能调 readKeys：见上面注释）
      const raw = window.__ilabKeys || [];
      window.__ilabKeys = [];
      const byKey = new Map();
      for (const r of raw) {
        if (!byKey.has(r.key)) byKey.set(r.key, { key: r.key, cap: 0, bub: 0, prevented: false });
        const e = byKey.get(r.key);
        if (r.phase === "cap") e.cap += 1; else e.bub += 1;
        if (r.phase === "bub" && r.prevented) e.prevented = true;
      }
      return [...byKey.values()].map((e) => ({ key: e.key, consumed: e.bub === 0 || e.prevented }));
    })() };
}

/** 独立的缩进级数采集（want 面 `indent` 用；与 captureAll 里的同一口径）。 */
export function captureIndent(arg) {
  const rootSel = (arg && arg.root) || null;
  if (!rootSel) return null;
  const STEP = 28;
  const flatten = (rs) => {
    const out2 = [];
    const pushList = (listEl) => {
      for (const li of Array.from(listEl.children)) {
        if (li.tagName !== 'LI') continue;
        const tb = Array.from(li.children).find((c) => /^(P|H1|H2|H3|H4|H5|H6|DIV)$/.test(c.tagName));
        if (tb) out2.push(tb);
        for (const sub of Array.from(li.children)) {
          if (sub.tagName === 'UL' || sub.tagName === 'OL') pushList(sub);
        }
      }
    };
    for (const el of Array.from(document.querySelectorAll(rs))) {
      if (el.tagName === 'UL' || el.tagName === 'OL') pushList(el);
      else out2.push(el);
    }
    return out2;
  };
  const varByBlock = new Map();
  for (const m of document.querySelectorAll('*')) {
    const v = parseFloat(getComputedStyle(m).getPropertyValue('--indent-w'));
    if (Number.isNaN(v) || v <= 0) continue;
    let q = m;
    let hops = 0;
    let owner = null;
    while (q && hops < 12) {
      const inner = q.querySelectorAll(rootSel);
      if (inner.length === 1) { owner = inner[0]; break; }
      if (inner.length > 1) break;
      q = q.parentElement;
      hops += 1;
    }
    if (owner) varByBlock.set(owner, Math.max(varByBlock.get(owner) || 0, Math.round(v / STEP)));
  }
  const nestLevelOf = (el) => {
    let n = 0;
    let q = el;
    while (q && q !== document.body) {
      const tag = q.tagName;
      if (tag === 'UL' || tag === 'OL') n += 1;
      q = q.parentElement;
    }
    return Math.max(0, n - 1);
  };
  const els = flatten(rootSel);
  // 同 captureAll：光标块从摊平后的名册里找，不沿选择器往上爬。
  const s2 = window.getSelection();
  let cursorLevel = null;
  if (s2 && s2.rangeCount) {
    const anchor = s2.anchorNode;
    const hit = els.find((el) => el && anchor && el.contains(anchor));
    if (hit) cursorLevel = varByBlock.get(hit) || nestLevelOf(hit);
  }
  return { found: els.length, levels: els.map((el) => varByBlock.get(el) || nestLevelOf(el)), modes: els.map((el) => (varByBlock.has(el) ? 'var' : nestLevelOf(el) ? 'nest' : 'none')), cursorLevel };
}