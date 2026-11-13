import { readFileSync, writeFileSync } from 'node:fs';
const root = 'docs/craft-ref/features';
const tpl = readFileSync(`${root}/_audit/replication-backlog.template.md`, 'utf8');
const t = JSON.parse(readFileSync(`${root}/_audit/backlog-tables.json`, 'utf8'));
const d = JSON.parse(readFileSync(`${root}/_audit/backlog-digest.json`, 'utf8'));
const out = tpl
  .replace('{{P0}}', t.p0)
  .replace('{{P1}}', t.p1)
  .replace('{{P2}}', t.p2)
  .replace('{{CONFLICTS}}', t.conflicts)
  .replace('{{GAPS}}', t.gaps)
  .replaceAll('{{P0N}}', String(d.explicit.P0.length))
  .replaceAll('{{P1N}}', String(d.explicit.P1.length))
  .replaceAll('{{P2N}}', String(d.explicit.P2.length))
  .replaceAll('{{CONFLICTN}}', String(d.conflicts.length));
writeFileSync(`${root}/replication-backlog.md`, out);
console.log('wrote', `${root}/replication-backlog.md`, out.length);
