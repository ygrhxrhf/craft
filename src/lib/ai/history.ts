export interface AiHistoryEntry {
  at: number;
  source: string;
  result: string;
}

export const AI_HISTORY_KEY = 'craft.ai.history';
const MAX_ENTRIES = 50;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function loadAiHistory(storage: StorageLike): AiHistoryEntry[] {
  try {
    const raw = storage.getItem(AI_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is AiHistoryEntry => (
      entry && typeof entry.at === 'number' && typeof entry.result === 'string'
    ));
  } catch {
    return [];
  }
}

export function recordAiHistory(storage: StorageLike, entry: AiHistoryEntry): AiHistoryEntry[] {
  const next = [...loadAiHistory(storage), entry].slice(-MAX_ENTRIES);
  storage.setItem(AI_HISTORY_KEY, JSON.stringify(next));
  return next;
}

/** G39 `clear.history`: remove every locally stored AI result. */
export function clearAiHistory(storage: StorageLike): void {
  storage.removeItem(AI_HISTORY_KEY);
}
