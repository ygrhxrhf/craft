export interface ToggleAllEditor {
  commands: {
    expandAllToggleBlocks: () => unknown;
    collapseAllToggleBlocks: () => unknown;
  };
}

/** G16: one execution point for the palette, format tab and slash entries. */
export function runAllToggles(editor: ToggleAllEditor | null, expand: boolean): boolean {
  if (!editor) return false;
  if (expand) editor.commands.expandAllToggleBlocks();
  else editor.commands.collapseAllToggleBlocks();
  return true;
}
