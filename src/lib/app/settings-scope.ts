/**
 * G166 —— 设置作用域是**三层**：个人空间默认 → 团队所有空间默认 → **单空间可覆盖**（`settings.md` §二）。
 *
 * 官方三句（逐字，`settings.md` §二）：
 *   - `settings.apply.to.published.content.in.your.space`「这些设置适用于你个人空间中发布的所有内容。」
 *   - `…in.all.spaces`「这些设置适用于"[0]"团队**所有空间**发布的内容。」
 *   - `space.override.settings.for.individual.spaces`「你可以**覆盖单个空间**的这些设置。」
 *
 * ⇒ 发布/品牌类设置是「用户级或团队级默认 + 空间级覆盖」。本地是单级全局设置（无团队、无空间
 * 实体），本模块把三层的**取值链**与两句适用范围文案写出来：读某个键时按 空间 → 团队 → 个人
 * 逐层回落，取第一个有值的。
 */

export type SettingsScope = 'personal' | 'team' | 'space';

/** 三层的取值来源：越靠后的越优先（空间覆盖个人与团队）。 */
export interface ScopedSettings {
  personal?: Record<string, unknown>;
  team?: Record<string, unknown>;
  space?: Record<string, unknown>;
}

/** 官方两句适用范围文案（逐字）。 */
export const SCOPE_COPY = {
  personal: {
    key: 'settings.apply.to.published.content.in.your.space',
    label: '这些设置适用于你个人空间中发布的所有内容。',
  },
  team: {
    key: 'settings.apply.to.published.content.in.all.spaces',
    // 官方那句含 `[0]`＝团队名占位。
    template: '这些设置适用于"[0]"团队所有空间发布的内容。',
  },
  override: {
    key: 'space.override.settings.for.individual.spaces',
    label: '你可以覆盖单个空间的这些设置。',
  },
} as const;

/** 团队那句的 `[0]` 填成团队名。 */
export function teamScopeCopy(teamName: string): string {
  return SCOPE_COPY.team.template.replace('[0]', teamName);
}

/**
 * 读一个设置键：**空间覆盖 → 团队 → 个人**，取第一个有值的层。
 * 三层都没有 ⇒ `undefined`（不发明默认值——默认值属于键自己的表，不属于作用域链）。
 */
export function resolveScopedSetting(settings: ScopedSettings, key: string): unknown {
  for (const scope of ['space', 'team', 'personal'] as const) {
    const layer = settings[scope];
    if (layer && layer[key] !== undefined) return layer[key];
  }
  return undefined;
}

/** 这个键的值**来自哪一层**；三层都没有 ⇒ `null`。 */
export function scopeOfSetting(settings: ScopedSettings, key: string): SettingsScope | null {
  for (const scope of ['space', 'team', 'personal'] as const) {
    const layer = settings[scope];
    if (layer && layer[key] !== undefined) return scope;
  }
  return null;
}

/** 某层是否覆盖了某键（面板据此说"这一项被空间覆盖了"）。 */
export function isOverridden(settings: ScopedSettings, key: string): boolean {
  return Boolean(settings.space && settings.space[key] !== undefined);
}
