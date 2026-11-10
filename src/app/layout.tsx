import type { Metadata } from 'next';
import { Inter, Roboto_Mono } from 'next/font/google';
import 'katex/dist/katex.min.css';
import './globals.css';
import { Providers } from '@/components/providers/Providers';
import { UpdateBanner } from '@/components/app/UpdateBanner';
import { BrowserCompatNotice } from '@/components/app/BrowserCompatNotice';
import { directUploadEnabled } from '@/lib/storage';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

// G1095: official code blocks set `Roboto Mono, monospace`; self-host the face so the name in
// the stack actually resolves instead of falling through to the system mono.
const robotoMono = Roboto_Mono({
  variable: '--font-roboto-mono',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Crafty',
  description: '你的智能笔记空间',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, statusBarStyle: 'default' },
};

const swRegister = typeof window !== 'undefined'
  ? `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});`
  : '';

/**
 * 把「直传是否启用」下发给客户端。
 *
 * 客户端拿不到服务端环境变量，而 NEXT_PUBLIC_ 会被打进产物、且与部署环境的运行时值可能不一致，
 * 所以这里在服务端渲染期算好、随首屏 HTML 一起下发。html 上已有 suppressHydrationWarning。
 */
const storageFlag = `window.__STORAGE_CONFIG__=${JSON.stringify({ directUpload: directUploadEnabled() })};`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="zh-Hans" className={`${inter.variable} ${robotoMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex h-full flex-col">
        <Providers>{children}</Providers>
        <UpdateBanner />
        {/* G346：不兼容浏览器是可绕过警告，四条官方文案在组件里。 */}
        <BrowserCompatNotice />
        <script dangerouslySetInnerHTML={{ __html: swRegister }} />
        <script dangerouslySetInnerHTML={{ __html: storageFlag }} />
      </body>
    </html>
  );
}
