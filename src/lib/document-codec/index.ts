import { DEFAULT_FLAVOUR } from './flavour';
import { projectPayload } from './block-payload';
import { EXPORT_TAG_BY_STYLE, textStyleForHeadingLevel } from '@/lib/editor/text-style';
import { DEFAULT_DIVIDER_STYLE, DIVIDER_MARKUP_PATTERN, dividerMarkupFromStyle } from '@/lib/editor/divider-styles';

export type ExportFormat = 'markdown' | 'html' | 'text' | 'json';

function textContent(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text ?? '';
  const inner = Array.isArray(node.content) ? node.content.map(textContent).join('') : '';
  // Atom nodes keep their label in an attribute, so an attachment or a whiteboard
  // link still says something in the plain-text export.
  return inner || node.attrs?.title || node.attrs?.name || '';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

function blockTargetHref(node: any): string {
  const base = `/documents/${node.attrs?.documentId ?? ''}`;
  if (node.attrs?.blockId) return `${base}#b-${node.attrs.blockId}`;
  if (typeof node.attrs?.blockIndex === 'number') return `${base}#i-${node.attrs.blockIndex}`;
  return base;
}

/**
 * G1221: `blockLinkStyle` 是官方 flavour 里**唯一能改写块链语义**的字段——
 * `pageLink` 只指向文档根（去掉块锚），`headerLink`/`blockLink` 保留块锚。
 */
export function blockLinkHref(node: any, style: string): string {
  const href = blockTargetHref(node);
  if (style === 'pageLink') return href.split('#')[0];
  return href;
}

function mirrorTargetHref(node: any): string {
  return blockTargetHref({
    attrs: {
      documentId: node.attrs?.sourceDocumentId,
      blockId: node.attrs?.sourceBlockId,
      blockIndex: node.attrs?.sourceBlockIndex,
    },
  });
}

// A person mention carries a userId and no documentId, so there is no document to
// link to — exporting it as a link would fabricate `/documents/` with an empty id.
function isPersonMention(node: any): boolean {
  return node.type === 'mention' && !node.attrs?.documentId;
}

function renderInlineMarkdown(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let value = node.text ?? '';
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') value = `**${value}**`;
      if (mark.type === 'italic') value = `*${value}*`;
      if (mark.type === 'code') value = `\`${value}\``;
      // The official flavour writes a highlight as `::text::` (G1200).
      if (mark.type === 'highlight') value = `::${value}::`;
      if (mark.type === 'link') value = `[${value}](${mark.attrs?.href ?? ''})`;
    }
    return value;
  }
  if (node.type === 'inlineMath') return `$${node.attrs?.latex ?? ''}$`;
  if (node.type === 'mention' || node.type === 'blockLink') {
    if (isPersonMention(node)) return `@${node.attrs?.title ?? ''}`;
    return `[${node.attrs?.title ?? '链接'}](${blockLinkHref(node, DEFAULT_FLAVOUR.blockLinkStyle)})`;
  }
  if (node.type === 'whiteboardLink') {
    return `[白板：${node.attrs?.title ?? ''}](/whiteboards/${node.attrs?.whiteboardId ?? ''})`;
  }
  return Array.isArray(node.content) ? node.content.map(renderInlineMarkdown).join('') : '';
}

const LIST_NODE_TYPES = ['bulletList', 'orderedList', 'taskList'];

/** Craft's flavour indents one level with three spaces (`indentationCharacters`). */
function renderList(node: any, depth: number): string {
  // G1200: indentation and every list marker come off the flavour table, so the two writers
  // (list items here, the export map below) cannot drift from the official spelling.
  const pad = DEFAULT_FLAVOUR.indentationCharacters.repeat(depth);
  return (node.content ?? []).map((item: any, index: number) => {
    // G666: a cancelled task item keeps the **unchecked** box and says the third state with a
    // strikethrough over the title (`- [ ] ~title~`) — the measured official export. `checked`
    // stays `[ ]` even when both attrs are set, because the cancel axis wins (task-status.ts).
    const cancelled = item.attrs?.cancelled === true;
    const checked = item.attrs?.checked === true && !cancelled;
    const marker = node.type === 'taskList'
      ? (checked ? DEFAULT_FLAVOUR.todoListStyleChecked : DEFAULT_FLAVOUR.todoListStyleUnchecked)
      : node.type === 'orderedList'
        ? DEFAULT_FLAVOUR.numberedListStyle.replace('{number}', String(index + 1))
        : DEFAULT_FLAVOUR.bulletListStyle;
    const children = item.content ?? [];
    const own = children.filter((child: any) => !LIST_NODE_TYPES.includes(child.type)).map(textContent).join(' ');
    // The measured export uses a **single** `~` (not the flavour's `~~` text-mark spelling).
    const line = cancelled && own ? `~${own}~` : own;
    const nested = children.filter((child: any) => LIST_NODE_TYPES.includes(child.type));
    return [`${pad}${marker}${line}`, ...nested.map((child: any) => renderList(child, depth + 1))].join('\n');
  }).join('\n');
}

function renderMarkdown(node: any): string {
  if (!node) return '';
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderMarkdown).filter(Boolean).join('\n\n');
    case 'paragraph':
      return (node.content ?? []).map(renderInlineMarkdown).join('');
    case 'heading': {
      // G275: the tag comes from the official export table, not from the level directly.
      const level = node.attrs?.level ?? 1;
      const tag = EXPORT_TAG_BY_STYLE[textStyleForHeadingLevel(level)];
      return `${'#'.repeat(Number(tag.slice(1)))} ${(node.content ?? []).map(renderInlineMarkdown).join('')}`;
    }
    case 'bulletList':
    case 'orderedList':
    case 'taskList':
      return renderList(node, 0);
    case 'blockquote':
      return (node.content ?? []).map(renderMarkdown).join('\n').split('\n').map((line: string) => `> ${line}`).join('\n');
    case 'codeBlock':
      return `\`\`\`${node.attrs?.language ?? ''}\n${textContent(node)}\n\`\`\``;
    case 'audioBlock':
      return `[音频](${node.attrs?.src ?? ''})`;
    case 'htmlBlock':
      return `\`\`\`html\n${node.attrs?.html ?? ''}\n\`\`\``;
    case 'horizontalRule':
      return '---';
    case 'divider': {
      // A line block carries its weight in its own markup (`3 + index` asterisks, G1405), so
      // writing a bare `---` would drop the style on the way out and read back as `regular`.
      // Without a style attribute the block is a plain rule, which stays `---`.
      if (!node.attrs?.style) return '---';
      const markup = dividerMarkupFromStyle(node.attrs.style);
      // `dashed` is a pre-official local style whose own markup (`=-`) the importer does not
      // accept; writing it verbatim would turn the block into a paragraph on the way back, so
      // it degrades to the default rule instead of silently disappearing. The check is the
      // importer's own pattern, shared so the two sides cannot drift apart.
      return DIVIDER_MARKUP_PATTERN.test(markup) ? markup : dividerMarkupFromStyle(DEFAULT_DIVIDER_STYLE);
    }
    case 'mathBlock':
      return `$$\n${node.attrs?.latex ?? ''}\n$$`;
    case 'columns':
      // Markdown has no columns; the content survives as sequential blocks.
      return (node.content ?? [])
        .map((column: any) => (column.content ?? []).map(renderMarkdown).filter(Boolean).join('\n\n'))
        .filter(Boolean)
        .join('\n\n');
    case 'callout': {
      // G1403：官方 markdown 是 `<callout>` 包住**原本的行首记号**（如 `<callout>#### On iOS :</callout>`），
      // 不是 `> ` 引用；色位不入串。单行内容保持单行，多行才展开。
      const inner = (node.content ?? []).map(renderMarkdown).filter(Boolean).join('\n');
      const type = node.attrs?.type && node.attrs.type !== 'info' ? ` type="${node.attrs.type}"` : '';
      return inner.includes('\n')
        ? `<callout${type}>\n${inner}\n</callout>`
        : `<callout${type}>${inner}</callout>`;
    }
    case 'cardBlock':
    case 'toggleBlock':
      return (node.content ?? []).map(renderMarkdown).filter(Boolean).join('\n\n');
    case 'table':
      return renderMarkdownTable(node);
    case 'imageGallery':
      return (node.attrs?.images ?? [])
        .map((image: { url?: string; src?: string; alt?: string }) =>
          `![${image.alt ?? ''}](${image.url ?? image.src ?? ''})`)
        .join('\n\n');
    case 'attachment':
      return `[📎 ${node.attrs?.name ?? '附件'}](${node.attrs?.url ?? ''})`;
    case 'linkPreview':
      return `[${node.attrs?.title || node.attrs?.url || '链接'}](${node.attrs?.url ?? ''})`;
    case 'videoEmbed':
      return `[视频](${node.attrs?.src ?? ''})`;
    case 'whiteboardLink':
    case 'whiteboardEmbed':
      return `[白板：${node.attrs?.title || '未命名'}](/whiteboards/${node.attrs?.whiteboardId ?? ''})`;
    case 'mirrorBlock':
      // A mirror is a pointer, so the export keeps the source address.
      return `> 镜像：[${node.attrs?.title || '未命名'}](${mirrorTargetHref(node)})`;
    case 'pageBlock':
      // G1584：页面块也是指针，导出成指向子文档的链接。
      return `[页面：${node.attrs?.title || '未命名'}](/documents/${node.attrs?.documentId ?? ''})`;
    case 'collectionBlock':
      // G214：集合块同样是指针，导出成指向集合的链接。
      return `[集合：${node.attrs?.title || '未命名'}](/collections/${node.attrs?.collectionId ?? ''})`;
    case 'drawing':
      return '_(手绘板)_';
    default:
      return textContent(node);
  }
}

function renderMarkdownTable(node: any): string {
  // G1240: the export side has to round-trip the importer's three judgements —
  // ① backslashes doubled before pipes are escaped (otherwise a trailing backslash swallows the
  //    delimiter that follows it);
  // ② an in-cell newline is written as `<br>` because that is what the importer turns back into a
  //    newline (writing a raw newline would split the row instead);
  // ③ the divider is hyphens-only, which is exactly what `isAlignmentRow` recognises on the way
  //    back in.
  const rows = (node.content ?? []).map((row: any) =>
    (row.content ?? []).map((cell: any) =>
      textContent(cell)
        .replace(/\\/g, '\\\\')
        .replace(/\|/g, '\\|')
        .replace(/\r?\n/g, '<br>')
        .trim()));
  if (rows.length === 0) return '';

  const [head, ...body] = rows;
  const divider = head.map(() => '---');
  return [head, divider, ...body]
    .map((cells) => `| ${cells.join(' | ')} |`)
    .join('\n');
}

function renderHtmlInline(node: any): string {
  if (!node) return '';
  if (node.type === 'text') {
    let value = escapeHtml(node.text ?? '');
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') value = `<strong>${value}</strong>`;
      if (mark.type === 'italic') value = `<em>${value}</em>`;
      if (mark.type === 'code') value = `<code>${value}</code>`;
      if (mark.type === 'link') value = `<a href="${escapeHtml(mark.attrs?.href ?? '')}">${value}</a>`;
    }
    return value;
  }
  return renderHtml(node);
}

function renderHtml(node: any): string {
  if (!node) return '';
  const content = (node.content ?? []).map(renderHtmlInline).join('');
  switch (node.type) {
    case 'doc': return (node.content ?? []).map(renderHtml).join('');
    case 'paragraph': return `<p>${content}</p>`;
    case 'heading': return `<h${node.attrs?.level ?? 1}>${content}</h${node.attrs?.level ?? 1}>`;
    case 'bulletList': return `<ul>${(node.content ?? []).map((item: any) => `<li>${escapeHtml(textContent(item))}</li>`).join('')}</ul>`;
    case 'orderedList': return `<ol>${(node.content ?? []).map((item: any) => `<li>${escapeHtml(textContent(item))}</li>`).join('')}</ol>`;
    case 'taskList': return `<ul data-type="taskList">${(node.content ?? []).map((item: any) => `<li data-type="taskItem"><input type="checkbox"${item.attrs?.checked ? ' checked' : ''} disabled>${escapeHtml(textContent(item))}</li>`).join('')}</ul>`;
    case 'blockquote': return `<blockquote>${content}</blockquote>`;
    case 'codeBlock': return `<pre><code>${escapeHtml(textContent(node))}</code></pre>`;
    case 'horizontalRule':
    case 'divider': return '<hr>';
    case 'columns': return `<div data-type="columns">${(node.content ?? []).map((column: any) => renderHtml(column)).join('')}</div>`;
    case 'column': return `<div data-type="column">${(node.content ?? []).map(renderHtml).join('')}</div>`;
    case 'image':
    case 'imageBlock': return `<img src="${escapeHtml(node.attrs?.src ?? node.attrs?.url ?? '')}" alt="${escapeHtml(node.attrs?.alt ?? '')}">`;
    case 'mathBlock': return `<div data-type="math-block" data-latex="${escapeHtml(node.attrs?.latex ?? '')}">$$${escapeHtml(node.attrs?.latex ?? '')}$$</div>`;
    case 'inlineMath': return `<span data-type="inline-math" data-latex="${escapeHtml(node.attrs?.latex ?? '')}">$${escapeHtml(node.attrs?.latex ?? '')}$</span>`;
    case 'callout': return `<blockquote data-type="callout" data-style="${escapeHtml(node.attrs?.type ?? 'info')}">${(node.content ?? []).map(renderHtml).join('')}</blockquote>`;
    case 'cardBlock': return `<div data-type="cardBlock">${(node.content ?? []).map(renderHtml).join('')}</div>`;
    case 'toggleBlock': {
      const children = node.content ?? [];
      const [first, ...rest] = children;
      return `<details${node.attrs?.open ? ' open' : ''}><summary>${escapeHtml(textContent(first))}</summary>${rest.map(renderHtml).join('')}</details>`;
    }
    case 'table': return `<table>${(node.content ?? []).map((row: any, index: number) => `<tr>${(row.content ?? []).map((cell: any) => `<${index === 0 ? 'th' : 'td'}>${(cell.content ?? []).map(renderHtml).join('')}</${index === 0 ? 'th' : 'td'}>`).join('')}</tr>`).join('')}</table>`;
    case 'imageGallery': return `<div data-type="imageGallery">${(node.attrs?.images ?? []).map((image: { url?: string; src?: string; alt?: string }) => `<img src="${escapeHtml(image.url ?? image.src ?? '')}" alt="${escapeHtml(image.alt ?? '')}">`).join('')}</div>`;
    case 'attachment': return `<a href="${escapeHtml(node.attrs?.url ?? '')}" data-type="attachment">📎 ${escapeHtml(node.attrs?.name ?? '附件')}</a>`;
    case 'linkPreview': return `<a href="${escapeHtml(node.attrs?.url ?? '')}" data-type="linkPreview">${escapeHtml(node.attrs?.title || node.attrs?.url || '')}</a>`;
    case 'videoEmbed': return `<iframe src="${escapeHtml(node.attrs?.src ?? '')}" data-type="videoEmbed" allowFullScreen></iframe>`;
    case 'audioBlock': return `<div data-type="audio-embed"><audio controls src="${escapeHtml(node.attrs?.src ?? '')}"></audio></div>`;
    case 'htmlBlock': return `<div data-type="html-embed"><iframe sandbox srcdoc="${escapeHtml(node.attrs?.html ?? '')}"></iframe></div>`;
    case 'whiteboardLink': return `<a href="/whiteboards/${escapeHtml(node.attrs?.whiteboardId ?? '')}" data-type="whiteboardLink">🎨 ${escapeHtml(node.attrs?.title ?? '白板')}</a>`;
    case 'whiteboardEmbed': return `<div data-type="whiteboard-embed" data-whiteboard-id="${escapeHtml(node.attrs?.whiteboardId ?? '')}" data-title="${escapeHtml(node.attrs?.title ?? '白板')}">🎨 ${escapeHtml(node.attrs?.title ?? '白板')}</div>`;
    case 'mirrorBlock': return `<div data-type="mirrorBlock"><a href="${escapeHtml(mirrorTargetHref(node))}">镜像：${escapeHtml(node.attrs?.title ?? '未命名')}</a></div>`;
    case 'pageBlock': return `<div data-type="pageBlock"><a href="/documents/${escapeHtml(node.attrs?.documentId ?? '')}">页面：${escapeHtml(node.attrs?.title || '未命名')}</a></div>`;
    case 'collectionBlock': return `<div data-type="collectionBlock"><a href="/collections/${escapeHtml(node.attrs?.collectionId ?? '')}">集合：${escapeHtml(node.attrs?.title || '未命名')}</a></div>`;
    case 'mention':
    case 'blockLink': return isPersonMention(node)
      ? `<span data-type="mention">@${escapeHtml(node.attrs?.title ?? '')}</span>`
      : `<a href="${escapeHtml(blockTargetHref(node))}" data-type="${node.type}">${escapeHtml(node.attrs?.title ?? '链接')}</a>`;
    case 'drawing': return `<div data-type="drawing">_(手绘板)_</div>`;
    default: return content || escapeHtml(textContent(node));
  }
}

const blockTypes = new Set([
  'doc', 'paragraph', 'heading', 'bulletList', 'orderedList', 'taskList',
  'taskItem', 'listItem', 'blockquote', 'codeBlock', 'horizontalRule', 'divider',
]);

function renderText(node: any): string[] {
  if (!node) return [];
  if (blockTypes.has(node.type)) {
    const inner = (node.content ?? [])
      .flatMap((child: any) => renderText(child))
      .filter(Boolean);
    return node.type === 'doc' ? inner : [inner.join('')];
  }
  const text = textContent(node);
  return text ? [text] : [];
}

export function serializeDocument(document: unknown, format: ExportFormat): string {
  if (format === 'json') return JSON.stringify(projectDocumentContainers(document), null, 2);
  if (format === 'markdown') return renderMarkdown(document).trim();
  if (format === 'html') return renderHtml(document).trim();
  return renderText(document).join('\n').trim();
}

/**
 * G400: the JSON export projects each block into the four official payload containers instead of
 * dumping the raw TipTap node. A block's `content` stays the node list (text lives there); its
 * structured payload is routed by type to `pluginData` / `objectData` / `blob`. A block whose
 * payload lands in the wrong container is rejected, naming the official error.
 */
function projectDocumentContainers(document: unknown): unknown {
  const node = document as { type?: string; content?: unknown[]; attrs?: Record<string, unknown> };
  if (!node || typeof node !== 'object') return document;
  const walk = (current: any): any => {
    if (!current || typeof current !== 'object') return current;
    const children = Array.isArray(current.content) ? current.content.map(walk) : current.content;
    if (!current.type || current.type === 'text') return { ...current, content: children };
    const projection = projectPayload({
      type: current.type,
      payload: payloadOf(current),
      text: undefined,
    });
    return {
      ...current,
      content: children,
      pluginData: projection.pluginData,
      objectData: projection.objectData,
      blob: projection.blob,
    };
  };
  return walk(node);
}

/** The structured payload a local node carries, if any (table rows, code text, whiteboard data). */
function payloadOf(node: any): unknown {
  switch (node.type) {
    case 'table':
      return node.content ?? null;
    case 'codeBlock':
      return node.content?.[0]?.text ?? '';
    case 'whiteboard':
    case 'whiteboardEmbed':
      return node.attrs?.data ?? null;
    default:
      return undefined;
  }
}
