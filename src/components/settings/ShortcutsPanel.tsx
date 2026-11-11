'use client';

import { useEffect, useRef, useState } from 'react';

import {
  PANEL_TABS,
  nextTabIndex,
  type PanelTabIcon,
  type PanelTabId,
} from '@/lib/editor/shortcut-panel';
import {
  FileText,
  FolderTree,
  Keyboard,
  LayoutGrid,
  ListTodo,
  Palette,
  Pencil,
} from 'lucide-react';
import { panelRoster, type RosterRow, type RosterTab } from '@/lib/editor/shortcut-official-rows';
import { usePlatform } from '@/lib/editor/use-platform';
import { isImeComposing } from '@/lib/editor/ime-guard';
import { eventInNestedPopup } from '@/lib/focus/focus-stack';
import { useIsSafari } from '@/lib/browse/use-is-safari';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from 'cn';

/** G756: the active category survives a reload; any local carrier is enough. */
const SHORTCUT_TAB_STORAGE_KEY = 'craft.shortcuts.active-tab';

/** G1447: each of the seven tabs carries its own icon in the official panel. */
const TAB_ICONS: Record<PanelTabIcon, typeof Keyboard> = {
  keyboard: Keyboard,
  document: FileText,
  tasks: ListTodo,
  editing: Pencil,
  style: Palette,
  organize: FolderTree,
  collections: LayoutGrid,
};

/** G939: the panel's own loose arrow handling skips anything a deeper layer owns. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * G13 / G755 / G771：设置 → 快捷键（`preferences.keyboard.shortcuts`）。结构三件照官方
 * 采到的定版：左栏七枚按钮（选中态靠 class，不是 `role=tab`）；正文 分类标题 → 段标题 → 行；
 * 键位逐枚 `<kbd>`。
 *
 * 行来自官方名册（`shortcut-official-rows.ts` 的 89 行 ＋ 6 别名行）：本机接线的行走本机
 * 键帽，未接线的行**照样列出**、用官方键帽置灰标「未接入」（第 1 批裁决），让用户看到
 * 官方有、本地暂缺的组合。名册没覆盖的本地绑定（Mac 专用、Safari 键位）按原分区补渲染。
 */
export function ShortcutsPanel() {
  const platform = usePlatform();
  const safari = useIsSafari();
  const narrow = useIsMobile();
  const [active, setActive] = useState<PanelTabId>(() => {
    if (typeof window === 'undefined') return PANEL_TABS[0].id;
    const saved = window.localStorage.getItem(SHORTCUT_TAB_STORAGE_KEY);
    return PANEL_TABS.some((tab) => tab.id === saved) ? (saved as PanelTabId) : PANEL_TABS[0].id;
  });
  // G756: write the active category after every change. The initializer above already read the
  // stored value, so the first write is the same value, not a reset.
  useEffect(() => {
    try {
      window.localStorage.setItem(SHORTCUT_TAB_STORAGE_KEY, active);
    } catch {
      // Storage can be unavailable (private mode); the panel still works within the session.
    }
  }, [active]);
  const view = panelRoster(platform, safari ? 'safari' : 'other');
  const firstCategoryRef = useRef<HTMLButtonElement | null>(null);

  /**
   * G752/G782：面板一打开，焦点就落进**第一枚分类按钮**（官方的默认落点＝第一个分类）。
   * 这一步还决定 Escape 归谁——焦点在面板里，全局焦点栈看到的栈顶就是面板，
   * 于是只关面板、下面那层帮助菜单原样留着；焦点若还留在帮助菜单里，Esc 会走
   * Base UI 的嵌套弹层旁路（`eventInNestedPopup`），面板反而关不掉（实测）。
   */
  useEffect(() => {
    firstCategoryRef.current?.focus();
  }, []);

  /**
   * G939 / G855：官方面板的方向键是**面板自管**——焦点不随 Arrow 移动（P-3 实测），
   * 也不 `preventDefault`（页面滚动照常走）。挂在 document 捕获相、只认 ↑/↓，其余弦
   * 一律不接；嵌套弹层／可编辑目标里不抢。
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isImeComposing(event)) return;
      if (eventInNestedPopup(event.target)) return;
      if (isEditableTarget(event.target)) return;
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      setActive((current) => nextTabIndex(current, event.key === 'ArrowDown' ? 1 : -1));
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const renderCaps = (caps: string[], dimmed: boolean) => (
    <span className={cn('flex shrink-0 items-center gap-1', dimmed && 'opacity-45')}>
      {caps.map((cap) => (
        <kbd
          key={cap}
          className="flex h-[26px] min-w-[26px] items-center justify-center whitespace-nowrap rounded-(--radius-sm) bg-background px-2 text-xs text-(--foreground-800) shadow-(--shadow-xxs)"
        >
          {cap}
        </kbd>
      ))}
    </span>
  );

  const renderRows = (rows: RosterRow[]) => (
    <ul className="mt-2 space-y-1">
      {rows.map((row) => (
        <li
          key={row.id}
          data-testid={`shortcut-${row.id}`}
          data-official={row.official ? 'true' : undefined}
          data-unbound={row.unbound ? 'true' : undefined}
          className="flex min-h-9 items-center justify-between gap-4"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[13px]">{row.label}</span>
            {row.alt && (
              <span className="mt-1 flex items-center gap-1">
                <span className={cn('text-[12px] text-(--foreground-500)', row.alt.unbound && 'opacity-45')}>
                  {row.alt.conjunction}
                </span>
                {renderCaps(row.alt.caps, row.alt.unbound)}
                {row.alt.unbound && (
                  <span className="text-[10px] text-(--foreground-500)">{row.official ? '未接入' : '本机未绑'}</span>
                )}
              </span>
            )}
          </span>
          {row.emptyTag === '本机未绑' ? (
            <span className="shrink-0 text-[12px] text-(--foreground-500)">本机未绑</span>
          ) : (
            <>
              {renderCaps(row.caps, row.unbound)}
              {row.unbound && (
                <span className="shrink-0 text-[10px] text-(--foreground-500)">{row.emptyTag ?? '未接入'}</span>
              )}
            </>
          )}
        </li>
      ))}
    </ul>
  );

  const renderTab = (entry: RosterTab) => (
    <div className="space-y-5" data-testid={`shortcuts-tab-body-${entry.tab.id}`}>
      <h2 className="text-[16px] font-semibold">{entry.tab.label}</h2>
      {entry.unsectioned.length > 0 && renderRows(entry.unsectioned)}
      {entry.sections.map((section) => (
        <section key={section.section.id} data-testid={`shortcuts-section-${section.section.id}`}>
          <h3 className="text-[13px] font-medium uppercase tracking-wide text-(--foreground-500)">
            {section.section.title}
          </h3>
          {section.rows.length === 0 ? (
            <p className="mt-1 text-[13px] text-(--foreground-500)">本地暂无绑定。</p>
          ) : (
            renderRows(section.rows)
          )}
        </section>
      ))}
    </div>
  );

  /**
   * G784：方向键只动**选中**（`active`），焦点不动——官方 rail 没有 roving tabindex：
   * 选中跟随 Arrow（见上面的 document 监听）、焦点跟随 Tab／程序焦点、激活跟随焦点。
   * 后两条（G782/G789）走原生 `<button>` 语义：Space 在 keyup 当帧合成 click、且激活
   * 的是**焦点**所在项，不用自写。
   */
  const rail = (
    <div
      className={cn(
        'flex gap-0.5',
        narrow
          ? 'shrink-0 flex-wrap border-b border-(--foreground-150) px-5 pb-4'
          : 'w-[184px] shrink-0 flex-col overflow-y-auto border-r border-(--foreground-150) px-3 py-4',
      )}
      data-testid="shortcuts-rail"
      aria-label="快捷键分类"
    >
      {PANEL_TABS.map((tab) => (
        <button
          key={tab.id}
          ref={tab.id === PANEL_TABS[0].id ? firstCategoryRef : undefined}
          type="button"
          aria-current={active === tab.id ? 'true' : undefined}
          data-testid={`shortcuts-category-${tab.id}`}
          onClick={() => setActive(tab.id)}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
            active === tab.id
              ? 'bg-(--craft-accent) text-white'
              : 'border border-transparent text-foreground/60 hover:bg-foreground/4',
          )}
        >
          {(() => {
            const Icon = TAB_ICONS[tab.icon];
            return <Icon className="size-3.5 shrink-0" aria-hidden="true" />;
          })()}
          {tab.label}
        </button>
      ))}
    </div>
  );

  const selected = view.find((entry) => entry.tab.id === active) ?? view[0];

  return (
    <div className="space-y-4" data-testid="shortcuts-panel" data-nav={narrow ? 'compact' : 'sidebar'}>
      <p className="text-[13px] text-(--foreground-500)">官方快捷键全集；灰显「未接入」表示本机尚未绑定。</p>
      <div className={cn('gap-6', narrow ? 'flex flex-col' : 'flex')}>
        {rail}
        <div className="min-w-0 flex-1">{renderTab(selected)}</div>
      </div>
    </div>
  );
}
