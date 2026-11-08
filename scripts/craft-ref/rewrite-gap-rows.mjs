import fs from 'node:fs';

/**
 * Rewrite the LOCAL (cell 3) and optionally VERDICT (cell 4) of 5-column ledger rows.
 * Usage: node rewrite-gap-rows.mjs <updates.json>
 * updates.json: { "G123": { "local": "…", "verdict": "…" }, … }
 * Splits on unescaped pipes so `\|` inside cells survives.
 */
const file = 'docs/craft-ref/features/gap.md';
const updates = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);

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

const done = new Set();
for (let i = 0; i < lines.length; i += 1) {
  const m = /^\|\s*(G\d+)\s*\|/.exec(lines[i]);
  if (!m) continue;
  const id = m[1];
  const patch = updates[id];
  if (!patch) continue;
  const cells = splitRow(lines[i]);
  if (cells.length !== 7) {
    console.error(`${id}: unexpected arity ${cells.length - 2} cells at line ${i + 1}`);
    process.exitCode = 1;
    continue;
  }
  // cells[0] is the empty slice before the leading pipe ⇒ data columns are 1..5
  // (id / official / local / verdict / score).
  if (patch.local !== undefined) cells[3] = ` ${patch.local.replace(/\|/g, '\\|')} `;
  if (patch.verdict !== undefined) cells[4] = ` ${patch.verdict.replace(/\|/g, '\\|')} `;
  lines[i] = cells.join('|');
  done.add(id);
}

for (const id of Object.keys(updates)) {
  if (!done.has(id)) {
    console.error(`${id}: row not found`);
    process.exitCode = 1;
  }
}
fs.writeFileSync(file, lines.join('\n'));
console.log(`rewrote ${done.size} rows`);