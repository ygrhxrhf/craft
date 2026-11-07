import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const path = 'src/components/document/TrashList.tsx';
const head = execFileSync('git', ['show', `HEAD:${path}`], { encoding: 'utf8' });

const oldButton = `          <>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-md text-ui"
              onClick={() => setSelecting(true)}
            >
              选择
            </Button>
            {/* G242：回收站屏的 ⋯ 是按屏裁剪的子集——官方这里是「选择」＋「清空最近删除」，
                没有所有文档 ⋯ 里的排序方式／导入／导出／空间设置。 */}`;
const newButton = `          <>
            {/* G242：回收站屏的 ⋯ 是按屏裁剪的子集——官方这里是「选择」＋「清空最近删除」，
                没有所有文档 ⋯ 里的排序方式／导入／导出／空间设置。 */}`;

const oldMenu = `              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEmptyConfirmOpen(true)}>`;
const newMenu = `              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelecting(true)}>选择</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEmptyConfirmOpen(true)}>`;

if (!head.includes(oldButton) || !head.includes(oldMenu)) {
  console.error('HEAD anchors not found');
  process.exit(1);
}
const next = head.replace(oldButton, newButton).replace(oldMenu, newMenu);
fs.writeFileSync('test-results/TrashList.menu.tsx', next);
const blob = execFileSync('git', ['hash-object', '-w', 'test-results/TrashList.menu.tsx'], { encoding: 'utf8' }).trim();
execFileSync('git', ['update-index', '--cacheinfo', `100644,${blob},${path}`]);
console.log('staged clean blob', blob);