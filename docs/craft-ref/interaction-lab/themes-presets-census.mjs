/**
 * G682 采集：官方页面主题清单的「原文落盘」通路（族拆批 3d）。
 *
 * 背景：主题清单不在 bundle 里（features.md 第 76 批已定「Themes loaded dynamically from S3」），
 * 而 150 行整表手抄必错——台账点名要一条「官方名册原文落盘」的通路，本脚本就是它：
 * 官方会话里从 performance 资源找到 `res.craft.do/themes/presets.json`，用页内 fetch 取原文
 * 写盘（harvest 目录，gitignore 面），后续再由代码侧抽取成 `public/themes-presets.json`。
 *
 * 产出结构：`{themes:[{themeId,title,pageStyleProps:{theme-id,color,background-color,
 * font-family,separator-style,backdrop,card-assets}}], washiPresets:[{key,label,pageStyleProps}]}`
 * ——抓到时 131 条主题＋96 条和纸胶带预设（G157/G210 的素材面也用得上）。
 *
 * 跑法：ego-browser nodejs -e "await import('file:///C:/code/craft/docs/craft-ref/interaction-lab/themes-presets-census.mjs')"
 */
import { mkdir, writeFile } from 'node:fs/promises';

const DIR = 'C:/code/craft/docs/craft-ref/features/_harvest';
const URL = 'https://res.craft.do/themes/presets.json';

const task = await taskSpace('craft assets 20261023 r3');
const tabs = await task.tabs();
const active = tabs.find((t) => t.active) ?? tabs[0];
const page = active.label ? task.page(active.label) : await task.adopt(active.page);
await page.goto('https://docs.craft.do/', { timeout: 45000 }).catch(() => {});
await page.waitForTimeout(4000);

const seen = await page.evaluate(() =>
  performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((name) => name.includes('themes/presets.json')),
);
if (!seen.length) {
  console.log('presets.json 未出现在资源表（应用未加载主题清单），先打开一篇文档再跑');
  process.exit(1);
}

const response = await page.fetch(URL, { timeout: 20000 });
await mkdir(DIR, { recursive: true });
await writeFile(`${DIR}/themes-presets.json`, response.body, 'utf8');
const parsed = JSON.parse(response.body);
console.log(
  JSON.stringify({ status: response.status, themes: parsed.themes?.length, washiPresets: parsed.washiPresets?.length }),
);