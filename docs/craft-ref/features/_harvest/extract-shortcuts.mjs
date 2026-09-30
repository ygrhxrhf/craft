import fs from 'node:fs';
const dir = process.argv[2];
const out = process.argv[3];
const s = fs.readFileSync(dir + '/index-DiTmKH3z.js', 'utf8');

function balanced(startIdx, open, close) {
  let i = s.indexOf(open, startIdx);
  if (i < 0) return null;
  let depth = 0, q = null;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (q) { if (c === '\\') { j++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (!depth) return s.slice(i, j + 1); }
  }
  return null;
}

const report = [];
const anchors = {
  keyConsts: { idx: 19000, len: 2400 },
  Iu: { open: 'Iu={', close: '}' },
  fnt: { open: 'fnt=[', close: ']' },
  pnt: { open: 'pnt=[', close: ']' },
  hnt: { open: 'hnt={', close: '}' },
  ot: { open: 'ot={', close: '}' }
};
for (const [name, spec] of Object.entries(anchors)) {
  if (spec.idx) { report.push('## ' + name + ' (raw region)'); report.push(s.slice(spec.idx, spec.idx + spec.len)); report.push(''); continue; }
  const i = s.indexOf(spec.open);
  report.push('## ' + name + '  @' + i);
  report.push(i < 0 ? 'NOT FOUND' : balanced(i, spec.open[spec.open.length - 1], spec.close));
  report.push('');
}
fs.writeFileSync(out, report.join('\n'), 'utf8');
console.log('wrote', out, fs.statSync(out).size, 'bytes');
