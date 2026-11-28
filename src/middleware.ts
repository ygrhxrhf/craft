import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

// /w/<token> is the whiteboard share link: anonymous visitors are allowed in so
// the Board's collab-token call can decide the role (viewer without a login).
// /api/internal/ is called by the sync services with no session cookie; those
// routes authenticate on the shared secret header instead.
// /api/whiteboards/ is public on purpose: an anonymous share visitor needs a
// connection claim, and the route itself authorizes owner vs share token.
// /api/health is the deployment probe (Caddy / uptime checks): it must answer
// without a session, and it returns only ok + DB reachability, never any row.
// PWA assets have to resolve before anyone signs in: the manifest and icons are
// fetched by the install prompt, and sw.js/offline.html are the offline shell.
const publicAssets = [
  '/manifest.webmanifest',
  '/sw.js',
  '/offline.html',
  '/icon-',
  '/apple-touch-icon.png',
];

const publicRoutes = [
  '/login',
  '/register',
  '/api/auth',
  '/api/s/',
  '/api/internal/',
  '/api/whiteboards/',
  '/api/health',
  // G1674：「所有文档的 MCP」由外部 AI 工具调用，没有会话 cookie；它自证令牌
  //   （`Authorization: Bearer`），所以要在中间件里放行，鉴权在路由内完成。
  '/api/mcp',
  // 同理：xsxz 把读书笔记推成文档走的是写令牌，不是会话 cookie。放行后鉴权由
  //   路由内的 `verifyMcpToken` 完成（读令牌在那里被 403），不然请求会被转到 /login。
  '/api/v1/import/markdown',
  '/s/',
  '/p/',
  '/w/',
  ...publicAssets,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  if (!req.auth) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
