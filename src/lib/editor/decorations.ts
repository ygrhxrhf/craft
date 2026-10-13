/**
 * Page decorations (G157). The official set is a gallery-level subsystem, not a background colour:
 * washi tape and doodles are browsable material libraries. Two families take decorations — block
 * decorations and focus decorations — and the material names are collected verbatim.
 *
 * The three separator materials are the ones the separator panel offers (line / washi tape /
 * doodle), which is why they are the only ones with a display label here.
 */

/** The two decoration families. */
export type DecorationFamily = 'block' | 'focus';

export const DECORATION_FAMILY_KEYS: Record<DecorationFamily, string> = {
  block: 'decoration.block',
  focus: 'decoration.focus',
};

export interface DecorationMaterial {
  /** The material name, as the collected vocabulary writes it. */
  id: string;
  /** The collected label, when the vocabulary gives one. */
  label?: string;
  /** Whether the material is a browsable gallery rather than a single fixed asset. */
  gallery?: boolean;
}

export const DECORATION_MATERIALS: readonly DecorationMaterial[] = [
  { id: 'washi', label: '和纸' },
  { id: 'washi.tape', label: '和纸胶带' },
  { id: 'washi.gallery', label: '和纸图库', gallery: true },
  { id: 'doodle', label: '涂鸦' },
  { id: 'pattern', label: '图案' },
  { id: 'radial', label: '径向' },
  { id: 'paper', label: '纸' },
  { id: 'backdrop', label: '背景' },
  { id: 'card.style', label: '卡片样式' },
] as const;

/** The three materials the separator panel offers, in the order it offers them. */
export const SEPARATOR_MATERIALS = ['washi', 'washi.tape', 'doodle'] as const;

const BY_ID = new Map(DECORATION_MATERIALS.map((material) => [material.id, material]));

export function decorationMaterial(id: string): DecorationMaterial | null {
  return BY_ID.get(id) ?? null;
}

/** Whether a material is a browsable gallery rather than one fixed asset. */
export function isGallery(id: string): boolean {
  return decorationMaterial(id)?.gallery === true;
}
