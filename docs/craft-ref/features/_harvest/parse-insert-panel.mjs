import fs from 'node:fs';

const file = process.argv[2];
const s = fs.readFileSync(file, 'utf8');
const start = s.indexOf('将任何项目拖放到文档中');
const end = s.indexOf('</aside>', start);
const frag = s.slice(start, end < 0 ? start + 120000 : end);

const re = /class="sc-66ln8x-0([^"]*)"([^>]*)>([^<]{1,30})</g;
const out = [];
for (const m of frag.matchAll(re)) {
  const cls = m[1];
  const txt = m[3].trim();
  if (!txt) continue;
  const kind = cls.includes('-22') ? 'item' : cls.includes('-8') ? 'HEADER' : cls.includes('-3') ? 'sub' : 'other:' + cls.trim();
  out.push(kind + ' ' + txt);
}
console.log(file, 'asideLen', frag.length);
console.log(out.join('\n'));
