import type { HTMLAttributes } from 'react';
import { cn } from 'cn';

export function AppPageContainer({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        // G10/G11：craft 的内容列在每一个桌面宽度上都是 main + 16，首行在页头带下方 16px，
        // 列底预留 80；此前是 32/32，把 5 列卡片网格挤成 4 列。
        // 右侧不留内距：官方那 16px 的右界里坐着页面滚动条，内容列一直铺到纸边（卡片右缘
        //  @1424 与官方逐像素相等）。留 `pr-4` 会让 5 列再掉回 4 列。
        'mx-auto w-full max-w-[1630px] pl-4 pr-0 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  );
}
