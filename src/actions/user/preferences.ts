'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';
import { emitSyncEventSafe } from '@/lib/sync/emit-event';
import { canonicalFontId } from '@/components/editor/themes/page-style';

const themeValues = new Set(['light', 'dark', 'system']);
// G685: canonical names plus the legacy aliases; the stored value is canonicalised below.
const fontValues = new Set(['system', 'system-serif', 'system-mono', 'system-rounded', 'inter', 'serif', 'mono', 'rounded', 'sans-serif']);
const widthValues = new Set(['narrow', 'default', 'wide']);
// G160：已完成任务的外观三档（官方 preferences.advanced.completed.task.appearance.*＝淡化/删除线/无）
const completedAppearanceValues = new Set(['faded', 'strike', 'none']);

function validate(kind: string, value: string): string {
  const allowed = kind === 'theme'
    ? themeValues
    : kind === 'editorFont'
      ? fontValues
      : kind === 'completedTaskAppearance'
        ? completedAppearanceValues
        : widthValues;
  if (!allowed.has(value)) throw new Error('无效的偏好值');
  // G685: store the canonical font name; the legacy aliases are accepted but not persisted.
  return kind === 'editorFont' ? canonicalFontId(value) : value;
}

const switchPreferences = ['notifyComments', 'notifyReminders', 'notifyDaily'] as const;

function validateSwitch(value: unknown): boolean {
  // 'false' / 0 / 1 all look boolean-ish to a form, so only a real boolean is stored.
  if (typeof value !== 'boolean') throw new Error('无效的偏好值');
  return value;
}

export type Preferences = {
  theme: string;
  editorFont: string;
  editorWidth: string;
  completedTaskAppearance: string;
  notifyComments: boolean;
  notifyReminders: boolean;
  notifyDaily: boolean;
};

export async function getPreferences(): Promise<Preferences> {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const user = await db.orm.public.User.first({ id: session.user.id });
  if (!user) throw new Error('用户不存在');

  const row = user as {
    theme: string;
    editorFont: string;
    editorWidth: string;
    completedTaskAppearance: string;
    notifyComments: boolean;
    notifyReminders: boolean;
    notifyDaily: boolean;
  };
  return {
    theme: row.theme,
    editorFont: row.editorFont,
    editorWidth: row.editorWidth,
    completedTaskAppearance: row.completedTaskAppearance,
    notifyComments: row.notifyComments,
    notifyReminders: row.notifyReminders,
    notifyDaily: row.notifyDaily,
  };
}

export async function updatePreferences(data: {
  theme?: string;
  editorFont?: string;
  editorWidth?: string;
  completedTaskAppearance?: string;
  notifyComments?: boolean;
  notifyReminders?: boolean;
  notifyDaily?: boolean;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('未授权');

  const db = await getDb();
  const update: Record<string, string | boolean> = {};
  if (data.theme !== undefined) update.theme = validate('theme', data.theme);
  if (data.editorFont !== undefined) update.editorFont = validate('editorFont', data.editorFont);
  if (data.editorWidth !== undefined) update.editorWidth = validate('editorWidth', data.editorWidth);
  if (data.completedTaskAppearance !== undefined) {
    update.completedTaskAppearance = validate('completedTaskAppearance', data.completedTaskAppearance);
  }
  for (const kind of switchPreferences) {
    if (kind in data) update[kind] = validateSwitch(data[kind]);
  }

  await db.orm.public.User.where({ id: session.user.id }).update(update);
  // user 表 tsCol=updatedAt（自动 bump）→ 只需广播（spec 5.4「user 设置」发射点）
  await emitSyncEventSafe(db, session.user.id, ['user'], session.user.id);
}
