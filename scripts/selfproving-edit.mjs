#!/usr/bin/env node
// gap.md G1515：**临时改动必须先自证锚点命中，再落盘**。
//
// 病根（第 193 批真的发生）：对照实验里用 `node -e` 拿一个以 `\n` 结尾的锚串去 `String.includes`
// 命中一个 **CRLF** 文件 ⇒ 逐字不命中、脚本什么都没改，于是"摘掉实现应当变红"的对照**报全绿**，
// 差点被读成"断言不成立"。同族还有：锚串被 shell 吞掉反斜杠（Git Bash 的 `node -e` / heredoc）。
//
// 这一条把"临时改动"这件危险动作收成一个工具：
//   · 锚串与替换文本**从文件读**（避免 shell 转义）——`--find-file` / `--replace-file`；
//   · 锚串必须**恰好命中一次**，否则**不落盘**、退出 3（这就是"自证"）；
//   · 落盘前先 `cp` 一份备份，并把还原命令印出来（`--revert` 也能直接还原）。
//
// 用法：
//   node scripts/selfproving-edit.mjs --file <目标> --find-file <锚> --replace-file <替换> [--backup <备份路径>]
//   node scripts/selfproving-edit.mjs --file <目标> --revert <备份路径>
// 退出码：0＝已改/已还原；3＝锚点没命中或不唯一（未落盘）；2＝用法/文件错。
import fs from 'node:fs';

const argv = process.argv.slice(2);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};

const target = opt('--file');
if (!target || !fs.existsSync(target)) {
  console.error(`用法错：--file 缺失或不存在（${target ?? '未给'}）`);
  process.exit(2);
}

const revert = opt('--revert');
if (revert) {
  if (!fs.existsSync(revert)) {
    console.error(`还原失败：备份不存在（${revert}）`);
    process.exit(2);
  }
  fs.copyFileSync(revert, target);
  console.log(`已还原 ${target} ← ${revert}`);
  process.exit(0);
}

const findFile = opt('--find-file');
const replaceFile = opt('--replace-file');
if (!findFile || !replaceFile) {
  console.error('用法错：需要 --find-file 与 --replace-file');
  process.exit(2);
}
for (const f of [findFile, replaceFile]) {
  if (!fs.existsSync(f)) {
    console.error(`用法错：${f} 不存在`);
    process.exit(2);
  }
}

const src = fs.readFileSync(target, 'utf8');
const find = fs.readFileSync(findFile, 'utf8');
const replace = fs.readFileSync(replaceFile, 'utf8');

if (find.length === 0) {
  console.error('锚串是空文件 ⇒ 自证失败（不落盘）');
  process.exit(3);
}
const first = src.indexOf(find);
if (first < 0) {
  console.error(
    `锚点没命中 ⇒ 不落盘（退出码 3）。\n` +
      `  目标：${target}（${src.length} 字符，行尾 ${src.includes('\r\n') ? 'CRLF' : 'LF'}）\n` +
      `  锚串首 80 字符：${JSON.stringify(find.slice(0, 80))}\n` +
      `  最可能的原因：行尾不一致（CRLF vs LF）或锚串在 shell 里被吞掉了反斜杠。`,
  );
  process.exit(3);
}
if (src.indexOf(find, first + find.length) >= 0) {
  console.error('锚点命中多于一次 ⇒ 不落盘（退出码 3，改错了地方比不改更糟）');
  process.exit(3);
}

const backup = opt('--backup') ?? `${target}.bak-${Date.now()}`;
fs.copyFileSync(target, backup);
fs.writeFileSync(target, src.slice(0, first) + replace + src.slice(first + find.length));
console.log(`已改 ${target}（锚点命中 1 处）`);
console.log(`备份：${backup}`);
console.log(`还原：node scripts/selfproving-edit.mjs --file ${target} --revert ${backup}`);
