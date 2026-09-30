import { readFileSync, writeFileSync } from 'node:fs';

const clause = readFileSync('_harvest/b99-features-clause.txt', 'utf8').replace(/\s+$/, '') + ' ';
const p = 'features.md';
let s = readFileSync(p, 'utf8');

const jobs = [
  ['`gap.md` **984 条（最大 G992）**', '`gap.md` **991 条（最大 G999）**'],
  ['第 1–98 批批次日志（第 98 批·尾记〔', '第 1–99 批批次日志（' + clause + '第 98 批·尾记〔'],
];

for (const [a, b] of jobs) {
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS n=' + n + ' :: ' + a.slice(0, 32));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST-ASSERT FAIL :: ' + a.slice(0, 32));
    process.exit(1);
  }
}

writeFileSync(p, s);
console.log('OK features.md: 991=' + s.includes('**991 条（最大 G999）**') + ' 第1–99=' + s.includes('第 1–99 批批次日志') + '  clauseRefs=' + (s.split('G993–G999').length - 1));
