import fs from 'node:fs';
import path from 'node:path';

const a = process.argv.slice(2);
const arg = (k, d) => { const i = a.indexOf('--' + k); return i >= 0 ? a[i + 1] : d; };
const dir = arg('dir', 'D:/code/cs/docs/craft-ref/features/_harvest/js');
const names = (arg('names', '') || '').split(',').filter(Boolean);
const ctx = Number(arg('after', 300));
const per = Number(arg('per', 2));

const only = arg('file', '');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js') && (!only || f.startsWith(only)));
for (const n of names) {
  const esc = n.replace(/[$]/g, '\\$');
  const pats = [new RegExp(`function ${esc}\\s*\\(`, 'g'), new RegExp(`(const|let|var) ${esc}\\s*=`, 'g'), new RegExp(`[,{]${esc}:`, 'g')];
  let shown = 0;
  for (const f of files) {
    if (shown >= per) break;
    const b = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const re of pats) {
      if (shown >= per) break;
      let m;
      while ((m = re.exec(b)) && shown < per) {
        console.log(`### ${n} :: ${f} @${m.index}\n` + b.slice(m.index, Math.min(b.length, m.index + ctx)).replace(/\s+/g, ' ') + '\n');
        shown++;
        if (m.index === re.lastIndex) re.lastIndex++;
      }
    }
  }
  if (!shown) console.log(`### ${n} :: NOT FOUND as definition\n`);
}
