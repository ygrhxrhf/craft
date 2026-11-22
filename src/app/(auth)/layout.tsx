import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth/auth';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // 已登录还停在登录/注册页，会让人以为账号没登上（页面上没有任何「你已登录」的迹象）。
  // 这里直接送回工作区；未登录照旧渲染表单。
  const session = await auth();
  if (session?.user?.id) redirect('/documents');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      {children}
    </div>
  );
}
