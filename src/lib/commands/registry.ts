export interface PaletteCommand {
  id: string;
  title: string;
  group: string;
  keywords: string[];
  /** Absent on an official command this build has not wired yet. */
  run?: () => void;
}

/**
 * G33: the palette's searchable command layer. It starts with the commands this
 * build actually implements; unimplemented official ids are not listed.
 */
export function filterCommands(commands: readonly PaletteCommand[], query: string): PaletteCommand[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return commands.filter((command) => {
    const haystack = [command.title, command.group, ...command.keywords].join(' ').toLowerCase();
    return haystack.includes(needle);
  });
}
