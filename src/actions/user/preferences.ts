'use server';

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/prisma/db';

const themeValues = new Set(['light', 'dark', 'system']);
const fontValues = new Set(['inter', 'serif', 'mono', 'rounded']);
const widthValues = new Set(['narrow', 'default', 'wide']);

function validate(kind: string, value: string): string {
  const allowed = kind === 'theme'
    ? themeValues
    : kind === 'editorFont'
      ? fontValues
      : widthValues;
  if (!allowed.has(value)) throw new Error('无效的偏好值');
  return value;
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
    notifyComments: boolean;
    notifyReminders: boolean;
    notifyDaily: boolean;
  };
  return {
    theme: row.theme,
    editorFont: row.editorFont,
    editorWidth: row.editorWidth,
    notifyComments: row.notifyComments,
    notifyReminders: row.notifyReminders,
    notifyDaily: row.notifyDaily,
  };
}

export async function updatePreferences(data: {
  theme?: string;
  editorFont?: string;
  editorWidth?: string;
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
  for (const kind of switchPreferences) {
    if (kind in data) update[kind] = validateSwitch(data[kind]);
  }

  await db.orm.public.User.where({ id: session.user.id }).update(update);
}
