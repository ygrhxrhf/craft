// 解码 minify 后的按键描述符表：{metaKey/ctrlKey/altKey/shiftKey/keyCondition[,winMatcher]}
// 只做词法 + 递归下降解析，绝不 eval 第三方代码。
// 用法: node decode-keymap.mjs <bundle.js> 'Iu={' 'ho={' ...
import fs from 'node:fs';

const file = process.argv[2];
const anchors = process.argv.slice(3);
if (!file || !anchors.length) { console.log('用法: node decode-keymap.mjs <js> "Iu={" "ho={"'); process.exit(1); }
const src = fs.readFileSync(file, 'utf8');

/* 键名常量（Craft 内部把 "ArrowUp" 之类压成短标识符） */
const KEYCONST = { qs: 'Escape', oo: 'Enter', B4: 'Delete', vd: ' ', nc: 'Backspace', f1: 'Tab', ms: 'ArrowDown', Ts: 'ArrowUp', Vl: 'ArrowLeft', Il: 'ArrowRight', XM: 'Home', JM: 'End', uEe: 'Meta', fEe: 'Control', Sae: 'Shift' };
const KEYCTORS = new Set(['Vr', 'Oo', 'q7']);
const KEYNAME = { ' ': 'space', ArrowDown: '↓', ArrowUp: '↑', ArrowLeft: '←', ArrowRight: '→', Enter: '⏎', Backspace: '⌫', Home: '↖', End: '↘', BracketLeft: '[', BracketRight: ']', Slash: '/', Backslash: '\\', Quote: "'", Backquote: '`', Comma: ',', Minus: '-', Tab: '⇥', Escape: 'esc', Delete: 'del' };

function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1, buf = '';
      while (j < s.length && s[j] !== c) { if (s[j] === '\\') { buf += s[j + 1]; j += 2; } else buf += s[j++]; }
      out.push({ t: 'str', v: buf }); i = j + 1; continue;
    }
    if (/[A-Za-z_$]/.test(c)) { let j = i; while (j < s.length && /[\w$]/.test(s[j])) j++; out.push({ t: 'id', v: s.slice(i, j) }); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: 'num', v: Number(s.slice(i, j)) }); i = j; continue; }
    if (c === '!' && s[i + 1] === '0') { out.push({ t: 'bool', v: true }); i += 2; continue; }
    if (c === '!' && s[i + 1] === '1') { out.push({ t: 'bool', v: false }); i += 2; continue; }
    if (c === '=' && s[i + 1] === '>') { out.push({ t: 'arrow' }); i += 2; continue; }
    if ('{}()[]:,;?'.includes(c)) { out.push({ t: c }); i++; continue; }
    if (c === '.' && s[i + 1] === '.' && s[i + 2] === '.') { out.push({ t: 'spread' }); i += 3; continue; }
    i++;
  }
  return out;
}

function parse(toks) {
  let p = 0;
  const is = (t, k = 0) => toks[p + k] && toks[p + k].t === t;
  const eat = t => { if (!is(t)) throw new Error('expected ' + t + ' got ' + JSON.stringify(toks[p])); return toks[p++]; };
  function value() {
    if (is('{')) return obj();
    if (is('[')) return arr();
    if (is('str')) return { kind: 'lit', v: eat('str').v };
    if (is('num')) return { kind: 'lit', v: eat('num').v };
    if (is('bool')) return { kind: 'lit', v: eat('bool').v };
    if (is('id')) {
      const name = eat('id').v;
      if (name === 'void') { if (is('num')) p++; return { kind: 'lit', v: undefined }; }
      if (name === 'true') return { kind: 'lit', v: true };
      if (name === 'false') return { kind: 'lit', v: false };
      if (name === 'null') return { kind: 'lit', v: null };
      if (is('arrow')) { p++; return value(); }          // t=>expr：箭头函数体即我们关心的值
      if (is('(')) return { kind: 'call', name, args: call() };
      if (is('.') && is('id', 1)) { p++; return { kind: 'ref', name: name + '.' + eat('id').v }; }
      return { kind: 'ref', name };
    }
    throw new Error('unexpected ' + JSON.stringify(toks[p]));
  }
  function call() { eat('('); const a = []; while (!is(')')) { a.push(value()); if (is(',')) p++; else break; } eat(')'); return a; }
  function arr() { eat('['); const a = []; while (!is(']')) { a.push(value()); if (is(',')) p++; else break; } eat(']'); return { kind: 'arr', items: a }; }
  function obj() {
    eat('{'); const props = {}; const spread = [];
    while (!is('}')) {
      if (is('spread')) { p++; spread.push(value()); if (is(',')) p++; else break; }
      let key;
      if (is('str')) key = eat('str').v;
      else if (is('id')) key = eat('id').v;
      else if (is('[')) { p++; const k = value(); eat(']'); key = '<computed:' + (k.v ?? '?') + '>'; }
      else { p++; continue; }
      if (is(':')) { p++; props[key] = value(); } else props[key] = { kind: 'ref', name: key };
      if (is(',')) p++; else break;
    }
    eat('}'); return { kind: 'obj', props, spread };
  }
  return { top: value(), rest: p };
}

/* ---- 语义层：与 bundle 里的构建函数一一对应 ---- */
const B = { mac: { metaKey: true }, win: { ctrlKey: true }, s: { shiftKey: true }, a: { altKey: true } };
const NONE = { metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };
const BUILDERS = {
  Vn: kc => ({ ...NONE, keyCondition: kc }),
  mo: kc => ({ ...NONE, keyCondition: kc }),
  qi: kc => ({ ...NONE, shiftKey: true, keyCondition: kc }),
  y2: kc => ({ ...NONE, altKey: true, keyCondition: kc }),
  iEe: kc => ({ ...NONE, ctrlKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, keyCondition: kc } }),
  Co: kc => ({ ...NONE, metaKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, keyCondition: kc } }),
  ci: kc => ({ ...NONE, metaKey: true, shiftKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, shiftKey: true, keyCondition: kc } }),
  zr: kc => ({ ...NONE, metaKey: true, altKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, shiftKey: true, keyCondition: kc } }),
  YM: kc => ({ ...NONE, metaKey: true, altKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, altKey: true, keyCondition: kc } }),
  JI: kc => ({ ...NONE, metaKey: true, shiftKey: true, altKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, altKey: true, keyCondition: kc } }),
  lEe: kc => ({ ...NONE, metaKey: true, shiftKey: true, altKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, shiftKey: true, altKey: true, keyCondition: kc } }),
  eT: kc => ({ ...NONE, shiftKey: true, altKey: true, keyCondition: kc, winMatcher: { ...NONE, shiftKey: true, altKey: true, keyCondition: kc } }),
  yae: kc => ({ ...NONE, metaKey: true, keyCondition: kc, winMatcher: { ...NONE, ctrlKey: true, keyCondition: kc } })
};

function resolve(e) {
  if (!e) return e;
  if (e.kind === 'arr') return e;
  if (e.kind === 'ref') {
    return KEYCONST[e.name] ? { kind: 'kc', name: 'Vr', v: KEYCONST[e.name] } : e;
  }
  if (e.kind === 'lit') return { kind: 'kc', name: 'q7', v: e.v };
  if (e.kind === 'call') {
    if (KEYCTORS.has(e.name)) {
      const a = e.args[0];
      const v = a.kind === 'lit' ? a.v : a.kind === 'ref' ? (KEYCONST[a.name] ?? a.name) : '?';
      return { kind: 'kc', name: e.name, v };
    }
    if (e.name === 'QM') { const inner = resolve(e.args[0]); return { kind: 'qm', inner }; }
    if (BUILDERS[e.name]) { const kc = resolve(e.args[0]); return { kind: 'desc', props: BUILDERS[e.name](kc) }; }
    return { kind: 'unknown', name: e.name };
  }
  if (e.kind === 'obj') {
    const props = {};
    for (const sp of e.spread) { const r = resolve(sp); if (r && r.props) Object.assign(props, r.props); }
    for (const [k, v] of Object.entries(e.props)) {
      if (k === 'keyCondition') props[k] = resolve(v);
      else if (k === 'winMatcher') props[k] = { kind: 'desc', props: flatten(v) };
      else props[k] = v;
    }
    return { kind: 'desc', props };
  }
  return e;
}
function flatten(e) { const r = resolve(e); return r && r.props ? r.props : {}; }
const b = v => (v && v.kind === 'lit' ? !!v.v : v && typeof v === 'object' && v.kind === 'desc' ? false : !!v);

function label(d, platform) {
  if (!d || !d.props) return '?';
  let use = d.props;
  let macOnly = false;
  if (platform === 'win') {
    const wm = use.winMatcher;
    const w = wm && wm.props ? wm.props : (wm && wm.kind === undefined ? wm : null);
    if (w) {
      const wk = w.keyCondition;
      if (wk && wk.kind === 'kc' && wk.name === 'q7' && typeof wk.v === 'object') return '—(Mac 专用)';
      use = { ...use, ...w };
    } else if (wm) return '?';
  }
  const m = { meta: b(use.metaKey), ctrl: b(use.ctrlKey), alt: b(use.altKey), shift: b(use.shiftKey) };
  const parts = platform === 'mac'
    ? [m.meta && '⌘', m.ctrl && '⌃', m.alt && '⌥', m.shift && '⇧']
    : [m.meta && 'Win', m.ctrl && 'Ctrl', m.alt && 'Alt', m.shift && 'Shift'];
  const kc = use.keyCondition;
  let k = '?';
  if (kc && kc.kind === 'kc') {
    const raw = String(kc.v);
    if (kc.name === 'Vr') k = raw.startsWith('Digit') ? raw.slice(5) : raw.startsWith('Key') ? raw.slice(3) : (KEYNAME[raw] ?? raw);
    else if (kc.name === 'Oo') k = raw.toUpperCase();
    else k = KEYNAME[raw] ?? (raw.length === 1 ? raw.toUpperCase() : raw);
  }
  parts.push(k);
  return parts.filter(Boolean).join(platform === 'mac' ? ' ' : '-');
}

const ENUM = {};
for (const a of anchors) {
  if (a === '--bindings') continue;
  const i = src.indexOf(a);
  if (i < 0) { console.log('NOT FOUND: ' + a); continue; }
  const start = i + a.length - 1;
  let parsed;
  try { parsed = parse(tokenize(src.slice(start, start + 14000))); } catch (e) { console.log('# ' + a + ' 解析中断: ' + e.message); continue; }
  const name = a.replace(/[={[]+$/, '');
  const v = parsed.top;
  if (!v.props) { console.log('# ' + name + ' 非对象'); continue; }
  console.log('\n## ' + name + '  (' + Object.keys(v.props).length + ' 项)');
  console.log('id\tmac\twindows\tkeyType');
  ENUM[name] = {};
  for (const [k, e] of Object.entries(v.props)) {
    ENUM[name][k] = e;
    const inner = e.kind === 'obj' && e.props.shortcut ? e.props.shortcut : e; // 兼容 {shortcut: Co(...)} 包裹
    if (inner.kind === 'arr') { console.log(`${k}\t<子表 ${inner.items.length} 项>`); continue; }
    if (inner.kind === 'ref') { console.log(`${k}\t<引用 ${inner.name}>`); continue; }
    const r = resolve(inner);
    if (r.kind === 'qm') { console.log(`${k}\t${label(r.inner, 'mac')} (Mac 专用)`); continue; }
    const kt = r.props?.keyCondition?.name ?? (r.props ? 'obj' : '?');
    console.log(`${k}\t${label(r, 'mac')}\t${label(r, 'win')}\t${kt}`);
  }
}

/* ---------- 绑定分发表：362 条 matcher: 站点 ---------- */
if (anchors.includes('--bindings')) {
  if (!ENUM.ot) ENUM.ot = { ...(ENUM.Iu || {}) };
  const rows = [];
  const re = /\bmatcher:\s*/g; let m;
  while ((m = re.exec(src))) {
    const after = src.slice(m.index + m[0].length, m.index + m[0].length + 120);
    let expr;
    try { expr = parse(tokenize(after)).top; } catch { continue; }
    let desc;
    if (expr.kind === 'ref' && /^\w+\.\w+$/.test(expr.name)) {
      const [en, key] = expr.name.split('.');
      const target = ENUM[en] && ENUM[en][key];
      desc = target ? resolve(target) : null;
      if (!desc) { rows.push(`?\t?\t<未解析 ${expr.name}>`); continue; }
    } else desc = resolve(expr);
    const mac = label(desc, 'mac'), win = label(desc, 'win');
    const win2 = desc.props?.winMatcher ? win : win;
    const ctx = src.slice(m.index - 240, m.index + 500);
    const nm = ctx.match(/getName:\s*\w+\s*=>\s*\w*\(?["']([\w.]{3,50})["']/);
    const id = ctx.match(/\bid:\s*["']([\w.\-:/]{2,40})["']/);
    const when = /\bwhen:/.test(ctx.slice(240)) ? 'when' : '';
    const group = /\bgroup:/.test(ctx.slice(240)) ? 'group' : '';
    rows.push(`${mac}\t${win2}\t${nm ? nm[1] : ''}\t${id ? id[1] : ''}\t${when}${group}`);
  }
  const uniq = new Map();
  for (const r of rows) { const k = r.split('\t').slice(0, 3).join('|'); if (!uniq.has(k)) uniq.set(k, r); }
  console.log('\n## bindings  (' + rows.length + ' 站点 / ' + uniq.size + ' 去重)');
  console.log('mac\twindows\ti18nKey\tid\tflags');
  for (const r of uniq.values()) console.log(r);
}
