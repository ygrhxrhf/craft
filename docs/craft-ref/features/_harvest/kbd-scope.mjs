import fs from 'node:fs';
import path from 'node:path';

const dir = 'js';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const byFile = new Map();
const keyTotal = new Map();
const focusIds = new Map();
let prop = { t: 0, f: 0, none: 0 };
let sites = 0;

for (const f of files) {
  const s = fs.readFileSync(path.join(dir, f), 'utf8');
  const keys = new Map();
  for (const m of s.matchAll(/matcher:\s*([^,;{}()\[\]]{1,44}?(?:\([^)]{0,24}\))?)/g)) {
    const k = m[1].trim().replace(/\s+/g, '');
    if (!k || k === '?') continue;
    keys.set(k, (keys.get(k) || 0) + 1);
    keyTotal.set(k, (keyTotal.get(k) || 0) + 1);
    sites++;
  }
  for (const m of s.matchAll(/pushIntoFocus\(\{\s*id:\s*([^,]{1,40})/g)) {
    const id = m[1].trim();
    focusIds.set(id, (focusIds.get(id) || 0) + 1);
  }
  for (const m of s.matchAll(/allowPropagation:\s*(!1|!0|true|false)/g)) {
    if (m[1] === '!1' || m[1] === 'false') prop.f++; else prop.t++;
  }
  if (keys.size) byFile.set(f, keys);
}

const rows = ['file\tmatcherValues\ttop'];
for (const [f, keys] of [...byFile].sort((a, b) => [...b[1].values()].reduce((x, y) => x + y, 0) - [...a[1].values()].reduce((x, y) => x + y, 0))) {
  const tot = [...keys.values()].reduce((x, y) => x + y, 0);
  const top = [...keys].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}×${v}`).join(' ');
  rows.push(`${f}\t${keys.size}/${tot}\t${top}`);
}
fs.writeFileSync('kbd-scope-files.tsv', rows.join('\n') + '\n');

const enumGroups = new Map();
for (const [k, n] of keyTotal) {
  const g = /^([A-Za-z_$][\w$]*)\./.exec(k) ? RegExp.$1 : /^([A-Za-z_$][\w$]*)\(/.exec(k) ? RegExp.$1 + '()' : 'other';
  enumGroups.set(g, (enumGroups.get(g) || 0) + n);
}
console.log('绑定站点总数:', sites, ' 唯一 matcher 表达式:', keyTotal.size);
console.log('按前缀分组:', [...enumGroups].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join('  '));
console.log('注册进 focus stack 的上下文 id 数:', focusIds.size);
console.log([...focusIds.keys()].slice(0, 30).join(' | '));
console.log('allowPropagation true/false:', prop.t, '/', prop.f);
console.log('\n文件数（含绑定）:', byFile.size);
console.log(fs.readFileSync('kbd-scope-files.tsv', 'utf8').split('\n').slice(0, 14).join('\n'));
