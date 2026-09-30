import fs from 'node:fs';
const tsv = fs.readFileSync('_harvest/keymap-full.tsv', 'utf8').split('\n');
const map = new Map();
for (const l of tsv) {
  const c = l.split('\t');
  if (/^[A-Z][A-Z0-9_]{2,}$/.test(c[0]) && c[1]) map.set(c[0], [c[1].replace(/ \(Mac 专用\)$/, ''), c[2] || '']);
}
const md = fs.readFileSync('keyboard.md', 'utf8');
let ok = 0; const bad = []; const miss = [];
const norm = s => s.split('\\').join('').split('**').join('').trim();
for (const l of md.split('\n')) {
  const m = l.match(/^\|\s*([A-Z][A-Z0-9_]{2,})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
  if (!m) continue;
  const [, id, mac, win] = m;
  if (!map.has(id)) { miss.push(id); continue; }
  const [em, ew] = map.get(id);
  if (em === norm(mac) && (!ew || ew === norm(win))) ok++;
  else bad.push(`${id}  md[${norm(mac)} / ${norm(win)}]  tsv[${em} / ${ew}]`);
}
console.log(`解码器 id=${map.size}  md 表行一致=${ok}  不一致=${bad.length}  md 引用但 tsv 无=${miss.length ? miss.join(',') : '无'}`);
for (const b of bad) console.log('  DIFF ' + b);
