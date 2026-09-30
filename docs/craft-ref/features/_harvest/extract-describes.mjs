import fs from 'node:fs';
// 抽 bundle 里的 zod `.describe("…")` 自文档说明与 `.enum([...])` 枚举集。
// 产品把 API/工具契约写在代码里时，这是比界面截图更权威的行为说明来源。
const dir = process.argv[2] || 'js';
const skip = /Emoji|FolderIcon|DoodleAssets|vendor-react|vendor-sentry|excalidraw|code-editor|virtuoso|processing/;
const ds = new Map();
const enums = new Set();
for (const f of fs.readdirSync(dir)) {
  if (!/\.js$/.test(f) || skip.test(f)) continue;
  const s = fs.readFileSync(dir + '/' + f, 'utf8');
  for (const m of s.matchAll(/\.describe\(\s*([`"'])([\s\S]{6,420}?)\1/g)) {
    const v = m[2].replace(/\s+/g, ' ').trim();
    if (!ds.has(v)) ds.set(v, f);
  }
  for (const m of s.matchAll(/[A-Za-z$_]{1,5}\.enum\(\[([^\]]{3,240})\]/g)) enums.add(m[1].replace(/\s+/g, ' '));
}
const rows = [...ds.entries()].sort((a, b) => a[0].localeCompare(b[0]));
fs.writeFileSync('api-describes.tsv', rows.map(([v, f]) => `${v}\t\t${f}`).join('\n') + '\n');
console.log('describe 条目=' + rows.length + '  枚举集=' + enums.size);
console.log('\n## 枚举集');
for (const e of [...enums].sort()) console.log('  [' + e + ']');
console.log('\n## describe 抽样（按字母）');
for (const [v, f] of rows.slice(0, 28)) console.log('- ' + v.slice(0, 220) + '   ← ' + f);
