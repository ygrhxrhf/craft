/** G1573: Ctrl/⌘-J opens the standalone new-task popup on the tasks screen. */
export function isNewTaskShortcut(event: {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
}): boolean {
  return (
    (event.ctrlKey === true || event.metaKey === true) &&
    event.shiftKey !== true &&
    event.altKey !== true &&
    event.key.toLowerCase() === 'j'
  );
}
