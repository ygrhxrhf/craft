/**
 * Restoring a version produces a **new document** and navigates to it (G230). The proof is the
 * collected follow-up line: 「转至已恢复的文档」 only makes sense if there is a *restored document*
 * to go to — an in-place rollback would leave the reader on the same page. The dialog's own prompt
 * and both failure/redirect lines are verbatim from the pack.
 */

export const RESTORE_VERSION_PROMPT = '选择要恢复的版本。';
export const RESTORE_VERSION_PROMPT_KEY = 'backup.version.to.restore';

export const DOCUMENT_RESTORED = '文档已恢复';
export const DOCUMENT_RESTORED_KEY = 'backup.document.restored';

export const GO_TO_RESTORED_DOCUMENT = '转至已恢复的文档';
export const GO_TO_RESTORED_DOCUMENT_KEY = 'backup.go.to.restored.document';

export const CANNOT_RESTORE_DOCUMENT = '无法恢复文档';
export const CANNOT_RESTORE_DOCUMENT_KEY = 'snapshot.cannot.restore.document';

export const GO_TO_DOCUMENT = '转至文档';
export const GO_TO_DOCUMENT_KEY = 'snapshot.go.to.document';
