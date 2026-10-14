/**
 * 专注模式的官方文案（`gap.md` G11）。三条都是 `feature-catalog.md` 的逐字串，由
 * `focus-mode-copy.test.ts` 对着台账比；键名连官方那个拼错的 `commans.` 一起照抄——
 * 台账是收集来的事实，不顺手替官方改拼写。
 */
export const FOCUS_MODE_KEY = 'commands.focus.mode';
export const FOCUS_MODE = '专注模式';

export const TOGGLE_FOCUS_MODE_KEY = 'commands.toggle.focus.mode';
export const TOGGLE_FOCUS_MODE = '切换专注模式';

/** 官方形态是「退出专注模式 • [0]」，`[0]` 由本地渲染成实际键位。 */
export const EXIT_FOCUS_MODE_KEY = 'commans.exit.focus.mode.shortcut';
export const EXIT_FOCUS_MODE_PREFIX = '退出专注模式 • ';
