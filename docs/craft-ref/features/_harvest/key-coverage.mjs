import fs from 'node:fs';
const dir = '_harvest';
const rows = fs.readFileSync(dir + '/i18n-zh.tsv', 'utf8').split('\n').filter(Boolean);
const keys = [];
for (const l of rows) { const i = l.indexOf('\t'); if (i < 0) continue; keys.push({ k: l.slice(0, i), v: l.slice(i + 1).split('\t')[0] }); }
const DATA_NS = new Set(['country','unit','date','currency','language','timezone']);
const docs = fs.readdirSync('.').filter(f => f.endsWith('.md') && f !== 'feature-catalog.md');
const blob = docs.map(f => fs.readFileSync(f, 'utf8')).join('\n');
const byNs = new Map();
const missing = [];
for (const { k, v } of keys) {
  if (DATA_NS.has(k.split('.')[0])) continue;
  const head = k.split('.')[0];
  const tail = k.includes('.') ? k.slice(k.indexOf('.') + 1) : k;
  // a key counts as covered if the full key, or `ns`.`tail`, or the bare tail appears in backticks
  const hit = blob.includes(k) || blob.includes('`' + tail + '`') || blob.includes(head + '.' + tail)
    || (tail.length > 5 && blob.includes(tail));
  const e = byNs.get(head) || { n: 0, cov: 0 };
  e.n++; if (hit) e.cov++; else missing.push(k + '\t' + v);
  byNs.set(head, e);
}
const tot = [...byNs.values()].reduce((a,b)=>a+b.n,0), cov = [...byNs.values()].reduce((a, b) => a + b.cov, 0);
console.log(`功能面逐条 key 覆盖率（分母已剔数据表命名空间）：${cov}/${tot} = ${(cov / tot * 100).toFixed(1)}%  （产物 ${docs.length} 份，不含 feature-catalog.md）`);
const arr = [...byNs.entries()].map(([h, e]) => ({ h, n: e.n, miss: e.n - e.cov, pct: e.cov / e.n })).sort((a, b) => b.miss - a.miss);
console.log('\n## 未覆盖最多的命名空间（未覆盖条数 / 总条数 / 覆盖率）');
for (const r of arr.filter(x => x.miss > 0).slice(0, 26)) console.log(`${r.h.padEnd(18)} ${String(r.miss).padStart(3)}/${String(r.n).padStart(3)}  ${(r.pct * 100).toFixed(0)}%`);
const zero = arr.filter(x => x.cov === 0);
console.log('\n## 完全未覆盖的命名空间');
console.log(zero.map(x => `${x.h}(${x.n})`).join('  |  ') || '（无）');
fs.writeFileSync(dir + '/missing-keys.tsv', missing.join('\n'));
console.log(`\n未覆盖 key 清单已写 ${dir}/missing-keys.tsv（${missing.length} 条）`);
