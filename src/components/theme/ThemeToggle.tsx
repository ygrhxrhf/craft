'use client';

import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';
import { useSession } from 'next-auth/react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getSyncManager } from '@/lib/sync-core';

/** 恒为真的客户端快照、恒为假的服务端快照：用来表达「已经挂载到客户端」。 */
function subscribeMounted(): () => void {
  return () => {};
}

function clientMounted(): boolean {
  return true;
}

function serverMounted(): boolean {
  return false;
}

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();
  // next-themes 在服务端拿不到主题，首帧图标必须与服务端一致，挂载后才换成真值。
  const mounted = useSyncExternalStore(subscribeMounted, clientMounted, serverMounted);
  const { data: session } = useSession();

  // 主题偏好（user 表）→ applyLocal；本地 setTheme 已乐观生效
  const saveTheme = (value: string) => {
    const userId = session?.user?.id;
    if (!userId) return;
    void getSyncManager()
      .applyLocal({ table: 'user', id: userId, patch: { theme: value } })
      .catch(() => {});
  };

  if (!mounted) {
    return <Button variant="ghost" size="icon-sm" disabled />;
  }

  const icon = theme === 'dark'
    ? <Moon className="size-4" />
    : theme === 'light'
      ? <Sun className="size-4" />
      : <Monitor className="size-4" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label="切换主题" />}
      >
        {icon}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { setTheme('light'); saveTheme('light'); }}>
          <Sun className="mr-2 size-4" />
          浅色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme('dark'); saveTheme('dark'); }}>
          <Moon className="mr-2 size-4" />
          深色
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { setTheme('system'); saveTheme('system'); }}>
          <Monitor className="mr-2 size-4" />
          跟随系统
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
