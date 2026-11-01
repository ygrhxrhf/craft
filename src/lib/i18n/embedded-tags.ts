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

/**
 * G320: the segments a tagged value renders into. A `link` segment carries the tag name so the
 * caller can pick the destination; every other tag maps onto a text decoration.
 */
export type EmbeddedSegment =
  | { kind: 'text'; text: string; styles: string[] }
  | { kind: 'link'; text: string; tag: string }
  | { kind: 'break' };

const STYLE_BY_TAG: Record<string, string> = {
  strong: 'bold',
  b: 'bold',
  bold: 'bold',
  italic: 'italic',
  code: 'code',
  highlight: 'highlight',
};

const LINK_TAGS = new Set([
  'formattedlink',
  'toclink',
  'privacylink',
  'logoutlink',
  'helpsitelink',
  'guidelink',
  'domainlink',
]);

/**
 * Parse a tagged value into renderable segments. Unknown tags are dropped (their text is kept),
 * which is what keeps the 53 tagged keys from leaking markup into the UI.
 */
export function parseEmbeddedTags(value: string): EmbeddedSegment[] {
  const segments: EmbeddedSegment[] = [];
  const stack: string[] = [];
  let rest = value;

  const pushText = (text: string) => {
    if (!text) return;
    const styles = stack.map((tag) => STYLE_BY_TAG[tag]).filter(Boolean);
    segments.push({ kind: 'text', text, styles });
  };

  while (rest.length) {
    const match = /<(\/?)([A-Za-z][\w-]*)\s*(\/?)>/.exec(rest);
    if (!match) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, match.index));
    const [, closing, rawName, selfClosing] = match;
    const name = rawName.toLowerCase();

    if (selfClosing || name === 'br') {
      segments.push({ kind: 'break' });
    } else if (closing) {
      // Pop the innermost matching tag; a stray close is ignored.
      const at = stack.lastIndexOf(name);
      if (at >= 0) stack.splice(at, 1);
    } else if (LINK_TAGS.has(name)) {
      // A link tag wraps the rest until its close; capture its body as one link segment.
      const close = new RegExp(`</${rawName}\\s*>`, 'i');
      const body = rest.slice(match.index + match[0].length);
      const end = body.search(close);
      const text = end >= 0 ? body.slice(0, end) : body;
      segments.push({ kind: 'link', text: stripEmbeddedTags(text), tag: name });
      rest = end >= 0 ? body.slice(end + body.slice(end).match(close)![0].length) : '';
      continue;
    } else {
      stack.push(name);
    }
    rest = rest.slice(match.index + match[0].length);
  }

  return segments;
}
