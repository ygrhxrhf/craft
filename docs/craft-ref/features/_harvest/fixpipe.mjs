import fs from 'node:fs';
const file = 'gap.md';
const L = fs.readFileSync(file, 'utf8').split(/\r?\n/);
let step1 = 0, step2 = 0;
for (let i = 2057; i < 2090 && i < L.length; i++) {
  let s = L[i];
  if (!s.startsWith('|')) continue;
  // 1) 把误写的「＼|\|」整体换成合法转义「\|」
  s = s.replace(/＼\|\\?\|/g, () => { step1++; return '\\|'; });
  // 2) 其余夹在内容里的裸竖线（前后不是空格）一律转义
  let out = '';
  for (let j = 0; j < s.length; j++) {
    if (s[j] === '|') {
      const prev = j > 0 ? s[j - 1] : '';
      const next = j + 1 < s.length ? s[j + 1] : '';
      const structural = (prev === '' || prev === ' ') && (next === '' || next === ' ');
      if (!structural && prev !== '\\') { out += '\\|'; step2++; continue; }
    }
    out += s[j];
  }
  L[i] = out;
}
fs.writeFileSync(file, L.join('\n'));
const bad = [];
for (let i = 2057; i < 2090 && i < L.length; i++) {
  const s = L[i];
  if (!s.startsWith('|')) continue;
  const n = s.replace(/\\\|/g, '@').split('|').length;
  if (n !== 7) bad.push('L' + (i + 1) + '=' + n);
}
console.log('step1=' + step1 + ' step2=' + step2 + ' leftoverFullWidth=' + (L.slice(2057, 2090).join('\n').split('＼').length - 1) + ' badRows=' + (bad.length ? bad.join(',') : 'NONE'));
