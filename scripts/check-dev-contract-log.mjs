#!/usr/bin/env node
// gap.md G1501：加列之后的第一批写入必须打在**装了新契约的进程**上。
//
// 症状长这样：库里还没有那一列，而**运行中的** Next 进程已经在查它 ⇒ 日志里出现
// `Unknown column "xxx"`，而屏上只是"保存失败"。这条规矩（先 `contract emit` → 重启 →
// 再看日志应＝0）以前只写在台账里、靠人记得；这里把它做成可跑的一条。
//
// 用法：
//   node scripts/check-dev-contract-log.mjs                       # 默认扫 .next/dev/logs/next-development.log
//   node scripts/check-dev-contract-log.mjs --log <path>
//   node scripts/check-dev-contract-log.mjs --since 14:30:00      # 只看这一刻之后的条目（日志是当天、只带 HH:MM:SS）
// 退出码：0＝干净；1＝有命中；2＝日志读不到（判据不成立，别当绿）。
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : dflt;
};
const logPath = opt('--log', '.next/dev/logs/next-development.log');
const since = opt('--since', null);

if (!fs.existsSync(logPath)) {
  console.error(`日志不存在：${logPath} ⇒ 判据不成立（退出码 2），不要把它当绿`);
  process.exit(2);
}

const text = fs.readFileSync(logPath, 'utf8');
const hits = [];
for (const line of text.split(/\r?\n/)) {
  if (!line.includes('Unknown column')) continue;
  let ts = '';
  let message = line;
  try {
    const row = JSON.parse(line);
    ts = String(row.timestamp ?? '');
    message = String(row.message ?? line);
  } catch {
    // 非 JSON 行（栈/旧格式）也照查，只是没有时间戳
  }
  if (since && ts && ts < since) continue;
  const col = /Unknown column "([^"]+)"/.exec(message)?.[1] ?? null;
  hits.push({ ts, col, message: message.slice(0, 200) });
}

console.log(`扫描 ${logPath}${since ? `（仅 ${since} 之后）` : ''}：命中 ${hits.length} 条`);
if (hits.length > 0) {
  for (const h of hits.slice(-10)) console.log(`  [${h.ts || '无时间戳'}] ${h.col ?? '?'} :: ${h.message}`);
  console.log('⇒ 运行中的 dev 进程查了库里没有的列：先 `npm run contract:emit`，重启 dev server，再跑一次本条应为 0');
  process.exit(1);
}
process.exit(0);
