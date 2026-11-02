'use client';

import {
  ArrowRightLeft,
  AtSign,
  Calendar,
  CalendarClock,
  ChevronDown,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Hash,
  Image as ImageIcon,
  Link,
  Link2,
  List,
  Mail,
  Percent,
  Phone,
  Sigma,
  SquareCheck,
  Type,
  type LucideIcon,
} from 'lucide-react';
import { UNKNOWN_FIELD_ICON, fieldIconFor } from '@/lib/collection/property-types';

/** G396：官方图标名 → 本地可画的 lucide 组件。只收 `property-types.ts` 里出现过的名字。 */
const ICONS: Record<string, LucideIcon> = {
  envelope: Mail,
  phone: Phone,
  'at-sign': AtSign,
  text: Type,
  hashtag: Hash,
  checkbox: SquareCheck,
  calendar: Calendar,
  link: Link,
  'chevron-down': ChevronDown,
  list: List,
  image: ImageIcon,
  'arrow-right-left': ArrowRightLeft,
  'link-2': Link2,
  sigma: Sigma,
  percentage: Percent,
  money: CircleDollarSign,
  'calendar-clock': CalendarClock,
  clock: Clock,
  'objects-placeholder': CircleHelp,
};

/** 按官方图标名画一枚图标；未知名字退到占位图标（与 `fieldIconFor` 的兜底一致）。 */
export function FieldIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? ICONS[UNKNOWN_FIELD_ICON];
  return <Icon className={className} aria-hidden />;
}

/** 按字段类型取图标：类型 → 官方名（`fieldIconFor`）→ 组件。 */
export function FieldTypeIcon({ type, className }: { type: unknown; className?: string }) {
  return <FieldIcon name={fieldIconFor(type)} className={className} />;
}
