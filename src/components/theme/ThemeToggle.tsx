'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updatePreferences } from '@/actions/user/preferences';

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" disabled />;
  }

  const icon = theme === 'dark'
    ? <Moon className="size-4" />
    : theme === 'light'
      ? <Sun className="size-4" />
      : <Monitor className="size-4" />;

  // Same rule as the settings panel: the theme applies only once the row has it. Firing the
  // write unawaited repainted the app 1569ms before the server accepted it, and leaving the
  // page inside that window left next-themes' localStorage ahead of the stored preference
  // with nothing on screen to show the two disagree.
  const choose = async (value: 'light' | 'dark' | 'system') => {
    try {
      await updatePreferences({ theme: value });
    } catch {
      return;
    }
    setTheme(value);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="切换主题" />}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => void choose('light')}>
          <Sun className="mr-2 size-4" />
          浅色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void choose('dark')}>
          <Moon className="mr-2 size-4" />
          深色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void choose('system')}>
          <Monitor className="mr-2 size-4" />
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
