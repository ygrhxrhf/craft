#!/usr/bin/env node
// gap.md 台账**清点器**（第 217 批）。
//
// 为什么需要它：本会话我三次口头汇报"剩下的队列都卡在裁决上"，而那是**错的**——我只扫了批次表里
// 判定列以「未动／改法…」开头的那几行，而 §一 那张老表把"官方有本地没有"记在**第 3 列（差异类型）**：
// 缺失／行为不同／只有壳／有意偏差。现跑＝**567 行带差异类型，其中 381 行是「缺失」**。
// ☆ 且第 3 列是**登记时**的类型、不是活状态（G01/G03/G04/G05 都出现过"写着缺失、其实早已清"）
//   ⇒ 真实剩余量必须**逐行现读复核**（G1487 立的规矩），这份清点给的是**上界与入口**，不是结论。
//
// 用法：
//   node scripts/ledger-inventory.mjs                 # 概览
//   node scripts/ledger-inventory.mjs --type 缺失      # 逐行列「缺失」那些
//   node scripts/ledger-inventory.mjs --json          # 机器可读（供测试与后续批次挑活）
import fs from 'node:fs';

const LEDGER = 'docs/craft-ref/features/gap.md';
const argv = process.argv.slice(2);
const typeArg = argv.includes('--type') ? argv[argv.indexOf('--type') + 1] : null;
const asJson = argv.includes('--json');

const TYPE = ['缺失', '行为不同', '只有壳', '有意偏差'];
const DONE = /已清|不做|结案/;

const rows = new Map();
for (const line of fs.readFileSync(LEDGER, 'utf8').split(/\r?\n/)) {
  const m = /^\|\s*G(\d+)\s*\|(.*)$/.exec(line);
  if (!m) continue;
  const cells = m[2].split('|').map((c) => c.trim());
  if (cells.length < 5) continue;
  if (rows.has(m[1])) continue;
  // §一 行＝5 栏：官方行为｜本地对照｜差异类型｜影响/成本｜回归
  const type = TYPE.find((t) => cells[2].startsWith(t)) ?? null;
  if (!type) continue;
  rows.set(m[1], { id: `G${m[1]}`, type, want: cells[0], have: cells[1], cost: cells[3] });
}

const byType = {};
for (const r of rows.values()) byType[r.type] = (byType[r.type] ?? 0) + 1;

if (asJson) {
  console.log(JSON.stringify({ total: rows.size, byType, rows: [...rows.values()] }, null, 2));
} else if (typeArg) {
  const picked = [...rows.values()].filter((r) => r.type === typeArg);
  console.log(`差异类型＝${typeArg} 共 ${picked.length} 行（☆ 登记时类型，须逐行现读复核）`);
  for (const r of picked) console.log(` ${r.id.padEnd(6)} ${r.cost.padEnd(6)} ${r.want.slice(0, 70)}`);
} else {
  console.log(`§一 带差异类型的行共 ${rows.size} 行（＝剩余工作的**上界**；第 3 列是登记时类型）`);
  for (const t of TYPE) console.log(`  ${t}：${byType[t] ?? 0}`);
  console.log('挑活：node scripts/ledger-inventory.mjs --type 缺失');
}
