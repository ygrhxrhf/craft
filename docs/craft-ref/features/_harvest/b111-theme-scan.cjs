const fs = require('fs');
const src = fs.readFileSync('js/CodeEditorWrapper-DB8UxA00.js', 'utf8');
const ID = '[\\w$]+';
const out = [];
const w = (s) => { out.push(s); };
const esc = (n) => n.replace(/\$/g, '\\$');

// 1) picker roster V
const V = [];
const vre = new RegExp('\\{id:"([a-z]+)",label:"([^"]*)",keywords:\\[([^\\]]*)\\],isDark:(!0|!1),settings:(' + ID + ')\\}', 'g');
let m;
while ((m = vre.exec(src))) V.push({ id: m[1], label: m[2], keywords: m[3], isDark: m[4] === '!0', ref: m[5] });

// 2) factory roster ue  (id -> result var)
const ueMatch = src.match(new RegExp(ID + '=\\{auto:null,[^}]*\\}'));
const ue = {};
for (const kv of ueMatch[0].replace(new RegExp('^' + ID + '='), '').slice(1, -1).split(',')) {
  const [k, v] = kv.split(':'); if (k && v) ue[k] = v;
}

// 3) result var -> factory fn name  ( Mo=Lo(), const $o=qo() )
const callMap = {};
const cre = new RegExp('(?:const )?((' + ID + ')=((?:function )?' + ID + '\\(\\))|(' + ID + ')=(' + ID + ')\\(\\))', 'g');
while ((m = cre.exec(src))) { if (m[2] && m[3]) callMap[m[2]] = m[3]; else if (m[4] && m[5]) callMap[m[4]] = m[5]; }
const cre2 = new RegExp(ID + '=' + ID + '\\(\\)', 'g');
while ((m = cre2.exec(src))) { const [a, b] = m[0].split('='); callMap[a] = b.replace('()', ''); }

// 4) factory bodies at each destructure site (arrow OR function form)
function balanced(from, open, close, cap) {
  let depth = 0;
  for (let i = from; i < src.length && i < from + cap; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}
const byFn = {};
const TAIL = ';{0,1}return (\\w+)\\(\\{theme:t,settings:\\{\\.\\.\\.(' + ID + '),\\.\\.\\.a\\},styles:\\[';
const HEAD = 'const\\{theme:t="(\\w+)",settings:a=\\{\\},styles:r=\\[\\]\\}=\\{\\}';
const arrow = new RegExp('(' + ID + ')=(' + ID + ')=>\\{' + HEAD + TAIL, 'g');
const decl = new RegExp('function (' + ID + ')\\((' + ID + ')?\\)\\{' + HEAD + TAIL, 'g');
const oddTails = [];
const noName = [];
for (const [re, kind] of [[arrow, 'arrow'], [decl, 'function']]) {
  let mm;
  while ((mm = re.exec(src))) {
    const arrStart = re.lastIndex - 1;
    const arrEnd = balanced(arrStart, '[', ']', 24000);
    if (arrEnd < 0) { oddTails.push(mm[1] + ' :: styles 数组括号不配平'); continue; }
    const tags = (src.slice(arrStart + 1, arrEnd).match(/tag:/g) || []).length;
    byFn[mm[1]] = { param: mm[2], themeLit: mm[3], builder: mm[4], settingsObj: mm[5], tags, kind };
    re.lastIndex = arrEnd + 1;
  }
}
if (oddTails.length) w('### 形状不符的工厂尾串（逐字，共 ' + oddTails.length + '）');
for (const o of oddTails) w('⇒ ' + o);

// 5) alias chain + settings object fields (allow `const ` / `let ` prefix)
function resolve(name) {
  const seen = [];
  let cur = name;
  for (let i = 0; i < 6; i++) {
    seen.push(cur);
    const mm = src.match(new RegExp('[\\s,;(]' + esc(cur) + '=(' + ID + ')[,;}]'));
    if (!mm || mm[1].startsWith('{')) break;
    cur = mm[1];
  }
  return { canon: cur, hops: seen.length > 1 ? seen : [] };
}
function settingsFields(name) {
  const re = new RegExp('[\\s,;(]' + esc(name) + '=\\{');
  const mm = src.match(re);
  if (!mm) return null;
  const start = mm.index + mm[0].length - 1;
  const end = balanced(start, '{', '}', 6000);
  if (end < 0) return null;
  const body = src.slice(start + 1, end);
  const pick = (k) => { const x = body.match(new RegExp('(?:^|,)' + k + ':"((?:[^"\\\\]|\\\\.)*)"')); return x ? x[1] : null; };
  return {
    background: pick('background'), foreground: pick('foreground'), caret: pick('caret'),
    selection: pick('selection'), gutterBackground: pick('gutterBackground'), gutterForeground: pick('gutterForeground'),
    gutterBorder: pick('gutterBorder'), fontFamily: pick('fontFamily'), keys: (body.match(/[A-Za-z]+:/g) || []).length,
  };
}

w('### V=' + V.length + '  ue=' + Object.keys(ue).length + '  工厂解析=' + Object.keys(byFn).length + '  callMap=' + Object.keys(callMap).length);
w('### arrow.source=' + arrow.source);
w('');
w('| # | id | label | keywords | isDark | V.settings | 别名链 | 结果变量=工厂() | 工厂形状 | 工厂内 settings 源 | 两表同一对象? | theme 字面量 | tag 数 | background | foreground | caret | selection | gutterBackground | gutterForeground | gutterBorder | fontFamily | settings 键数 | 底色亮度 | 三者一致性 |');
w('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (let i = 0; i < V.length; i++) {
  const e = V[i];
  const r = resolve(e.ref);
  const fv = ue[e.id];
  const fn = fv ? callMap[fv] : null;
  const fac = fn ? byFn[fn] : null;
  let same = 'n/a';
  if (e.id === 'auto') same = 'auto→null';
  else if (!fac) same = 'FACTORY-MISS';
  else same = (resolve(fac.settingsObj).canon === r.canon) ? 'YES' : 'NO(' + resolve(fac.settingsObj).canon + '≠' + r.canon + ')';
  const s = settingsFields(r.canon) || {};
  const lum = (hex) => {
    if (!hex || !/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(hex)) return null;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)).toFixed(1);
  };
  const L = lum(s.background);
  const bgDark = L === null ? '?' : (parseFloat(L) < 128 ? '暗' : '亮');
  const litDark = fac ? (fac.themeLit === 'dark' ? '暗' : '亮') : '-';
  const isD = e.isDark ? '暗' : '亮';
  const verdict = e.id === 'auto' ? 'auto 不入表' : (bgDark === '?' ? '底色非 6 位十六进制，不判' :
    (bgDark === litDark && bgDark === isD ? '三者一致' : '不一致：底色' + bgDark + '／字面量' + litDark + '／isDark' + isD));
  w('| ' + [i + 1, e.id, e.label, '[' + e.keywords + ']', e.isDark, e.ref,
    r.hops.length ? r.hops.join('→') : '=自身',
    fv && fn ? fv + ' = ' + fn + '()' : (fv ? fv + ' = ?()' : 'null'),
    fac ? fac.kind : '-', fac ? fac.settingsObj : '-', same, fac ? '"' + fac.themeLit + '"' : '-', fac ? fac.tags : '-',
    s.background ?? '?', s.foreground ?? '?', s.caret ?? '-', s.selection ?? '-', s.gutterBackground ?? '-',
    s.gutterForeground ?? '-', s.gutterBorder ?? '-', s.fontFamily ?? '?', s.keys ?? '-', L ?? '-', verdict].join(' | ') + ' |');
}
// aggregation over the 20 real palettes (auto excluded)
function rawKeysOf(name) {
  const mm = src.match(new RegExp('[\\s,;(]' + esc(name) + '=\\{'));
  if (!mm) return [];
  const st = mm.index + mm[0].length - 1;
  const en = balanced(st, '{', '}', 6000);
  return (src.slice(st + 1, en).match(/(?:^|,)([A-Za-z]+):/g) || []).map((x) => x.replace(/[,:]/g, ''));
}
const tally = (bucket, val) => { const k = val === null || val === undefined ? '(无此键)' : val; bucket[k] = (bucket[k] || 0) + 1; };
const agg = { gutterBorder: {}, fontFamily: {}, caret: {}, keyCount: {}, keyPresence: {} };
for (const e of V) {
  if (e.id === 'auto') continue;
  const canon = resolve(e.ref).canon;
  const s = settingsFields(canon) || {};
  tally(agg.gutterBorder, s.gutterBorder);
  tally(agg.fontFamily, s.fontFamily);
  tally(agg.caret, s.caret);
  const ks = rawKeysOf(canon);
  agg.keyCount[ks.length] = (agg.keyCount[ks.length] || 0) + 1;
  for (const k of ks) agg.keyPresence[k] = (agg.keyPresence[k] || 0) + 1;
}
w('');
w('### 聚合（20 档，auto 除外）');
w('⇒ gutterBorder 取值分布＝' + JSON.stringify(agg.gutterBorder));
w('⇒ fontFamily 取值分布＝' + JSON.stringify(agg.fontFamily));
w('⇒ caret 分布＝' + JSON.stringify(agg.caret));
w('⇒ 每档 settings 键数分布＝' + JSON.stringify(agg.keyCount));
const perKey = Object.entries(agg.keyPresence).map(([k, n]) => k + '=' + n + '/20').sort((a, b) => parseInt(b.split('=')[1]) - parseInt(a.split('=')[1]));
w('⇒ 每个键在 20 档里出现的档数＝' + perKey.join('、'));
fs.writeFileSync('b111-themes.txt', out.join('\n') + '\n');
console.log(out.filter(l => l.startsWith('###') || l.startsWith('⇒')).join('\n'));
console.log('rows: ' + V.length + '  bytes: ' + fs.statSync('b111-themes.txt').size);
