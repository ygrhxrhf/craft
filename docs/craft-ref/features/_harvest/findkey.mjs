import fs from 'node:fs';
const dir = 'js';
const keys = (process.argv[2] || 'collections.any.of,collections.is.empty').split(',');
for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync(`${dir}/${f}`, 'utf8');
  for (const k of keys) {
    const needle = JSON.stringify(k);
    const i = s.indexOf(needle);
    if (i >= 0) {
      console.log(`### ${f} [${k}] @${i}`);
      console.log(s.slice(Math.max(0, i - 900), i + 600).replace(/\s+/g, ' ') + '\n');
    }
  }
}
