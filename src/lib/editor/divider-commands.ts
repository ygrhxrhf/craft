import type { DividerStyle } from './divider-styles';

/**
 * 官方 slash 面板把分隔线列为**四条独立命令**（`commands.insert.line.*`），每条一个权重档，
 * 而不是一条「分隔线」再选档（`gap.md` G31）。四条的中文串与线值逐字取自 `feature-catalog.md`，
 * 由 `divider-commands.test.ts` 对台账比对，改一个字就会红。
 *
 * `style` 落在 `divider-styles.ts` 的官方四档词汇上：这里只负责"哪条命令写哪一档"，
 * 归档语义（含 markdown 标记与旧名兼容）不在本表重复。
 */
export interface DividerInsertCommand {
  key: string;
  label: string;
  style: DividerStyle;
}

export const DIVIDER_INSERT_COMMANDS: readonly DividerInsertCommand[] = [
  { key: 'commands.insert.line.extralight', label: '分隔线 - 极细', style: 'extraLight' },
  { key: 'commands.insert.line.light', label: '分隔线 - 细', style: 'light' },
  { key: 'commands.insert.line.regular', label: '分隔线 - 常规', style: 'regular' },
  { key: 'commands.insert.line.strong', label: '分隔线 - 粗', style: 'strong' },
];

/** 官方默认档：slash 只敲「分隔线」时该落的那一档（`---`＝常规，G1229）。 */
export const DEFAULT_DIVIDER_INSERT = DIVIDER_INSERT_COMMANDS.find((c) => c.style === 'regular')!;
