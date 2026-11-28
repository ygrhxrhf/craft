export interface PaletteCommand {
  id: string;
  title: string;
  group: string;
  keywords: string[];
  /** Absent on an official command this build has not wired yet. */
  run?: () => void;
  /**
   * Other official ids this same entry answers to. Official names a good few actions twice
   * (`commands.toggle.sidebar` / `commands.toggle.sidebar.visibility`), and one wired entry has
   * to swallow all of them or the palette lists the action once and a dead placeholder twice.
   */
  aliases?: readonly string[];
  /**
   * Whether the command can run where it is being offered. `run` existing is not enough for
   * context-bound commands (展开全部 needs an open document with a toggle in it), and offering
   * a command that silently does nothing is worse than greying it out.
   */
  available?: () => boolean;
}

/** 一句判定，渲染与执行共用：灰掉的和点了没反应的是同一批。 */
export function commandEnabled(command: PaletteCommand): boolean {
  if (!command.run) return false;
  return command.available ? command.available() : true;
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

/** The row the palette prints for an official command nobody has wired yet. */
export interface OfficialPlaceholder {
  id: string;
  title: string;
  group: string;
}

/**
 * 已接入的命令在前，官方名册里**还没有承载面**的在后（灰行）。别名参与去重：一条本地命令
 * 认领多少个官方 id，就吞掉多少个灰行——这正是"接入"这件事在面板上的样子。
 */
export function mergePaletteCommands(
  implemented: readonly PaletteCommand[],
  official: readonly OfficialPlaceholder[],
  placeholderGroup = '官方命令',
): PaletteCommand[] {
  const covered = new Set<string>();
  for (const command of implemented) {
    covered.add(command.id);
    for (const alias of command.aliases ?? []) covered.add(alias);
  }
  return [
    ...implemented,
    ...official
      .filter((command) => !covered.has(command.id))
      .map((command) => ({
        id: command.id,
        title: command.title,
        group: placeholderGroup,
        keywords: [command.group],
      })),
  ];
}
