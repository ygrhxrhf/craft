import { readFileSync, writeFileSync } from 'node:fs';

const p = 'MEMORY.md';
let s = readFileSync(p, 'utf8');

const jobs = [
  [
    'gap **984 条／最大 G992**、覆盖率 **51.6%（1877/3639）**、第 1–97 批（**尾记二＝',
    'gap **991 条／最大 G999**、覆盖率 **51.6%（1877/3639）**、第 1–99 批（**第 99 批＝★★★ `commands.empty.trash` 的屏上入口结案（回收站右上 ⋯ →「清空最近删除」，第 98 批"屏上无删除语义控件"作废）＋ ★★★ 第二个动词 `Trash Slash`＝"精确只清 12 条具名沙盒"改判为**通路可行但未执行**＋ ★★ 第七条判据盲区＝静止态每行恒有 `role=checkbox`；尾记二＝',
  ],
];

for (const [a, b] of jobs) {
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS n=' + n + ' :: ' + a.slice(0, 40));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST-ASSERT FAIL');
    process.exit(1);
  }
}

writeFileSync(p, s);
console.log('OK index: 991=' + s.includes('**991 条／最大 G999**') + ' 第1–99=' + s.includes('第 1–99 批（'));
