import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
const arg = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const dir = arg('dir', 'D:/code/cs/docs/craft-ref/features/_harvest/js');
const pat = arg('pat', '');
const after = Number(arg('after', 400));
const before = Number(arg('before', 0));
const max = Number(arg('max', 4));
const only = arg('file', '');
const re = new RegExp(pat, 'g');
let shown = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  if (only && !f.startsWith(only)) continue;
  const b = fs.readFileSync(path.join(dir, f), 'utf8');
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(b)) && shown < max) {
    console.log(`### ${f} @${m.index} :: ${m[0].slice(0, 60)}\n` +
      b.slice(Math.max(0, m.index - before), Math.min(b.length, m.index + after)).replace(/\s+/g, ' ') + '\n');
    shown++;
  }
  if (shown >= max) break;
}
if (!shown) console.log('### NO MATCH');
