import fs from 'node:fs';
const file = process.argv[2];
const pat = process.argv[3];
const cap = Number(process.argv[4] || 8);
const src = fs.readFileSync('_harvest/js/' + file, 'utf8');
const re = new RegExp(pat, 'g');
let m, n = 0, out = [];
while ((m = re.exec(src)) && n < cap) {
  out.push('@' + m.index + '  ' + src.slice(Math.max(0, m.index - 60), m.index + 150).replace(/\n/g, ' '));
  n++;
}
console.log(out.join('\n----\n') || 'NO MATCH');
