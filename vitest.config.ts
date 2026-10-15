import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    // 必须是 **/ 前缀：构建上下文等仓库内副本目录里也有 e2e/，用 e2e/** 只能排掉顶层那份
    // ☆ 第 217 批补 `.next/**`：`npm run build`（standalone 输出）会把**整棵源码树**复制进
    //   `.next/standalone/`，vitest 默认不排它 ⇒ 那一发 `vitest run` 会从 239 个文件变成 480 个、
    //   并且副本里 7 条测试红（副本缺运行期上下文）。跑过 build 之后再跑测试必须仍然是同一套。
    exclude: ['**/node_modules/**', '**/e2e/**', '**/test-results/**', '**/.next/**'],
    // 默认的 5s/10s 预算在这台机器上会被并行压力顶穿：整表 Tailwind 编译实测 5.1–5.7s、
    // 打真库文件的 beforeAll（握手 + client 初始化）偶发顶过 10s——同一份代码空跑全绿、
    // 满负荷全红（不是失败，是排队）。PG 连接数在整套里峰值只到 8/100，所以不是池打满。
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
