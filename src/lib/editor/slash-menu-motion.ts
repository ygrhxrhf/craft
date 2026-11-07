/**
 * G1569 —— 斜杠菜单的两段动效：入场 100ms（G1568，挂在内层 div 上，容器只留 150ms opacity
 * 过渡），退场在官方是**与入场等长的一条 100ms 动画**（`Escape` 那一步采到一例）。
 *
 * 官方这条不保证每次都能采到——组件先卸载时 `animationend` 不触发。本地因此不靠事件驱动，
 * 用固定的同一长度做定时清理，行为可重复。两个数放在一处，退场长度跟着入场走，不会漂。
 */

export const SLASH_MENU_ENTRANCE_MS = 100;

/** 退场与入场等长（官方采集到的唯一一例是 100ms）。 */
export const SLASH_MENU_EXIT_MS = SLASH_MENU_ENTRANCE_MS;

/** 退场时加到内层菜单上的 class；`duration-100` 与 `SLASH_MENU_EXIT_MS` 同值。 */
export const SLASH_MENU_EXIT_CLASSES = ['animate-out', 'fade-out-0', 'duration-100'] as const;