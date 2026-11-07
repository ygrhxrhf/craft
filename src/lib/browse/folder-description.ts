/**
 * G241 — folders carry a description, and its entry says so.
 *
 * Official: `browse.add.description.to.folder`「向此文件夹添加说明」. The column exists
 * (`Folder.description`, migration `20261103T0157_add_folder_description`) and the folder menu
 * writes it, so the row must read "add" while empty and switch to editing once it has text.
 */

export const ADD_DESCRIPTION_TO_FOLDER_KEY = 'browse.add.description.to.folder';
export const ADD_DESCRIPTION_TO_FOLDER = '向此文件夹添加说明';
export const EDIT_DESCRIPTION_LABEL = '编辑描述';

export function folderDescriptionLabel(description?: string | null): string {
  return description && description.trim() ? EDIT_DESCRIPTION_LABEL : ADD_DESCRIPTION_TO_FOLDER;
}