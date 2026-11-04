/**
 * G454 —— 集合 `person` 列的取值是**四字段快照**：
 * `{ userId, profileImgUrl?, firstName?, lastName? }`（`model.md` §一之十三 4）。
 *
 * 与 `linkToBlock` 同族：存的是**当时**的画像快照，不是活引用——成员改名/换头像之后这一格不会跟着变。
 * 同一行还记着 `allowMultiple` 默认 false（单选），所以本地也只存一条。
 */

export interface PersonSnapshot {
  userId: string;
  profileImgUrl?: string;
  firstName?: string;
  lastName?: string;
}

/** 从一份成员档案做出快照：`name` 按首尾空格切成姓/名两段（只有一段时进 `firstName`）。 */
export function personSnapshot(input: {
  userId: string;
  name?: string | null;
  image?: string | null;
}): PersonSnapshot | null {
  const userId = (input.userId ?? '').trim();
  if (!userId) return null;
  const parts = (input.name ?? '').trim().split(/\s+/).filter(Boolean);
  const snapshot: PersonSnapshot = { userId };
  if (input.image) snapshot.profileImgUrl = input.image;
  if (parts.length === 1) snapshot.firstName = parts[0];
  else if (parts.length > 1) {
    snapshot.firstName = parts[0];
    snapshot.lastName = parts.slice(1).join(' ');
  }
  return snapshot;
}

/** 读回一格：认 `{userId}` 形状（老数据里的裸邮箱/名字按"没有快照"处理）。 */
export function parsePersonSnapshot(raw: unknown): PersonSnapshot | null {
  let value = raw;
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text.startsWith('{')) return null;
    try {
      value = JSON.parse(text);
    } catch {
      return null;
    }
  }
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.userId !== 'string' || !record.userId.trim()) return null;
  const snapshot: PersonSnapshot = { userId: record.userId.trim() };
  if (typeof record.profileImgUrl === 'string' && record.profileImgUrl) {
    snapshot.profileImgUrl = record.profileImgUrl;
  }
  if (typeof record.firstName === 'string' && record.firstName) snapshot.firstName = record.firstName;
  if (typeof record.lastName === 'string' && record.lastName) snapshot.lastName = record.lastName;
  return snapshot;
}

/** 显示名：官方值是"名 姓"两段拼；两段都缺时退回 `userId` 的短前缀（别显示空）。 */
export function personLabel(snapshot: PersonSnapshot): string {
  const name = [snapshot.firstName, snapshot.lastName].filter(Boolean).join(' ');
  return name || snapshot.userId.slice(0, 8);
}

/** 官方 `allowMultiple` 默认 false ⇒ 本地这一列单选。 */
export const PERSON_ALLOW_MULTIPLE_DEFAULT = false;
