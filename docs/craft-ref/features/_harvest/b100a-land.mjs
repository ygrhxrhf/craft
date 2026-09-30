import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';

const g = readFileSync('_harvest/b100a-gap.txt', 'utf8').replace(/^\n+/, '').replace(/\n+$/, '\n');
appendFileSync('gap.md', '\n' + g);
if (!readFileSync('gap.md', 'utf8').includes('### 三点一〇四五')) {
  console.log('GAP APPEND FAIL');
  process.exit(1);
}

const patches = [
  [
    'gap.md',
    '-600`～`-900` 在 accent 系里不存在）',
    '-600`～`-900` 在 accent 系里不存在）〔✎ **第 100 批·上半作废**＝accent／red 族各有 **18 档**，`-550`…`-900` 是**不透明逐档加深**的独立 RGB，不是不存在；只有 `-950` 确实没有 ⇒ 见 **G1009**〕',
  ],
  [
    'styles.md',
    '强调色的满值后缀是 `-500` 而非 `-900`，`-600`～`-900` 在 accent 系里根本不存在',
    '强调色的满值后缀是 `-500` 而非 `-900`，`-600`～`-900` 在 accent 系里根本不存在〔✎ **第 100 批·上半作废并更正**＝`-50…-500` 是 **alpha 段**（10 档）、`-550…-900` 是**不透明逐档加深段**（8 档），合计 **18 档**；"满值后缀"这个说法本身不成立，因为两段各有一个满值（`-500=100%` 与 `-900=最深`）。⇒ 全表与逐字值见 **§十一**，作废理由见 `gap.md` **G1009**〕',
  ],
];

for (const [p, a, b] of patches) {
  let s = readFileSync(p, 'utf8');
  const n = s.split(a).length - 1;
  if (n !== 1) {
    console.log('MISS ' + p + ' n=' + n + ' :: ' + a.slice(0, 28));
    process.exit(1);
  }
  s = s.replace(a, b);
  if (!s.includes(b)) {
    console.log('POST FAIL ' + p);
    process.exit(1);
  }
  writeFileSync(p, s);
  console.log('OK patched ' + p);
}

console.log('gap rows now = ' + (readFileSync('gap.md', 'utf8').match(/^\| G[0-9]+ \|/gm) || []).length);
