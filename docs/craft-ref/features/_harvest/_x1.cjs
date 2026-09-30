const fs = require('fs');
const p = 'D:/code/cs/docs/craft-ref/features/_harvest/_tmp-cew.txt';
let s = fs.readFileSync(p, 'utf8');
s = JSON.parse(s);
const start = s.indexOf('V=[{id:"auto"');
if (start < 0) { console.log('NO V'); process.exit(0); }
let i = s.indexOf('[', start), depth = 0, end = -1;
for (let j = i; j < s.length; j++) {
  const c = s[j];
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { end = j + 1; break; } }
  if (j - i > 20000) break;
}
const arr = s.slice(i, end);
console.log('RAW_LEN ' + arr.length);
console.log(arr.slice(0, 4000));
