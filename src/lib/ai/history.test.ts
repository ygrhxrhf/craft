import { describe, expect, it } from 'vitest';
import { clearAiHistory, loadAiHistory, recordAiHistory } from './history';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('AI history (G39)', () => {
  it('records entries and clears them', () => {
    const storage = memoryStorage();
    recordAiHistory(storage, { at: 1, source: '改写', result: '一' });
    recordAiHistory(storage, { at: 2, source: 'PDF', result: '二' });
    expect(loadAiHistory(storage).map((entry) => entry.result)).toEqual(['一', '二']);

    clearAiHistory(storage);
    expect(loadAiHistory(storage)).toEqual([]);
  });

  it('ignores malformed storage', () => {
    const storage = memoryStorage();
    storage.setItem('craft.ai.history', '{bad');
    expect(loadAiHistory(storage)).toEqual([]);
  });
});
