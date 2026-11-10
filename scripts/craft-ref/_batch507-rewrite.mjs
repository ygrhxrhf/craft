import fs from 'node:fs';

const updates = JSON.parse(fs.readFileSync('docs/craft-ref/features/_audit/_batch507-gap-updates.json', 'utf8'));
const file = 'docs/craft-ref/features/gap.md';
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
  const patch = updates[m[1]];
  if (!patch) continue;
  const cells = splitRow(lines[i]);
  if (patch.fixArity && cells.length > 7) {
    // Malformed row: a bare `||` in the local cell split it across cells.
    // Rebuild as id/official/local/verdict/score from the patch + trailing score cell.
    const score = cells[cells.length - 2];
    cells[3] = ` ${(patch.local ?? '').replace(/\|/g, '\\|')} `;
    cells[4] = ` ${(patch.verdict ?? '').replace(/\|/g, '\\|')} `;
    lines[i] = [cells[0], cells[1], cells[2], cells[3], cells[4], ` ${score.trim()} `, ''].join('|');
  } else if (cells.length !== 7) {
    console.error(`${m[1]}: unexpected arity ${cells.length - 2}`);
    process.exitCode = 1;
    continue;
  } else {
    if (patch.local !== undefined) cells[3] = ` ${patch.local.replace(/\|/g, '\\|')} `;
    if (patch.verdict !== undefined) cells[4] = ` ${patch.verdict.replace(/\|/g, '\\|')} `;
    lines[i] = cells.join('|');
  }
  done.add(m[1]);
}

for (const id of Object.keys(updates)) {
  if (!done.has(id)) {
    console.error(`${id}: row not found`);
    process.exitCode = 1;
  }
}
fs.writeFileSync(file, lines.join('\n'));
console.log(`rewrote ${done.size} rows`);
