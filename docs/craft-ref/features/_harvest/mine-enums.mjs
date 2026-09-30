// 全量枚举抽取：TS enum 编译产物、zod enum、大写键常量映射。
// 用法: node mine-enums.mjs <js目录> [--out file] [--min 3] [--grep kw] [--show-members]
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = args[0];
const opt = {};
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith('--')) { const k = args[i].slice(2); opt[k] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true; }
}
if (!dir) { console.log('用法: node mine-enums.mjs <js目录> [--out tsv] [--min 3] [--grep kw]'); process.exit(1); }
const min = Number(opt.min || 3);
const out = [];

function walk(d, acc) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc); else if (e.name.endsWith('.js')) acc.push(p);
  }
  return acc;
}

const seen = new Set();
const files = walk(dir, []);
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  const short = path.basename(f);

  // 1) TS enum 编译产物：  X=(e=>(e.A="a",e.B="b",e))(X||{})
  //    成员名可能是 UPPERCASE，也可能是 PascalCase/camelCase（官方内容模型枚举就是 None/Bullet/… 与 pageRegular 混用）
  const enumRe = /([A-Za-z_$][\w$]*)\s*=\s*\(\s*([A-Za-z_$][\w$]*)\s*=>\s*\(\s*\2\.([A-Za-z_$][\w$]{1,30})\s*=\s*(["'][^"']{1,40}["'])/g;
  let m;
  while ((m = enumRe.exec(s))) {
    const name = m[1];
    const start = m.index;                                    // 含首个成员，否则每项少一个
    const raw = s.slice(start, start + 4000);
    const stop = raw.indexOf('))(');                          // IIFE 终止符：越过它就串到下一个枚举
    const tail = stop > 0 ? raw.slice(0, stop) : raw;
    const pairs = [...tail.matchAll(/\.([A-Za-z_$][\w$]{1,30})\s*=\s*(["'])([^"']{1,40})\2/g)];
    const members = [];
    for (const p of pairs) {
      const label = p[1] + '=' + p[3];
      if (members.includes(label)) continue;
      members.push(label);
      if (members.length > 80) break;
    }
    const cleaned = members;
    if (cleaned.length < min) continue;
    const key = name + '|' + cleaned.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'enum', name, file: short, count: cleaned.length, values: cleaned });
  }

  // 2) zod / JS 枚举数组：  z.enum(["a","b","c"])  或  =["a","b","c"] 且长度>=min
  const arrRe = /\.enum\(\s*\[((["'][\w.\-]{1,40}["']\s*,\s*){2,})(["'][\w.\-]{1,40}["'])?\]/g;
  while ((m = arrRe.exec(s))) {
    const vals = [...m[0].matchAll(/["']([\w.\-]{1,40})["']/g)].map(x => x[1]);
    if (vals.length < min) continue;
    const ctx = s.slice(Math.max(0, m.index - 160), m.index);
    const nm = [...ctx.matchAll(/([A-Za-z_$][\w$]*)\s*[:=]/g)].pop();
    const key = 'zenum|' + (nm ? nm[1] : '?') + '|' + vals.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'z.enum', name: nm ? nm[1] : '(anon)', file: short, count: vals.length, values: vals });
  }

  // 3) 大写键常量映射： {TEXT:"text", NUMBER:"number", ...} 键数 >= min
  const mapRe = /\{\s*(?:[A-Z][A-Z0-9_]{1,28}\s*:\s*"[^"]{1,40}"\s*,\s*){2,}[A-Z][A-Z0-9_]{1,28}\s*:\s*"[^"]{1,40}"\s*\}/g;
  while ((m = mapRe.exec(s))) {
    const pairs = [...m[0].matchAll(/([A-Z][A-Z0-9_]{1,28})\s*:\s*(["'])([\w.\-]{1,40})\2/g)];
    if (pairs.length < min) continue;
    const ctx = s.slice(Math.max(0, m.index - 200), m.index);
    const nm = [...ctx.matchAll(/([A-Za-z_$][\w$]*)\s*[:=]/g)].pop();
    const vals = pairs.map(p => p[1] + '=' + p[3]);
    const key = 'map|' + vals.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ kind: 'const-map', name: nm ? nm[1] : '(anon)', file: short, count: vals.length, values: vals });
  }
}

out.sort((a, b) => b.count - a.count);
if (opt.grep) {
  const g = String(opt.grep).toLowerCase();
  const hit = out.filter(e => (e.name + ' ' + e.values.join(' ')).toLowerCase().includes(g));
  console.log(`匹配 "${g}" 的枚举 ${hit.length} 个（全部 ${out.length}）`);
  for (const e of hit.slice(0, 60)) console.log(`\n[${e.kind}] ${e.name} (${e.count})  ${e.file}\n  ${e.values.slice(0, 40).join('  ')}`);
} else {
  console.log(`扫描 ${files.length} 个文件，去重后枚举 ${out.length} 个（>=${min} 值）`);
  for (const e of out.slice(0, Number(opt.limit || 60))) {
    console.log(`[${e.kind}] ${e.name} (${e.count})  ${e.file}\n    ${e.values.slice(0, opt['show-members'] ? 60 : 14).join('  ')}${e.values.length > (opt['show-members'] ? 60 : 14) ? ' …' : ''}`);
  }
  if (out.length > 60) console.log(`\n…另有 ${out.length - 60} 个，见 --out 或 --grep`);
}
if (opt.out) {
  fs.writeFileSync(opt.out, out.map(e => [e.kind, e.name, e.count, e.file, e.values.join(' ')].join('\t')).join('\n') + '\n', 'utf8');
  console.log('\nfull -> ' + opt.out);
}
