'use client';

import { useState } from 'react';
import {
  GROUP_LABELS,
  KEY_BINDINGS,
  displayFor,
  type ShortcutGroup,
} from '@/lib/editor/keymap';
import { usePlatform } from '@/lib/editor/use-platform';
import { useIsMobile } from '@/lib/use-is-mobile';

/** The official grouping, in the order the collected panel prints them. */
const GROUP_ORDER: ShortcutGroup[] = [
  'general',
  'editing',
  'tables',
  'taskViews',
  'collections',
  'findReplace',
];

/**
 * G13: 设置 → 快捷键 (`preferences.keyboard.shortcuts`). Two rules shape it:
 *
 * - It prints **local** bindings, not the collected 104-row table. A panel that lists keys this
 *   build does not answer would be a lie the moment a user presses one, so rows come from
 *   `KEY_BINDINGS`, which is the same table the editor dispatches from.
 * - The six group headings are the collected ones (`commands.shortcuts.keyboard.*` and
 *   `commands.shortcuts.in.*`). Three of them have no local bindings yet — tables (G 的表 E),
 *   task views (表 D) and collections — and they are drawn with a local note rather than dropped,
 *   so the official structure stays visible without inventing rows.
 *
 * The note line is local copy; the ledger collected no text for "this group is empty".
 *
 * G798: the panel has **two navigation states** at the official 747px threshold (the same breakpoint
 * as the shell, `MOBILE_QUERY`): wide ⇒ a vertical list with every group shown at once; narrow ⇒ a
 * `tablist` where only the selected group's rows render.
 */
export function ShortcutsPanel() {
  const platform = usePlatform();
  const narrow = useIsMobile();
  const [active, setActive] = useState<ShortcutGroup>(GROUP_ORDER[0]);

  const renderGroup = (group: ShortcutGroup) => {
    const rows = KEY_BINDINGS.filter((binding) => binding.group === group);
    return (
      <section key={group} data-testid={`shortcuts-group-${group}`}>
        <h3 className="text-[15px] font-semibold">{GROUP_LABELS[group]}</h3>
        {rows.length === 0 ? (
          <p className="mt-1 text-[13px] text-foreground/55">本地暂无绑定。</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {rows.map((binding) => (
              <li
                key={binding.id}
                data-testid={`shortcut-${binding.id}`}
                className="flex items-center justify-between gap-4 rounded-lg bg-foreground/4 px-3 py-2"
              >
                <span className="text-[13px]">{binding.label}</span>
                <kbd className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground/70">
                  {displayFor(binding, platform)}
                </kbd>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6" data-testid="shortcuts-panel" data-nav={narrow ? 'compact' : 'sidebar'}>
      <p className="text-[13px] text-foreground/55">以下仅列出本地已绑定的组合。</p>

      {narrow ? (
        <>
          {/* G798 compact state: a tablist, one group visible at a time. */}
          <div role="tablist" aria-label="快捷键分组" className="flex flex-wrap gap-1">
            {GROUP_ORDER.map((group) => (
              <button
                key={group}
                type="button"
                role="tab"
                aria-selected={active === group}
                data-testid={`shortcuts-tab-${group}`}
                onClick={() => setActive(group)}
                className={
                  active === group
                    ? 'rounded-full bg-(--craft-accent) px-2.5 py-1 text-[12px] text-white'
                    : 'rounded-full border border-border px-2.5 py-1 text-[12px] text-muted-foreground'
                }
              >
                {GROUP_LABELS[group]}
              </button>
            ))}
          </div>
          {renderGroup(active)}
        </>
      ) : (
        GROUP_ORDER.map(renderGroup)
      )}
    </div>
  );
}
