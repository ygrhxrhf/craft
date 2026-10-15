import { describe, expect, it } from 'vitest';

import {
  CANNOT_RESTORE_DOCUMENT,
  CANNOT_RESTORE_DOCUMENT_KEY,
  DOCUMENT_RESTORED,
  DOCUMENT_RESTORED_KEY,
  GO_TO_DOCUMENT,
  GO_TO_RESTORED_DOCUMENT,
  GO_TO_RESTORED_DOCUMENT_KEY,
  RESTORE_VERSION_PROMPT,
  RESTORE_VERSION_PROMPT_KEY,
} from './backup-restore-copy';

/**
 * G230: restoring a version produces a new document and navigates to it. The 「转至已恢复的文档」
 * line is the proof — there has to be a restored document to go to. All wording is verbatim.
 */
describe('the restore flow copy', () => {
  it('prompts with the collected sentence', () => {
    expect(RESTORE_VERSION_PROMPT).toBe('选择要恢复的版本。');
    expect(RESTORE_VERSION_PROMPT_KEY).toBe('backup.version.to.restore');
  });

  it('announces the result and offers the way to it', () => {
    expect(DOCUMENT_RESTORED).toBe('文档已恢复');
    expect(DOCUMENT_RESTORED_KEY).toBe('backup.document.restored');
    expect(GO_TO_RESTORED_DOCUMENT).toBe('转至已恢复的文档');
    expect(GO_TO_RESTORED_DOCUMENT_KEY).toBe('backup.go.to.restored.document');
  });

  it('has a distinct failure sentence, not a generic one', () => {
    expect(CANNOT_RESTORE_DOCUMENT).toBe('无法恢复文档');
    expect(CANNOT_RESTORE_DOCUMENT_KEY).toBe('snapshot.cannot.restore.document');
    expect(CANNOT_RESTORE_DOCUMENT).not.toBe(DOCUMENT_RESTORED);
  });

  it('keeps the plain "go to document" line separate from the restored one', () => {
    expect(GO_TO_DOCUMENT).toBe('转至文档');
    expect(GO_TO_DOCUMENT).not.toBe(GO_TO_RESTORED_DOCUMENT);
  });
});
