import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const route = read('../../app/api/ai/route.ts');
const bubble = read('../../components/editor/bubble-menu/AiBubbleMenu.tsx');
const editor = read('../../components/editor/Editor.tsx');

/** G116 的接线闸：结构化上下文从编辑器一路送到模型消息，且按 id 去重。 */
describe('the AI request carries structured context (G116)', () => {
  it('parses, dedupes and renders the context on the server', () => {
    expect(route).toContain('parseAiContext(body.context)');
    expect(route).toContain('renderContextPrompt(context)');
    expect(route).toContain("role: 'user', content: userContent");
  });

  it('sends the current document from the bubble menu', () => {
    expect(bubble).toContain('contextFromDocument({ documentId, textContent: editor.getText() })');
    expect(bubble).toContain('context: contextForRequest()');
    expect(bubble.match(/context: contextForRequest\(\)/g)).toHaveLength(2);
  });

  it('gives the bubble menu the document id from the editor', () => {
    expect(editor).toContain('<AiBubbleMenu editor={editor} documentId={documentId} />');
  });
});
