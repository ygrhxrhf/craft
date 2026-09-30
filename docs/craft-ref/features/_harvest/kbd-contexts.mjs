import fs from 'node:fs';
import path from 'node:path';

const files = fs.readdirSync('js').filter((f) => f.endsWith('.js'));
const out = [];
for (const f of files) {
  const s = fs.readFileSync(path.join('js', f), 'utf8');
  for (const m of s.matchAll(/pushIntoFocus\(\{\s*id:\s*"([^"]{2,60})",\s*keyDefs:\s*\[/g)) {
    const start = m.index + m[0].length - 1;
    let d = 0, j = start;
    for (; j < s.length; j++) {
      if (s[j] === '[') d++;
      else if (s[j] === ']') { d--; if (!d) { j++; break; } }
    }
    const blk = s.slice(start, j);
    const ms = [...blk.matchAll(/matcher:\s*([^,]{1,30})/g)].map((x) => x[1].trim());
    const prop = /allowPropagation:\s*(!1|!0)/.exec(blk);
    out.push({
      file: f.replace(/-[A-Za-z0-9_-]{8}\.js$/, ''),
      id: m[1],
      n: ms.length,
      prop: prop ? (prop[1] === '!0' ? 'true' : 'false') : '-',
      keys: [...new Set(ms)].slice(0, 8).join(' '),
    });
  }
}
out.sort((a, b) => a.file.localeCompare(b.file) || b.n - a.n);
const lines = ['contextId\tfile\t键数\tallowPropagation\tmatcher(去重前8)'];
for (const o of out) lines.push(`${o.id}\t${o.file}\t${o.n}\t${o.prop}\t${o.keys}`);
fs.writeFileSync('kbd-contexts.tsv', lines.join('\n') + '\n');
console.log('具名上下文注册数:', out.length);
console.log(lines.slice(0, 26).join('\n'));
