/**
 * The markdown flavour table (G1200). Official Craft's export package carries exactly one flavour
 * object, and these are its 29 fields verbatim. The two that differ from a naive writer are worth
 * naming: `todoListStyleChecked` uses a capital `X`, and `indentationCharacters` is three spaces
 * (not a tab, not two), which is what makes a nested list round-trip.
 */
export interface MarkdownFlavour {
  caption: string;
  body: string;
  pageCard: string;
  pageRegular: string;
  strong: string;
  heading: string;
  subtitle: string;
  title: string;
  focus: string;
  block: string;
  bold: string;
  italic: string;
  strikethrough: string;
  code: string;
  highlight: string;
  numberedListStyle: string;
  bulletListStyle: string;
  toggleListStyle: string;
  todoListStyleChecked: string;
  todoListStyleUnchecked: string;
  lineStyle: string;
  fixListOrders: boolean;
  fixIndentationLevel: boolean;
  indentationCharacters: string;
  artificialNewLines: boolean;
  blockLinkStyle: string;
  base64Assets: boolean;
  printFullCss: boolean;
  subPageStyle: string;
}

export const DEFAULT_FLAVOUR: MarkdownFlavour = {
  caption: '',
  body: '',
  pageCard: '#### ',
  pageRegular: '#### ',
  strong: '#### ',
  heading: '### ',
  subtitle: '## ',
  title: '# ',
  focus: '> ',
  block: '> ',
  bold: '**',
  italic: '*',
  strikethrough: '~~',
  code: '`',
  highlight: '::',
  numberedListStyle: '{number}. ',
  bulletListStyle: '- ',
  toggleListStyle: '+ ',
  todoListStyleChecked: '- [X] ',
  todoListStyleUnchecked: '- [ ] ',
  lineStyle: '---',
  fixListOrders: true,
  fixIndentationLevel: false,
  indentationCharacters: '   ',
  artificialNewLines: false,
  blockLinkStyle: 'blockLink',
  base64Assets: false,
  printFullCss: false,
  subPageStyle: 'flat',
};

/** The list bullet a node kind writes, read straight off the flavour. */
export function listMarker(flavour: MarkdownFlavour, kind: 'bullet' | 'toggle' | 'todo' | 'numbered'): string {
  switch (kind) {
    case 'bullet':
      return flavour.bulletListStyle;
    case 'toggle':
      return flavour.toggleListStyle;
    case 'todo':
      return flavour.todoListStyleUnchecked;
    case 'numbered':
      return flavour.numberedListStyle;
  }
}

/** One nesting level of indent, verbatim three spaces. */
export function indentFor(flavour: MarkdownFlavour, depth: number): string {
  return flavour.indentationCharacters.repeat(Math.max(0, depth));
}
