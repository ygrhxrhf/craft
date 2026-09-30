import fs from 'node:fs';
const dir = process.argv[2] || 'js';
const needles = (process.argv[3] || 'anyOf,percent,COUNT_EMPTY,isNotEmpty').split(',');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync(`${dir}/${f}`, 'utf8');
  for (const needle of needles) {
    let i = -1;
    while ((i = s.indexOf(`"${needle}`, i + 1)) !== -1) {
      const w = s.slice(Math.max(0, i - 300), i + 520);
      if (/[A-Z][A-Z0-9_]{2,}\s*=\s*["']/.test(w) || /\w+=\(/.test(w)) {
        console.log(`### ${f} @${i} [${needle}]\n${w.replace(/\s+/g, ' ')}\n`);
      }
    }
  }
}
