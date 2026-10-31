import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync('docs/craft-ref/features/commands-catalog.md', 'utf8');
const pattern = /^- (.+?)\s+`(commands\.[^`]+)`\s*$/gm;
const rows = [];
let match;
while ((match = pattern.exec(source))) {
  rows.push({ id: match[2], title: match[1], group: match[2].split('.')[1] ?? 'commands' });
}
const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
const body = `// Generated from docs/craft-ref/features/commands-catalog.md (189 entries).\nexport interface OfficialCommand {\n  id: string;\n  title: string;\n  group: string;\n}\n\nexport const OFFICIAL_COMMANDS: OfficialCommand[] = ${JSON.stringify(unique, null, 2)};\n`;
writeFileSync('src/lib/commands/official-catalog.ts', body);
console.log('wrote', unique.length);
