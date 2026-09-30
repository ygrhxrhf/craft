import fs from 'node:fs';
import path from 'node:path';

const dir = 'D:/code/cs/docs/craft-ref/features/_harvest/js';
const targets = process.argv.slice(2);
for (const t of targets) {
  const f = fs.readdirSync(dir).find(x => x.startsWith(t + '-'));
  if (!f) { console.log(`## ${t}: chunk not found`); continue; }
  const b = fs.readFileSync(path.join(dir, f), 'utf8');
  const keys = new Set();
  for (const m of b.matchAll(/["'`]([a-z][a-z0-9]*(?:\.[a-zA-Z0-9_\-]+)+)["'`]/g)) keys.add(m[1]);
  const strs = new Set();
  for (const m of b.matchAll(/defaultValue[:=]?\s*["'`]([^"'`]{4,70})["'`]/g)) strs.add(m[1]);
  const arr = [...keys].sort();
  console.log(`## ${t} (${b.length} bytes) i18nKeys=${arr.length} defaultValues=${strs.size}`);
  console.log('KEYS: ' + arr.slice(0, 60).join(' '));
  if (strs.size) console.log('LITERAL: ' + [...strs].slice(0, 12).join(' | '));
  console.log('');
}
