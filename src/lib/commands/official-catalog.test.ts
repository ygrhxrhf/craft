import { describe, expect, it } from 'vitest';
import { OFFICIAL_COMMANDS } from './official-catalog';

describe('official command catalogue (G33)', () => {
  it('holds all 189 collected command ids exactly once', () => {
    expect(OFFICIAL_COMMANDS).toHaveLength(189);
    expect(new Set(OFFICIAL_COMMANDS.map((command) => command.id)).size).toBe(189);
  });

  it('keeps every id under the commands namespace', () => {
    expect(OFFICIAL_COMMANDS.every((command) => command.id.startsWith('commands.'))).toBe(true);
  });
});
