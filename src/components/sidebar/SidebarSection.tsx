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
      <div className="flex items-center justify-between px-1.5 py-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          // G385：折叠控件要在无障碍层声明开/合，否则读屏只听到一个没有状态的按钮。
          aria-expanded={isOpen}
          aria-label={`${isOpen ? '收起' : '展开'}${title}`}
          className="flex items-center gap-1 text-meta font-semibold text-foreground/40 hover:text-foreground transition-colors duration-150"
        >
          <ChevronRight
            className={cn(
              'size-3.5 transition-transform duration-150',
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
