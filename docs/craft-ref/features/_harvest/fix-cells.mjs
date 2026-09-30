import fs from 'fs';
const p = '../gap.md';
let t = fs.readFileSync(p, 'utf8');
const before = t.length;
const reps = [
  ['isMac\\|navigator.platform\\|userAgent', 'isMac 或 navigator.platform 或 userAgent'],
  ['"isMac\\|navigator.platform\\|userAgent"', '"isMac" 或 "navigator.platform" 或 "userAgent"'],
  ['Shift+Enter\\|ADD_ROW\\|insertRowBefore', 'Shift+Enter 或 ADD_ROW 或 insertRowBefore'],
  ['"insertRowBefore\\|ADD_ROW"', '"insertRowBefore" 或 "ADD_ROW"'],
  ['(event.metaKey \\|\\| event.ctrlKey)', '(event.metaKey 或 event.ctrlKey)'],
  ['(e.metaKey \\|\\| e.ctrlKey)', '(e.metaKey 或 e.ctrlKey)'],
  ['(metaKey \\|\\| ctrlKey)', '(metaKey 或 ctrlKey)'],
  ['(metaKey \\| 或 ctrlKey)', '(metaKey 或 ctrlKey)'],
  ['(event.metaKey \\| 或 event.ctrlKey)', '(event.metaKey 或 event.ctrlKey)'],
  ['(e.metaKey \\| 或 e.ctrlKey)', '(e.metaKey 或 e.ctrlKey)'],
  ['(metaKey 或 \\| ctrlKey)', '(metaKey 或 ctrlKey)'],
];
let n = 0;
for (const [a, b] of reps) {
  if (t.includes(a)) { t = t.split(a).join(b); n++; console.log('fixed: ' + a); }
}
console.log('replacements applied=' + n + ' len ' + before + '->' + t.length);
// report remaining backslash-pipe anywhere
const leftover = [...t.matchAll(/.{30}\\\|.{30}/g)].map(m => m[0]);
console.log('leftover escaped pipes: ' + leftover.length);
for (const l of leftover.slice(0, 8)) console.log('  ...' + l + '...');
fs.writeFileSync(p, t);
