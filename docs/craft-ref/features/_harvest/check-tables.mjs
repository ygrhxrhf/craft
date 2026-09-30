import fs from 'node:fs';
const cols = (s) => s.replace(/\\\|/g, '@').split('|').length;
let totalBad = 0;
for (const f of process.argv.slice(2)) {
  const L = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let i = 0, bad = 0, tabs = 0;
  while (i < L.length) {
    if (L[i].startsWith('|')) {
      const rows = [];
      let j = i;
      while (j < L.length && L[j].startsWith('|')) { rows.push([j + 1, cols(L[j])]); j++; }
      tabs++;
      const w = rows[0][1];
      const off = rows.filter((r) => r[1] !== w);
      if (off.length) { bad++; console.log(`${f} 表起始@${i + 1} 列=${w} 异常: ` + off.map((o) => `L${o[0]}(${o[1]})`).join(' ')); }
      i = j;
    } else i++;
  }
  totalBad += bad;
  console.log(`  -> ${f}: 表=${tabs} 异常表=${bad}`);
}
console.log(totalBad === 0 ? 'ALL TABLES CONSISTENT' : `共 ${totalBad} 张表列数不一致`);
