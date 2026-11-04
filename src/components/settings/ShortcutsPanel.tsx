'use client';

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { KEY_BINDINGS, capParts, type KeyBinding } from '@/lib/editor/keymap';
import {
  PANEL_TABS,
  nextTabIndex,
  panelView,
  type PanelTabId,
  type PanelTabView,
} from '@/lib/editor/shortcut-panel';
import { usePlatform } from '@/lib/editor/use-platform';
import { useIsMobile } from '@/lib/use-is-mobile';
import { cn } from 'cn';

/**
 * G13 / G755 / G771：设置 → 快捷键（`preferences.keyboard.shortcuts`）。三件采集到的结构事实
 * 决定了这一版：
 *
 * - 左栏是**七枚按钮**，选中态靠 class，不是 `role=tab`；
 * - 正文是**两层**：分类标题 → 段标题 → 行，段就是官方面板源里那 18 个 `getTitle`；
 * - 一行的键位是**逐枚键帽**（修饰键与字母各占一枚 `<kbd>`）。
 *
 * 行仍取自 `KEY_BINDINGS`——面板只印这台构建真答得上的组合，否则会教用户按一个本地没绑的键。
 * 「文档」分类按官方那样不分段，行直接挂在分类标题下。
 */
export function ShortcutsPanel() {
  const platform = usePlatform();
  const narrow = useIsMobile();
  const [active, setActive] = useState<PanelTabId>(PANEL_TABS[0].id);
  const view = panelView(KEY_BINDINGS);
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

  const renderRows = (rows: KeyBinding[]) => (
    <ul className="mt-2 space-y-1">
      {rows.map((binding) => {
        const caps = capParts(binding, platform);
        return (
          <li
            key={binding.id}
            data-testid={`shortcut-${binding.id}`}
            className="flex items-center justify-between gap-4 rounded-lg bg-foreground/4 px-3 py-2"
          >
            <span className="text-[13px]">{binding.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {caps.length === 0 ? (
                <span className="text-[12px] text-foreground/40">本机未绑</span>
              ) : (
                caps.map((cap) => (
                  <kbd
                    key={cap}
                    className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-xs text-foreground/70"
                  >
                    {cap}
                  </kbd>
                ))
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );

  const renderTab = (entry: PanelTabView) => (
    <div className="space-y-5" data-testid={`shortcuts-tab-body-${entry.tab.id}`}>
      <h2 className="text-[16px] font-semibold">{entry.tab.label}</h2>
      {entry.unsectioned.length > 0 && renderRows(entry.unsectioned)}
      {entry.sections.map((section) => (
        <section key={section.id} data-testid={`shortcuts-section-${section.id}`}>
          <h3 className="text-[13px] font-medium uppercase tracking-wide text-foreground/45">
            {section.title}
          </h3>
          {section.rows.length === 0 ? (
            <p className="mt-1 text-[13px] text-foreground/55">本地暂无绑定。</p>
          ) : (
            renderRows(section.rows)
          )}
        </section>
      ))}
    </div>
  );

  /**
   * G784：方向键只动**选中**（`active`），焦点留在按下去的那枚按钮上——官方 rail 没有
   * roving tabindex：选中跟随 Arrow、焦点跟随 Tab／程序焦点、激活跟随焦点。后两条（G782/G789）
   * 走原生 `<button>` 语义：Space 在 keyup 当帧合成 click、且激活的是**焦点**所在项，不用自写。
   */
  const onRailKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    setActive((current) => nextTabIndex(current, event.key === 'ArrowDown' ? 1 : -1));
  };

  const rail = (
    <div
      className={cn('flex gap-1', narrow ? 'flex-wrap' : 'w-32 shrink-0 flex-col')}
      data-testid="shortcuts-rail"
      aria-label="快捷键分类"
      onKeyDown={onRailKeyDown}
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
            'rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors',
            active === tab.id
              ? 'bg-(--craft-accent) text-white'
              : 'border border-transparent text-foreground/60 hover:bg-foreground/4',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  const selected = view.find((entry) => entry.tab.id === active) ?? view[0];

  return (
    <div className="space-y-4" data-testid="shortcuts-panel" data-nav={narrow ? 'compact' : 'sidebar'}>
      <p className="text-[13px] text-foreground/55">以下仅列出本地已绑定的组合。</p>
      <div className={cn('gap-6', narrow ? 'flex flex-col' : 'flex')}>
        {rail}
        <div className="min-w-0 flex-1">{renderTab(selected)}</div>
      </div>
    </div>
  );
}
