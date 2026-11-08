import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

/**
 * Repair the rows damaged by rewrite-gap-rows.mjs before its column fix.
 * Buggy writer put `local` into the 官方实测事实 cell and `verdict` into the
 * 本地实现 cell, leaving the old verdict/score trailing. Damage range:
 * git history of gap.md at dd829429 … (fixed in the same batch as this script).
 *
 * For every row whose 官方 string cell is a 「✎ 现读」 reading:
 *   官方 = pre-damage official cell (from BASE_REV)
 *   本地 = the ✎ reading            (was in the official slot)
 *   判定 = the new verdict          (was in the local slot)
 *   优先级 = untouched score cell
 */
const REPO = process.cwd();
const PATH = 'docs/craft-ref/features/gap.md';
const BASE_REV = process.argv[2] ?? 'dd829429^';

const NEWLINE = String.fromCharCode(10);
const CR = String.fromCharCode(13);

function splitRow(line) {
  const cells = [];
  let cur = '';
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '\\' && line[i + 1] === '|') {
      cur += '\\|';
      i += 1;
      continue;
    }
    if (ch === '|') {
      cells.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells;
}

const base = execFileSync('git', ['show', `${BASE_REV}:${PATH}`], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28 })
  .split(NEWLINE)
  .map((l) => l.replace(CR, ''));
const baseById = new Map();
for (const l of base) {
  const m = /^\|\s*(G\d+)\s*\|/.exec(l);
  if (m) baseById.set(m[1], splitRow(l));
}

const lines = readFileSync(`${REPO}/${PATH}`, 'utf8').split(NEWLINE);
const repaired = [];
const skipped = [];
for (let i = 0; i < lines.length; i += 1) {
  const m = /^\|\s*(G\d+)\s*\|/.exec(lines[i]);
  if (!m) continue;
  const id = m[1];
  const cells = splitRow(lines[i]);
  const official = (cells[2] ?? '').trim();
  if (!/^✎ 现读（[^）]*第 \d+k 批）/.test(official)) continue;

  const b = baseById.get(id);
  if (!b) { skipped.push(`${id}: L${i + 1} no base row`); continue; }
  if (cells.length !== 7) { skipped.push(`${id}: L${i + 1} arity ${cells.length}`); continue; }
  const bOfficial = (b[2] ?? '').trim();
  if (!bOfficial || bOfficial.startsWith('✎')) { skipped.push(`${id}: L${i + 1} base official not restorable`); continue; }
  const c4 = (cells[4] ?? '').trim();
  const b4 = (b[4] ?? '').trim();
  const c5 = (cells[5] ?? '').trim();
  const b5 = (b[5] ?? '').trim();
  if (c4 !== b4 || c5 !== b5) { skipped.push(`${id}: L${i + 1} trailing columns moved; needs manual review`); continue; }

  const local = (cells[2] ?? '').trim();
  const verdict = (cells[3] ?? '').trim();
  if (!local || !verdict) { skipped.push(`${id}: L${i + 1} empty local/verdict`); continue; }

  lines[i] = `| ${id} | ${b[2].trim()} | ${local.replace(/\|/g, '\\|')} | ${verdict.replace(/\|/g, '\\|')} | ${c5} |`;
  repaired.push(id);
}

writeFileSync(`${REPO}/${PATH}`, lines.join(NEWLINE));
console.log(`repaired ${repaired.length} rows`);
if (skipped.length) {
  console.log(`skipped ${skipped.length}:`);
  for (const s of skipped) console.log('  ' + s);
}
console.log(repaired.join(' '));
