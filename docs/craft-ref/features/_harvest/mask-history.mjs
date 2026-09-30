import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(process.cwd(), 'docs', 'craft-ref', 'features');
const mapPath = 'D:/code/cs/docs/craft-ref/features/_harvest/uuid-map.json';

const raw = JSON.parse(readFileSync(mapPath, 'utf8'));
const entries = Object.values(raw).map((e) => (typeof e === 'string' ? { uuid: e } : e));
const byUuid = new Map(entries.filter((e) => e.uuid).map((e) => [e.uuid.toLowerCase(), e.token]));

const RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
let next = byUuid.size + 1;
let files = 0;
let hits = 0;
const unmapped = [];

let stat;
try {
  stat = readdirSync(dir);
} catch {
  console.log('no docs dir in this tree, skipping');
  process.exit(0);
}

for (const f of stat.filter((x) => x.endsWith('.md'))) {
  const p = join(dir, f);
  const before = readFileSync(p, 'utf8');
  let local = 0;
  const after = before.replace(RE, (m) => {
    const k = m.toLowerCase();
    let token = byUuid.get(k);
    if (!token) {
      token = `<objId:${next++}>`;
      byUuid.set(k, token);
      unmapped.push(k + '->' + token);
    }
    local += 1;
    return token;
  });
  if (local > 0) {
    writeFileSync(p, after);
    files += 1;
    hits += local;
  }
}

const leftover = readdirSync(dir).filter((x) => x.endsWith('.md')).filter((f) => RE.test(readFileSync(join(dir, f), 'utf8'))).length;
RE.lastIndex = 0;
console.log(`mask-history: files=${files} replacements=${hits} unmapped=${unmapped.length} leftoverFiles=${leftover}`);
if (leftover > 0) {
  console.log('MASK FAILED: full UUIDs still present');
  process.exit(1);
}
