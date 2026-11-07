/**
 * G179 —— 空间图标预设：`Space.icon` 存的是这里的 id（`gradient:*`），未知/空值落回紫色。
 * 字母取空间名首字，与真实空间相关（此前写死的 `Zs` 与任何空间都无关）。
 *
 * 侧栏顶行的空间行与设置面板的空间图标选择器共用这一张表，避免两处各存一份而漂移。
 */
export const SPACE_ICON_PRESETS = [
  { id: 'gradient:purple', label: '紫色', from: '#d33bf0', to: '#7e22ce' },
  { id: 'gradient:blue', label: '蓝色', from: '#2e6de9', to: '#1e3a8a' },
  { id: 'gradient:green', label: '绿色', from: '#00c2a6', to: '#047857' },
  { id: 'gradient:orange', label: '橙色', from: '#f59e0b', to: '#b45309' },
  { id: 'gradient:gray', label: '灰色', from: '#525c66', to: '#1f2937' },
] as const;

export function spaceIconPreset(icon: string | null | undefined) {
  return SPACE_ICON_PRESETS.find((preset) => preset.id === icon) ?? SPACE_ICON_PRESETS[0];
}

export function spaceInitial(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed ? Array.from(trimmed)[0] : '我';
}
