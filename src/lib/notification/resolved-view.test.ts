import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * G254: a reminder is an entity with a resolved state — the bell carries both views and the
 * server exposes the resolved list.
 */
describe('reminder resolved view (G254)', () => {
  const bell = readFileSync(
    join(process.cwd(), 'src', 'components', 'notification', 'NotificationBell.tsx'),
    'utf8',
  );
  const actions = readFileSync(
    join(process.cwd(), 'src', 'actions', 'notification', 'notification.ts'),
    'utf8',
  );

  it('exposes a resolved list on the server', () => {
    expect(actions).toContain('export async function listResolvedNotifications');
    expect(actions).toContain("d.isResolved.eq(true)");
  });

  it('offers 进行中 / 已解决 views in the bell', () => {
    expect(bell).toContain('进行中');
    expect(bell).toContain('已解决');
    expect(bell).toContain('listResolvedNotifications');
  });
});
