/** G37: valid snap points are fractions of the viewport height, sorted ascending. */
export function normalizeSnapPoints(points: readonly number[] | undefined): number[] {
  if (!points) return [];
  const unique = [...new Set(points.filter((value) => value > 0 && value < 1))].sort((a, b) => a - b);
  return unique.length > 1 ? unique : [];
}

export function nearestSnapIndex(height: number, points: readonly number[]): number {
  if (points.length === 0) return -1;
  let best = 0;
  let distance = Math.abs(points[0] - height);
  for (let index = 1; index < points.length; index += 1) {
    const next = Math.abs(points[index] - height);
    if (next < distance) {
      best = index;
      distance = next;
    }
  }
  return best;
}
