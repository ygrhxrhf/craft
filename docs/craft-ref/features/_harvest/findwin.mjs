import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
const arg = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const dir = arg('dir', 'D:/code/cs/docs/craft-ref/features/_harvest/js');
const pat = arg('pat', '');
const ctx = Number(arg('ctx', 200));
const max = Number(arg('max', 8));
const budget = Number(arg('budget', 5000));

if (!pat) { console.log('need --pat'); process.exit(1); }
let re;
try { re = new RegExp(pat, 'g'); } catch (e) { console.log('bad regex: ' + e.message); process.exit(1); }

const files = fs.readdirSync(dir).filter(f => /\.(js|mjs|json)$/.test(f));
let hits = 0, out = 0, perFile = [];
for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f), 'utf8');
  re.lastIndex = 0;
  let m, count = 0;
  while ((m = re.exec(buf)) && hits < max && out < budget) {
    const s = Math.max(0, m.index - ctx), e = Math.min(buf.length, m.index + m[0].length + ctx);
    const win = buf.slice(s, e).replace(/\s+/g, ' ');
    const line = `--- ${f} @${m.index} :: ${win}\n`;
    out += line.length; hits++; count++;
    if (out < budget) console.log(line);
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  if (count) perFile.push(`${f}:${count}`);
}
console.log(`\n[findwin] pat=${pat} filesScanned=${files.length} hits=${hits} perFile=${perFile.join(' ')}`);
