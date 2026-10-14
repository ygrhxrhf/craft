/**
 * The screen's task-list rule (G958). The official split is that the data side keeps tasks whose
 * document sits in the trash, while every on-screen list drops them — so the filter belongs at the
 * read boundary, not in the UI rows that already have to handle a missing title.
 *
 * A task with no `documentId` is an inbox task, and a `documentId` whose row cannot be found is left
 * alone: hard deletes null the relation out rather than leaving a dangling id, so a missing row here
 * is not evidence the document was trashed.
 */
export function listsTaskFromDocument(
  documentId: string | null,
  document: { isDeleted: boolean } | null
): boolean {
  if (!documentId || !document) return true;
  return !document.isDeleted;
}
