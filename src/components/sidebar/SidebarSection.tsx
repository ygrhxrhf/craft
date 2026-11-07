'use client';

import { useState, type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from 'cn';

interface SidebarSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  action?: ReactNode;
}

export function SidebarSection({ title, children, defaultOpen = true, action }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="py-1">
      {/* G18/G30：craft 分区头是 32 高的行、标题 @x19、12/600/12/ls0.05/满对比，且**没有 chevron**。
          本地保留折叠扳手（G385 的可及性要求），把它放进行左的 gutter，不挤动标题位置。 */}
      <div className="relative flex h-8 items-center justify-between">
        <button
          onClick={() => setIsOpen(!isOpen)}
          // G385：折叠控件要在无障碍层声明开/合，否则读屏只听到一个没有状态的按钮。
          aria-expanded={isOpen}
          aria-label={`${isOpen ? '收起' : '展开'}${title}`}
          className="relative flex items-center pl-[9px] text-[12px] font-semibold leading-3 tracking-[0.05px] text-foreground transition-colors duration-150 hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              'absolute -left-2 size-3.5 text-muted-foreground transition-transform duration-150',
              isOpen && 'rotate-90'
            )}
          />
          {title}
        </button>
        {action}
      </div>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}
