import fs from 'node:fs';
const rows = fs.readFileSync('_harvest/i18n-zh.tsv', 'utf8').split('\n').filter(Boolean);
const ns = new Map();
for (const l of rows) {
  const i = l.indexOf('\t');
  if (i < 0) continue;
  const k = l.slice(0, i);
  const head = k.split('.')[0];
  ns.set(head, (ns.get(head) || 0) + 1);
}
const docs = fs.readdirSync('.').filter((f) => f.endsWith('.md') && f !== 'feature-catalog.md');
const blob = docs.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
const cov = [];
for (const [head, n] of ns) {
  const direct = new RegExp('`' + head + '\\.', 'g');
  const hits = (blob.match(direct) || []).length;
  const bare = hits > 0 ? hits : (blob.includes(head + '.') ? 1 : 0);
  cov.push({ head, n, hits: bare });
}
cov.sort((a, b) => b.n - a.n);
const uncov = cov.filter((c) => c.hits === 0);
const thin = cov.filter((c) => c.hits > 0 && c.hits < Math.max(3, c.n / 12));
const tot = [...ns.values()].reduce((a, b) => a + b, 0);
console.log(`命名空间 ${cov.length} 个 / 字符串 ${tot} 条`);
console.log(`完全未成轴 ${uncov.length} 个 / ${uncov.reduce((a, b) => a + b.n, 0)} 条`);
console.log(`引用偏薄 ${thin.length} 个 / ${thin.reduce((a, b) => a + b.n, 0)} 条`);
console.log('\n## 完全未成轴（按条数）');
console.log(uncov.map((c) => `${c.head} (${c.n})`).join('  |  '));
console.log('\n## 引用偏薄（命名空间 / 条数 / 产物中被点名次数）');
console.log(thin.map((c) => `${c.head} ${c.n}/${c.hits}`).join('  |  '));
