import { describe, expect, it, vi } from 'vitest';

import { createReadPerRevision } from './read-per-revision';

describe('the revision-keyed reader', () => {
  it('issues one load for two reads at the same revision', () => {
    const reader = createReadPerRevision<number>();
    const load = vi.fn(() => Promise.resolve(7));

    void reader.read(0, load);
    void reader.read(0, load);

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('hands the same result to both readers', async () => {
    const reader = createReadPerRevision<number>();
    const load = vi.fn(() => Promise.resolve(7));

    const first = reader.read(0, load);
    const second = reader.read(0, load);

    await expect(Promise.all([first, second])).resolves.toEqual([7, 7]);
  });

  it('loads again when the revision moves', async () => {
    const reader = createReadPerRevision<number>();
    const load = vi
      .fn()
      .mockImplementationOnce(() => Promise.resolve(1))
      .mockImplementationOnce(() => Promise.resolve(2));

    await expect(reader.read(0, load)).resolves.toBe(1);
    await expect(reader.read(1, load)).resolves.toBe(2);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('loads again when a revision comes back', async () => {
    const reader = createReadPerRevision<number>();
    const load = vi.fn(() => Promise.resolve(1));

    await reader.read(0, load);
    await reader.read(1, load);
    await reader.read(0, load);

    expect(load).toHaveBeenCalledTimes(3);
  });

  it('does not keep a failed load', async () => {
    const reader = createReadPerRevision<number>();
    const failed = vi.fn(() => Promise.reject(new Error('网络断了')));
    const load = vi.fn(() => Promise.resolve(9));

    await expect(reader.read(0, failed)).rejects.toThrow('网络断了');
    await expect(reader.read(0, load)).resolves.toBe(9);
    expect(load).toHaveBeenCalledTimes(1);
  });
});
