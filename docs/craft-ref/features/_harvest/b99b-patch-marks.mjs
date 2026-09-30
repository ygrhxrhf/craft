import { readFileSync, writeFileSync } from 'node:fs';

const jobs = [
  [
    'interactions.md',
    '确认框屏上形态仍未见**，本批刻意不点开）',
    '确认框屏上形态仍未见**，本批刻意不点开）〔✎ **第 99 批·尾记结案**＝`Trash Slash` 那条通路的确认框已采到（文案逐字＋两枚 154×32 等宽按钮），见 **V93 第 8 环节**；`commands.empty.trash` 那条仍未见〕',
  ],
  [
    'interactions.md',
    '两条动词各自的**确认框**（文案、按钮、是否列出受影响条数）',
    '两条动词各自的**确认框**（文案、按钮、是否列出受影响条数）〔✎ **第 99 批·尾记部分结案**＝`Trash Slash` 的确认框到手且**确实回显条数**（「删除 12 个项目」），`empty.trash` 的仍未见 ⇒ 见 **V93**〕',
  ],
  [
    'gap.md',
    '**仍未采到（三点一〇四三）**：**「清空最近删除」与 `Trash Slash` 的确认框长什么样**',
    '**仍未采到（三点一〇四三）**：**「清空最近删除」与 `Trash Slash` 的确认框长什么样**〔✎ **第 99 批·尾记部分结案**＝`Trash Slash` 的确认框已采（G1002），`empty.trash` 的仍未采且今后不该再点〕',
  ],
  [
    'gap.md',
    '`Trash Slash` 的禁',
    '`Trash Slash` 的禁',
  ],
];

for (const [p, a, b] of jobs) {
  if (a === b) continue;
  let s = readFileSync(p, 'utf8');
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS ' + p + ' n=' + n + ' :: ' + a.slice(0, 30));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST FAIL ' + p);
    process.exit(1);
  }
  writeFileSync(p, s);
  console.log('OK ' + p + ' :: ' + a.slice(0, 24));
}
