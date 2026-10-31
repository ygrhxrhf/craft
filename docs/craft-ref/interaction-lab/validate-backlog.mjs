import { readFileSync } from 'node:fs';
const path = 'docs/craft-ref/features/replication-backlog.md';
const lines = readFileSync(path, 'utf8').split(/\r?\n/);
const countPipes = (s) => (s.match(/(?<!\\)\|/g) || []).length;
let block = [];
let start = 0;
let bad = 0;
const flush = () => {
  if (block.length < 2) return;
  const n = countPipes(block[0]);
  for (let i = 0; i < block.length; i++) {
    if (countPipes(block[i]) !== n) {
      bad++;
      console.log('PIPE MISMATCH line', start + i, 'expected', n, 'got', countPipes(block[i]), '|', block[i].slice(0, 120));
    }
  }
};
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('|')) {
    if (!block.length) start = i + 1;
    block.push(lines[i]);
  } else {
    flush();
    block = [];
  }
}
flush();
console.log('BAD TABLE ROWS', bad);
console.log('PLACEHOLDERS', lines.filter((l) => l.includes('{{')).length);
const sections = { P0: 0, P1: 0, P2: 0 };
let cur = null;
for (const l of lines) {
  if (/^## 四、P0/.test(l)) cur = 'P0';
  else if (/^## 五、P1/.test(l)) cur = 'P1';
  else if (/^## 六、P2/.test(l)) cur = 'P2';
  else if (/^## /.test(l)) cur = null;
  if (cur && /^\| G\d+ /.test(l)) sections[cur]++;
}
console.log('SECTION ROWS', sections);
