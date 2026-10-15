import { describe, expect, it } from 'vitest';

import {
  DELETE_FOLDER_LABEL,
  DELETE_FOLDER_LABEL_KEY,
  DELETE_FOLDER_SUBTITLE,
  DELETE_FOLDER_SUBTITLE_KEY,
} from './delete-copy';

/**
 * G241: deleting a folder is confirmed, and the confirmation says the folder's documents survive.
 * Both lines are verbatim from the pack.
 */
describe('the folder-delete confirmation', () => {
  it('names the action with the official label', () => {
    expect(DELETE_FOLDER_LABEL).toBe('删除文件夹');
    expect(DELETE_FOLDER_LABEL_KEY).toBe('delete.folder');
  });

  it('states that the documents are kept', () => {
    expect(DELETE_FOLDER_SUBTITLE).toBe('不会删除文件夹中的文档。');
    expect(DELETE_FOLDER_SUBTITLE_KEY).toBe('browse.folder.deleteprompt.subtitle');
  });
});
