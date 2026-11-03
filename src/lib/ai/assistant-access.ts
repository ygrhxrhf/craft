/**
 * G162: the assistant has two disable axes. The user-level switch stops this
 * account everywhere; the space-level switch records the disabled space on the
 * user's own row, so other members of that space keep their assistant.
 */

export const ENABLE_ASSISTANT = '启用助手';
export const ENABLE_ASSISTANT_DESC = '禁用后，你将无法访问助手。不影响其他成员的设置。';
export const SPACE_ASSISTANT_DESC = '你可以为单个空间禁用该助手。这不会影响其他成员的设置。';
export const ASSISTANT_DISABLED = '助手已禁用';
export const ENABLE_IN_SETTINGS = '在设置中启用助手';
export const VIEW_CREDITS = '查看 AI 助手额度';

export interface AssistantAccess {
  enabled: boolean;
  disabledSpaces: string[];
}

export function parseDisabledSpaces(raw: unknown): string[] {
  const value =
    typeof raw === 'string'
      ? (() => {
          try {
            return JSON.parse(raw);
          } catch {
            return null;
          }
        })()
      : raw;
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const spaces: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || seen.has(item)) continue;
    seen.add(item);
    spaces.push(item);
  }
  return spaces;
}

export function assistantAvailable(access: AssistantAccess, spaceId: string | null): boolean {
  if (!access.enabled) return false;
  return spaceId === null ? true : !access.disabledSpaces.includes(spaceId);
}

/** Flip one space on or off in the user's own list; other spaces are untouched. */
export function setSpaceDisabled(
  access: AssistantAccess,
  spaceId: string,
  enabled: boolean,
): AssistantAccess {
  const disabledSpaces = enabled
    ? access.disabledSpaces.filter((id) => id !== spaceId)
    : access.disabledSpaces.includes(spaceId)
      ? access.disabledSpaces
      : [...access.disabledSpaces, spaceId];
  return { enabled: access.enabled, disabledSpaces };
}
