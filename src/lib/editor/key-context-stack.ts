/**
 * The key-context stack (G1478). Official Craft does not decide a key by "who registered first":
 * contexts push onto a stack as they become active (a table selection, a text-edit surface), and
 * the dispatcher walks it top-down, taking the first layer that both matches the key and is
 * allowed to run. The first layer that matches consumes the key — lower layers never see it.
 *
 * This is the pure half of that: the stack and its lookup. The layers themselves (which context
 * pushes when) belong to the components that own those contexts.
 */

export interface KeyLayer<T> {
  /** A name for diagnostics and tests. */
  name: string;
  /** Whether this layer is allowed to run right now (the official push gate). */
  isActive: () => boolean;
  /** The bindings this layer answers, keyed by the command id. */
  bindings: Map<string, T>;
}

/** A stack with the topmost layer last, matching the official push order. */
export class KeyContextStack<T> {
  private layers: KeyLayer<T>[] = [];

  push(layer: KeyLayer<T>): void {
    this.layers.push(layer);
  }

  /** Remove a layer by name; a missing name is a no-op, not an error. */
  pop(name: string): void {
    const index = this.layers.findIndex((layer) => layer.name === name);
    if (index >= 0) this.layers.splice(index, 1);
  }

  get size(): number {
    return this.layers.length;
  }

  /** The layer names, bottom first — the order the dispatcher walks backwards. */
  names(): string[] {
    return this.layers.map((layer) => layer.name);
  }

  /**
   * Walk top-down, skipping inactive layers, and return the first binding that answers `id`.
   * The layer that matches wins outright: nothing below it is consulted.
   */
  resolve(id: string): { layer: string; binding: T } | null {
    for (let index = this.layers.length - 1; index >= 0; index -= 1) {
      const layer = this.layers[index];
      if (!layer.isActive()) continue;
      const binding = layer.bindings.get(id);
      if (binding !== undefined) return { layer: layer.name, binding };
    }
    return null;
  }
}
