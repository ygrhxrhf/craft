import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { mimeForName, readUpload, presignGetOrNull } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: '未授权' }, { status: 401 });
  }

  const { name } = await params;
  const [baseName] = name.split(/[#?]/);
  const type = mimeForName(baseName);

  // cos 驱动：DB 里的文件名不变，直接 302 到预签名 GET（spec 7.2）。
  // 桶私有读，字节不过服务端 —— 也不做「服务端先探活」，那个 HEAD 请求只会把 100MB 的事变成一次额外往返。
  const presigned = presignGetOrNull(baseName);
  if (presigned) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: presigned.url,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  try {
    const buf = await readUpload(baseName);
    const inline = type.startsWith('image/') && type !== 'image/svg+xml'
      || type.startsWith('video/')
      || type.startsWith('audio/');
    return new Response(new Uint8Array(buf), {
      headers: {
        'Content-Type': type,
        'Content-Length': String(buf.byteLength),
        'Cache-Control': 'private, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src *; media-src *",
        ...(inline ? {} : { 'Content-Disposition': `attachment; filename="${baseName.replace(/"/g, '')}"` }),
      },
    });
  } catch {
    return Response.json({ error: '文件不存在' }, { status: 404 });
  }
}
