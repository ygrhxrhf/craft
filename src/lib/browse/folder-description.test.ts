import { describe, expect, it } from 'vitest';

import {
  ADD_DESCRIPTION_TO_FOLDER,
  EDIT_DESCRIPTION_LABEL,
  folderDescriptionLabel,
} from './folder-description';

describe('G241 — a folder with no description invites one', () => {
  it('uses the official label while the field is empty', () => {
    // browse.add.description.to.folder
    expect(ADD_DESCRIPTION_TO_FOLDER).toBe('向此文件夹添加说明');
    expect(folderDescriptionLabel(null)).toBe(ADD_DESCRIPTION_TO_FOLDER);
    expect(folderDescriptionLabel(undefined)).toBe(ADD_DESCRIPTION_TO_FOLDER);
    expect(folderDescriptionLabel('   ')).toBe(ADD_DESCRIPTION_TO_FOLDER);
  });

  it('switches to editing once the folder has text', () => {
    expect(folderDescriptionLabel('项目资料')).toBe(EDIT_DESCRIPTION_LABEL);
  });
});