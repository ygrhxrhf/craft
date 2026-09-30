import fs from 'node:fs';

const a = 'assistant.md';
let s = fs.readFileSync(a, 'utf8');
const before = s;
s = s.replace('presets:["read"|"write"|"read","write"]', 'presets:["read" \\| "write" \\| "read","write"]');
s = s.replace('保护 3（`public`/`key`/`password`）', '保护 3（`public`/`key`/`password`）');
if (s === before) { console.log('assistant.md: 未命中，跳过'); } else { fs.writeFileSync(a, s); console.log('assistant.md: 已转义 presets 竖线'); }

const f = 'features.md';
const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
let fixed = 0;
for (const n of [56, 57, 58, 59, 60, 61, 62]) {
  const i = n - 1;
  const m = /^(.*?)\s*`(✓|~|\?)`\s*\|$/.exec(L[i]);
  if (!m) { console.log(`L${n}: 无置信尾标记，跳过`); continue; }
  const cells = L[i].slice(1, -1).split(/(?<!\\)\|/);
  if (cells.length !== 3) { console.log(`L${n}: 列数=${cells.length}，跳过`); continue; }
  const last = cells[2].replace(/\s*`(✓|~|\?)`\s*$/, '');
  L[i] = `|${cells[0]}|${cells[1]}|${last} | \`${m[2]}\` |`;
  fixed++;
}
fs.writeFileSync(f, L.join('\n'));
console.log('features.md: 补齐置信列的行数 = ' + fixed);
