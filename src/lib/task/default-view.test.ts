import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_TASK_GROUP,
  SET_AS_DEFAULT_VIEW,
  TASK_GROUPS,
  defaultViewRedirect,
  isTaskGroupId,
  readDefaultTaskGroup,
  resolveTaskGroup,
  storeDefaultTaskGroup,
  taskGroupHref,
} from './default-view';

/**
 * G262「设置为默认视图」: the chosen view sticks, so opening the tasks screen lands on it. The copy is
 * verbatim; the storage is device-scoped, the same shape the browse layout uses.
 */
describe('the four view ids', () => {
  it('are the ones the screen routes to', () => {
    expect([...TASK_GROUPS]).toEqual(['inbox', 'today', 'upcoming', 'all']);
  });

  it('defaults to the inbox', () => {
    expect(DEFAULT_TASK_GROUP).toBe('inbox');
  });

  it('guards unknown values', () => {
    expect(isTaskGroupId('today')).toBe(true);
    expect(isTaskGroupId('someday')).toBe(false);
    expect(resolveTaskGroup('someday')).toBe(DEFAULT_TASK_GROUP);
  });
});

describe('the label is the collected one', () => {
  it('reads 设置为默认视图', () => {
    expect(SET_AS_DEFAULT_VIEW).toBe('设置为默认视图');
  });
});

describe('the stored preference', () => {
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };

  beforeEach(() => {
    store.clear();
    (globalThis as { localStorage?: unknown }).localStorage = fakeStorage;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it('falls back to the inbox when nothing is stored', () => {
    expect(readDefaultTaskGroup()).toBe('inbox');
  });

  it('round-trips a chosen view', () => {
    storeDefaultTaskGroup('upcoming');
    expect(readDefaultTaskGroup()).toBe('upcoming');
  });

  it('folds a corrupted value onto the inbox rather than routing nowhere', () => {
    store.set('craft.tasks.defaultGroup', 'nonsense');
    expect(readDefaultTaskGroup()).toBe('inbox');
  });
});

describe('the entry-route redirect', () => {
  it('does not redirect when the entry route is already the default', () => {
    expect(defaultViewRedirect('inbox', 'inbox')).toBeNull();
  });

  it('sends the reader to the stored default', () => {
    expect(defaultViewRedirect('inbox', 'today')).toBe('today');
  });

  it('never sends a reader to the route they are on', () => {
    for (const group of TASK_GROUPS) {
      expect(defaultViewRedirect(group, group)).toBeNull();
    }
  });
});

describe('the group hrefs', () => {
  it('keeps the inbox on the bare /tasks path', () => {
    expect(taskGroupHref('inbox')).toBe('/tasks');
    expect(taskGroupHref('today')).toBe('/tasks/today');
    expect(taskGroupHref('upcoming')).toBe('/tasks/upcoming');
    expect(taskGroupHref('all')).toBe('/tasks/all');
  });
});
