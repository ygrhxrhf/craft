/**
 * Tags embedded in i18n values (G320). A value is not plain text: the collected corpus has 53 keys
 * carrying 17 kinds of tag, and the names fall into five naming styles. A renderer that only does
 * positional substitution leaks the tags into the UI, so the vocabulary is recorded here.
 */

/** The 17 tag names, with the count each appears at in the corpus. */
export const EMBEDDED_TAGS: readonly { name: string; count: number }[] = [
  { name: 'strong', count: 18 },
  { name: 'highlight', count: 17 },
  { name: 'username', count: 4 },
  { name: 'formattedlink', count: 3 },
  { name: 'toclink', count: 2 },
  { name: 'privacylink', count: 2 },
  { name: 'logoutlink', count: 2 },
  { name: 'helpsitelink', count: 2 },
  { name: 'guidelink', count: 2 },
  { name: 'domainlink', count: 2 },
  { name: 'name', count: 2 },
  { name: 'italic', count: 2 },
  { name: 'emojiwrapper', count: 2 },
  { name: 'code', count: 2 },
  { name: 'bold', count: 2 },
  { name: 'b', count: 1 },
  { name: 'br', count: 1 },
] as const;

/** The five naming styles the tags use. */
export type TagNamingStyle =
  | 'htmlStandard'
  | 'customLowercase'
  | 'elementAsStyle'
  | 'pascalCase'
  | 'selfClosing';

const ELEMENT_AS_STYLE = new Set(['italic', 'bold', 'highlight']);
const CUSTOM_LOWERCASE = new Set([
  'username',
  'formattedlink',
  'toclink',
  'privacylink',
  'logoutlink',
  'helpsitelink',
  'guidelink',
  'domainlink',
  'name',
  'emojiwrapper',
]);

/** Which naming style a tag belongs to. */
export function tagNamingStyle(name: string): TagNamingStyle | null {
  if (name === 'br') return 'selfClosing';
  if (/^[A-Z]/.test(name)) return 'pascalCase'; // e.g. <UncoloredLink>
  if (ELEMENT_AS_STYLE.has(name)) return 'elementAsStyle';
  if (name === 'strong' || name === 'code' || name === 'b') return 'htmlStandard';
  return CUSTOM_LOWERCASE.has(name) ? 'customLowercase' : null;
}

/** Whether a tag name is one of the collected 17. */
export function isKnownTag(name: string): boolean {
  return EMBEDDED_TAGS.some((tag) => tag.name === name) || /^[A-Z]/.test(name);
}

/**
 * Strip every embedded tag, leaving the text a plain renderer can show. Self-closing `<br/>`
 * becomes a newline; everything else disappears. Used where the rich renderer is not available.
 */
export function stripEmbeddedTags(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[A-Za-z][\w-]*\s*\/?>/g, '');
}
