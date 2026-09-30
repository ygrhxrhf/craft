import fs from 'node:fs';

const d = 'D:/code/cs/docs/craft-ref/features/';
const memPath = 'C:/Users/omen/.qoder-cn/projects/D--code-cs/memory/project-craft-official-model-facts.md';
const batch = process.argv[2];
const [fromRows, toRows, gFrom, gTo, bFrom] = process.argv.slice(3);

const raw = fs.readFileSync(d + '_harvest/b' + batch + '.txt', 'utf8');
const seg = {};
let cur = null;
for (const line of raw.split('\n')) {
  if (line.startsWith('@@')) { cur = line.slice(2).trim(); seg[cur] = ''; continue; }
  if (cur) seg[cur] += line + '\n';
}
for (const k of ['SEC', 'GAP', 'NAV', 'LOG', 'MEM']) {
  if (!(seg[k] || '').trim()) { console.log('SEGMENT MISSING: ' + k); process.exit(1); }
}

let fails = 0;
if ((seg.FIX || '').trim()) {
  for (const line of seg.FIX.split('\n')) {
    const parts = line.split(' ||| ');
    if (parts.length !== 3) { if (line.trim()) console.log('BAD FIX: ' + line.slice(0, 40)); continue; }
    const [file, oldT, newT] = parts;
    const path = file === 'features.md' || file === 'gap.md' || file === 'model.md' ? d + file : d + file;
    let s = fs.readFileSync(path, 'utf8');
    const n = s.split(oldT).length - 1;
    if (n === 0) { console.log('FIX MISS: ' + file + ' :: ' + oldT.slice(0, 40)); fails++; continue; }
    s = s.split(oldT).join(newT);
    fs.writeFileSync(path, s);
    console.log('FIX ok x' + n + ' ' + file + ' :: ' + oldT.slice(0, 32));
  }
}
const rep = (s, re, to, label) => {
  const hits = s.match(re);
  if (!hits || hits.length !== 1) { console.log('MISS ' + label + ' hits=' + (hits ? hits.length : 0)); fails++; return s; }
  return s.replace(re, to);
};
const appendIfNew = (path, text, guard, label) => {
  let s = fs.readFileSync(path, 'utf8').replace(/\n*$/, '\n');
  if (s.includes(guard)) { console.log('DUP ' + label); process.exit(1); }
  fs.writeFileSync(path, s + '\n' + text.replace(/^\n+/, '') + '\n');
};

appendIfNew(d + 'model.md', seg.SEC, seg.SEC.trim().split('\n')[0], 'model');
appendIfNew(d + 'gap.md', seg.GAP, seg.GAP.trim().split('\n')[0], 'gap');
appendIfNew(d + '_harvest/todo-actions.md', seg.LOG, '## 第 ' + batch + ' 批', 'log');
appendIfNew(memPath, seg.MEM, '第 ' + batch + ' 批：', 'memory');

let f = fs.readFileSync(d + 'features.md', 'utf8');
f = rep(f, new RegExp('\\*\\*' + fromRows + ' 行（最大 G' + gFrom + '）\\*\\*'), '**' + toRows + ' 行（最大 G' + gTo + '）**', 'rows');
f = rep(f, new RegExp('第 1–' + bFrom + ' 批批次日志'), '第 1–' + batch + ' 批批次日志', 'logcount');
const anchor = '| 本目录完备性的诚实数字';
const i = f.indexOf(anchor);
if (i < 0) { console.log('NAV ANCHOR FAIL'); process.exit(1); }
if (f.includes(seg.NAV.trim().slice(0, 40))) { console.log('NAV DUP'); process.exit(1); }
fs.writeFileSync(d + 'features.md', f.slice(0, i) + seg.NAV.trim() + '\n' + f.slice(i));

console.log(fails ? 'APPLIED with ' + fails + ' anchor misses' : 'APPLIED clean');
