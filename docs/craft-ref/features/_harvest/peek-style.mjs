import fs from 'node:fs';
const f = process.argv[2];
const needle = process.argv[3] || '样式';
const s = fs.readFileSync(f, 'utf8');
console.log('file', f, 'len', s.length);
for (const m of s.matchAll(new RegExp(needle, 'g'))) {
  const a = Math.max(0, m.index - 500);
  const frag = s.slice(a, m.index + 150);
  const tag = frag.lastIndexOf('<button') >= 0 ? frag.slice(frag.lastIndexOf('<button')) : frag;
  console.log('=== @' + m.index);
  console.log(tag.replace(/></g, '>\n<').split('\n').slice(0, 14).join('\n'));
}
const sel = [...s.matchAll(/aria-selected="([^"]*)"[^>]{0,200}/g)].slice(0, 20);
console.log('--- aria-selected samples:', sel.length);
for (const x of sel) console.log(x[0].slice(0, 200));
