/**
 * The code-block language list (G1086). Official Craft stores a `storedLangCode` on the block and
 * hands a separate `langCode` to the highlighter — the two spellings are not interchangeable, and
 * five entries differ (`cs`/`csharp`, `typescript`/`tsx`, `objectivec`/`objectiveC`,
 * `math_formula`/`stex`, and `vbnet` whose label is further away still). `plaintext` carries a
 * `null` langCode, which is how "highlighting off" is expressed, and the last entry `other` is the
 * fallback for an unknown language.
 */
export interface CodeLanguage {
  /** What goes on the block attribute. */
  storedLangCode: string;
  /** What the highlighter is asked for; `null` means "no highlighting". */
  langCode: string | null;
  /** What the menu prints. */
  label: string;
}

export const CODE_LANGUAGES: readonly CodeLanguage[] = [
  { storedLangCode: 'ada', langCode: 'ada', label: 'Ada' },
  { storedLangCode: 'bash', langCode: 'bash', label: 'Bash' },
  { storedLangCode: 'cpp', langCode: 'cpp', label: 'C++' },
  { storedLangCode: 'cs', langCode: 'csharp', label: 'C#' },
  { storedLangCode: 'css', langCode: 'css', label: 'CSS' },
  { storedLangCode: 'dart', langCode: 'dart', label: 'Dart' },
  { storedLangCode: 'dockerfile', langCode: 'dockerfile', label: 'Dockerfile' },
  { storedLangCode: 'math_formula', langCode: 'stex', label: 'Formula (TeX)' },
  { storedLangCode: 'go', langCode: 'go', label: 'Go' },
  { storedLangCode: 'groovy', langCode: 'groovy', label: 'Groovy' },
  { storedLangCode: 'haskell', langCode: 'haskell', label: 'Haskell' },
  { storedLangCode: 'html', langCode: 'html', label: 'HTML' },
  { storedLangCode: 'java', langCode: 'java', label: 'Java' },
  { storedLangCode: 'javascript', langCode: 'javascript', label: 'JavaScript' },
  { storedLangCode: 'json', langCode: 'json', label: 'JSON' },
  { storedLangCode: 'julia', langCode: 'julia', label: 'Julia' },
  { storedLangCode: 'kotlin', langCode: 'kotlin', label: 'Kotlin' },
  { storedLangCode: 'lua', langCode: 'lua', label: 'Lua' },
  { storedLangCode: 'markdown', langCode: 'markdown', label: 'Markdown' },
  { storedLangCode: 'matlab', langCode: 'matlab', label: 'MATLAB' },
  { storedLangCode: 'mermaid', langCode: 'mermaid', label: 'Mermaid' },
  { storedLangCode: 'objectivec', langCode: 'objectiveC', label: 'Objective-C' },
  { storedLangCode: 'perl', langCode: 'perl', label: 'Perl' },
  { storedLangCode: 'php', langCode: 'php', label: 'PHP' },
  { storedLangCode: 'prolog', langCode: 'prolog', label: 'Prolog' },
  { storedLangCode: 'plaintext', langCode: null, label: 'Plain text' },
  { storedLangCode: 'python', langCode: 'python', label: 'Python' },
  { storedLangCode: 'r', langCode: 'r', label: 'R' },
  { storedLangCode: 'ruby', langCode: 'ruby', label: 'Ruby' },
  { storedLangCode: 'rust', langCode: 'rust', label: 'Rust' },
  { storedLangCode: 'scala', langCode: 'scala', label: 'Scala' },
  { storedLangCode: 'shell', langCode: 'shell', label: 'Shell' },
  { storedLangCode: 'sql', langCode: 'sql', label: 'SQL' },
  { storedLangCode: 'swift', langCode: 'swift', label: 'Swift' },
  { storedLangCode: 'typescript', langCode: 'tsx', label: 'TypeScript' },
  { storedLangCode: 'vbnet', langCode: 'vbnet', label: 'Visual Basic.NET' },
  { storedLangCode: 'xml', langCode: 'xml', label: 'XML' },
  { storedLangCode: 'yaml', langCode: 'yaml', label: 'YAML' },
  { storedLangCode: 'other', langCode: 'other', label: 'Other' },
] as const;

const BY_STORED = new Map(CODE_LANGUAGES.map((entry) => [entry.storedLangCode, entry]));

export function languageFor(storedLangCode: unknown): CodeLanguage | undefined {
  return typeof storedLangCode === 'string' ? BY_STORED.get(storedLangCode) : undefined;
}

/** What the block prints: the label, falling back to the raw code when it is not a known one. */
export function languageLabel(storedLangCode: unknown): string {
  if (typeof storedLangCode !== 'string' || !storedLangCode) return 'Plain text';
  return BY_STORED.get(storedLangCode)?.label ?? storedLangCode;
}
