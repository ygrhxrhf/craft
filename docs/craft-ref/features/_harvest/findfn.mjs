import fs from 'node:fs';
const dir = process.argv[2];
const file = process.argv[3];
const names = process.argv[4].split(',');
const s = fs.readFileSync(`${dir}/${file}`, 'utf8');
for (const n of names) {
  const e = n.replace(/[$]/g, '\\$');
  const pats = [
    ['fn', new RegExp('function ' + e + '\\([^)]{0,80}\\)', 'g')],
    ['var', new RegExp('[,;({\\s]' + e + '\\s*=\\s*(?:\\([^)]{0,60}\\)|[A-Za-z_$][\\w$]*)\\s*=>', 'g')],
    ['cls', new RegExp('class ' + e + '\\b', 'g')]
  ];
  const found = [];
  for (const [kind, re] of pats) {
    let m; while ((m = re.exec(s))) found.push([kind, m.index, s.slice(m.index, m.index + 300)]);
  }
  process.stdout.write(`### ${n}  hits=${found.length}\n`);
  for (const [kind, i, frag] of found.slice(0, 6)) {
    process.stdout.write(`  [${kind}@${i}] ${JSON.stringify(frag)}\n`);
  }
}
