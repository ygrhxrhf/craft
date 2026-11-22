import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// 这 27 个文件在 beforeAll 里连真 Postgres（建行、数语句、验共享位、读 contract marker），
// 换成内存替身就什么也测不到，所以它们离了库只会 ECONNREFUSED。Gitee Go 的构建机没有库，
// 那一步用 CI_SKIP_DB_TESTS=1 整组排掉；本地不设这个变量，仍然全跑。GitHub 版的
// .github/workflows/ci.yml 带 postgres:16 服务，不设这个变量，跑的是全套。
// 新增打库用例时不用改这里：漏排的会在 CI 里以 ECONNREFUSED 露出来，把它加进这个表即可。
const liveDbTests = [
  'src/actions/auth/oauth.test.ts',
  'src/actions/collection/collection-detail.test.ts',
  'src/actions/collection/collection.test.ts',
  'src/actions/comment/comment-notifications-wiring.test.ts',
  'src/actions/comment/comment.test.ts',
  'src/actions/connection/connection.test.ts',
  'src/actions/document/access-requests.test.ts',
  'src/actions/document/archive.test.ts',
  'src/actions/document/get.test.ts',
  'src/actions/document/permanent-delete.test.ts',
  'src/actions/document/search-collection-scope.test.ts',
  'src/actions/document/search-hit-count.test.ts',
  'src/actions/document/share-permission.test.ts',
  'src/actions/notification/notification.test.ts',
  'src/actions/space/space-notifications.test.ts',
  'src/actions/space/space.test.ts',
  'src/actions/tag/ignore-rules.test.ts',
  'src/actions/task/trashed-document.test.ts',
  'src/actions/user/preferences.test.ts',
  'src/app/api/collab/token/route.test.ts',
  'src/app/api/v1/sync/route.realdb.test.ts',
  'src/collab/persist.test.mjs',
  'src/collab/share-grant.test.mjs',
  'src/lib/notification/comment-notifications.test.ts',
  'src/lib/notification/daily-digest.test.ts',
  'src/lib/notification/materialize.test.ts',
  'src/prisma/where-shorthand.test.ts',
];

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
    // ☆ 同理补 `.delta/**`：工具在 `.delta/worktrees/` 下留了整棵源码树副本，实测把 272 个
    //   测试文件扫成 814 个（副本恒等，等于同一套测试跑三倍）。
    exclude: [
      '**/node_modules/**',
      '**/e2e/**',
      '**/test-results/**',
      '**/.next/**',
      '**/.delta/**',
      ...(process.env.CI_SKIP_DB_TESTS ? liveDbTests : []),
    ],
    // 默认的 5s/10s 预算在这台机器上会被并行压力顶穿：整表 Tailwind 编译实测 5.1–5.7s、
    // 打真库文件的 beforeAll（握手 + client 初始化）偶发顶过 10s——同一份代码空跑全绿、
    // 满负荷全红（不是失败，是排队）。PG 连接数在整套里峰值只到 8/100，所以不是池打满。
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
});
