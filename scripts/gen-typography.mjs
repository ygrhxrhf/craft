// Generates the typography token block + bridge classes (G1092) and appends them to globals.css.
// Run with `node scripts/gen-typography.mjs`. Idempotent: replaces the block between the markers.
import { readFileSync, writeFileSync } from 'node:fs';

const {
  UI_TOKENS,
  HEADING_TOKENS,
  HEADING_ALLCAPS,
  CAPTION_TOKENS,
  BODY_TOKENS,
  BODY_ITALIC,
  TYPOGRAPHY_CLASSES,
} = await import('../src/lib/editor/typography-tokens.ts');

const START = '/* === TYPOGRAPHY TOKENS (generated, G1092) === */';
const END = '/* === END TYPOGRAPHY TOKENS === */';

const lines = [];
lines.push(START);
lines.push('/* The four token families, verbatim from the collected table. */');
lines.push(':root, .token-scope {');
lines.push('  /* The bridge classes\' single font entry point: swapping the face changes this one');
lines.push('     variable, never the class. */');
lines.push('  --font-family: var(--font-sans);');

const emit = (prefix, groups) => {
  for (const [group, [size, weight, lineHeight, letterSpacing]] of Object.entries(groups)) {
    lines.push(`  --${prefix}-${group}-size: ${size};`);
    lines.push(`  --${prefix}-${group}-weight: ${weight};`);
    lines.push(`  --${prefix}-${group}-line-height: ${lineHeight};`);
    lines.push(`  --${prefix}-${group}-letter-spacing: ${letterSpacing};`);
  }
};

emit('ui', UI_TOKENS);
emit('heading', HEADING_TOKENS);
for (const [group, spacing] of Object.entries(HEADING_ALLCAPS)) {
  lines.push(`  --heading-${group}-allcaps-transform: uppercase;`);
  lines.push(`  --heading-${group}-allcaps-letter-spacing: ${spacing};`);
}
emit('caption', CAPTION_TOKENS);
emit('body', BODY_TOKENS);
for (const [group, [size, weight, lineHeight, letterSpacing]] of Object.entries(BODY_ITALIC)) {
  lines.push(`  --body-${group}-size: ${size};`);
  lines.push(`  --body-${group}-weight: ${weight};`);
  lines.push(`  --body-${group}-line-height: ${lineHeight};`);
  lines.push(`  --body-${group}-letter-spacing: ${letterSpacing};`);
  lines.push(`  --body-${group}-style: italic;`);
}
lines.push('}');
lines.push('');
lines.push('@layer base {');
lines.push('  /* The 31 bridge classes: one per token group, each the same eight declarations. */');

const classBody = (name) => {
  const [prefix, ...rest] = name.split('-');
  const group = rest.join('-');
  const italic = group.endsWith('-italic');
  const allcaps = group.endsWith('-allcaps');
  const out = [
    'font-family: var(--font-family);',
    '-webkit-font-smoothing: antialiased;',
    'font-variant-numeric: lining-nums;',
    'font-feature-settings: "lnum" 1, "calt" 1;',
    `font-size: var(--${prefix}-${group}-size);`,
    `font-weight: var(--${prefix}-${group}-weight);`,
    `line-height: var(--${prefix}-${group}-line-height);`,
    `letter-spacing: var(--${prefix}-${group}-letter-spacing);`,
  ];
  if (italic) out.push(`font-style: var(--${prefix}-${group}-style);`);
  if (allcaps) {
    const base = group.replace('-allcaps', '');
    out.push(`text-transform: var(--${prefix}-${base}-allcaps-transform);`);
    out.push(`letter-spacing: var(--${prefix}-${base}-allcaps-letter-spacing);`);
  }
  return out;
};

const names = TYPOGRAPHY_CLASSES;

for (const name of names) {
  const body = classBody(name);
  lines.push(`  .typography-${name} {`);
  for (const decl of body) lines.push(`    ${decl}`);
  lines.push('  }');
}
lines.push('}');
lines.push(END);

const block = lines.join('\n');
const path = 'src/app/globals.css';
let css = readFileSync(path, 'utf8');
const start = css.indexOf(START);
const end = css.indexOf(END);
if (start !== -1 && end !== -1) {
  css = css.slice(0, start) + block + css.slice(end + END.length);
} else {
  css = css.trimEnd() + '\n\n' + block + '\n';
}
writeFileSync(path, css);
console.log('typography block written:', names.length, 'classes');
