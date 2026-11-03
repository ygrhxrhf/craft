/**
 * G156: a page cover can hold several images. `coverImage` stays the first/current image;
 * when `coverShuffle` is on, each load picks one of `coverImages` at random.
 */

export function normalizeCoverImages(raw: unknown): string[] {
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
  const images: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string' || !item.trim() || seen.has(item)) continue;
    seen.add(item);
    images.push(item);
  }
  return images;
}

export function pickCoverImage(
  coverImage: string | null | undefined,
  rawImages: unknown,
  shuffle: boolean,
  random: () => number = Math.random,
): string | null {
  const images = normalizeCoverImages(rawImages);
  if (shuffle && images.length > 0) {
    return images[Math.min(images.length - 1, Math.floor(random() * images.length))];
  }
  return coverImage ?? images[0] ?? null;
}
