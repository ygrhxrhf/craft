import fs from 'node:fs';
const dir = process.argv[2];
const file = process.argv[3] || 'index-DiTmKH3z.js';
const names = (process.argv[4] || 'Co,Oo,Vn,zr').split(',');
const s = fs.readFileSync(dir + '/' + file, 'utf8');
const anchorName = process.argv[5];
let anchor = s.length;
if (anchorName) { const i = s.indexOf(anchorName); if (i >= 0) anchor = i; }
const win = s.slice(0, anchor);
const esc = n => n.replace(/[$]/g, '\\$');
for (const n of names) {
  const re = new RegExp('[,;({\\s=]' + esc(n) + '\\s*=[^=]', 'g');
  const spots = []; let m;
  while ((m = re.exec(win))) spots.push(m.index);
  console.log(`### ${n}  defs=${spots.length}`);
  for (const p of spots.slice(-3)) {
    console.log('   @' + p + '  ' + JSON.stringify(win.slice(p, p + 200)));
  }
}
