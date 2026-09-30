import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'docs/craft-ref';
const SKIP = new Set(['_harvest', 'node_modules', '.git', 'raw', 'screens', 'local']);
const TEXT = /\.(md|json|txt|tsv)$/i;

const RULES = [
  ['C:\\Users\\omen\\AppData\\Local\\Temp', '<系统Temp>'],
  ['zhang meng', '<账户持有人>'],
  ['3b788e8c-7aa3-d2e8-fc70-0c112def1581', '<spaceId>'],
  ['3b788e8c-…', '<spaceId>'],
  ['3b788e8c…', '<spaceId>'],
  ['zhang\'s-Space--<spaceId>', '<空间名--spaceId>'],
  ['zhang\\\'s Space', '<空间名>'],
  ['zhang\'s Space', '<空间名>'],
  ['zhang\'s-Space', '<空间名>'],
  ['zhang\'s', '<空间名>'],
];
const FORBIDDEN = ['3b788e8c', 'zhang', 'C:\\Users\\omen'];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

const mapPath = 'D:/code/cs/docs/craft-ref/features/_harvest/uuid-map.json';
const seed = JSON.parse(readFileSync(mapPath, 'utf8'));
const idMap = new Map(seed.map((e) => [e.uuid.toLowerCase(), e.token]));
let nextIndex = idMap.size;

if (!existsSync(ROOT)) {
  console.log('mask2: no docs/craft-ref in this tree, skipping');
  process.exit(0);
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (SKIP.has(e.name)) continue;
      walk(join(dir, e.name), acc);
    } else if (TEXT.test(e.name)) {
      acc.push(join(dir, e.name));
    }
  }
  return acc;
}

const files = walk(ROOT);
let rewritten = 0;
let hits = 0;

for (const f of files) {
  const before = readFileSync(f, 'utf8');
  let after = before;
  for (const [from, to] of RULES) {
    let n = 0;
    while (after.includes(from)) {
      after = after.replace(from, to);
      n += 1;
    }
    hits += n;
  }
  after = after.replace(UUID_RE, (m) => {
    const k = m.toLowerCase();
    let token = idMap.get(k);
    if (!token) token = `<objId:${++nextIndex}>`, idMap.set(k, token);
    return token;
  });
  if (after !== before) {
    writeFileSync(f, after);
    rewritten += 1;
  }
}

let leaks = 0;
for (const f of walk(ROOT)) {
  const txt = readFileSync(f, 'utf8');
  for (const needle of FORBIDDEN) if (txt.includes(needle)) leaks += 1;
  if (txt.match(UUID_RE)) leaks += 1;
}

console.log(`mask2: scanned=${files.length} rewritten=${rewritten} ruleHits=${hits} leaks=${leaks}`);
if (leaks > 0) {
  console.log('MASK2 FAILED');
  process.exit(1);
}
