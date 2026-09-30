import { NextRequest, NextResponse } from 'next/server';
import { requireUserId, AuthorizationError } from '@/lib/authz/guard';
import { presignGet } from '@/lib/storage-cos';
import { NAME_RE, mimeForName } from '@/lib/storage';

export async function GET(req: NextRequest) {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    throw e;
  }

  const key = req.nextUrl.searchParams.get('key') ?? '';
  // NAME_RE 本身已排除 '/'，这里显式再判一次是为了让「不接受子路径 key」这条意图在代码里可见。
  if (!key || key.includes('/') || !NAME_RE.test(key)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  // 无扩展名：key 必带 ext 才能定 MIME，也挡住 '..' 这类纯点号串
  if (!/\.[A-Za-z0-9]{1,10}$/.test(key)) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (mimeForName(key) === 'application/octet-stream') {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }

  const signed = presignGet(key);
  return NextResponse.json({ url: signed.url, expiresAt: signed.expiresAt });
}
