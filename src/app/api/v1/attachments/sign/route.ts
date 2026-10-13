import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { requireUserId, AuthorizationError } from '@/lib/authz/guard';
import { presignPut } from '@/lib/storage-cos';
import { NAME_RE, mimeForName, directUploadEnabled } from '@/lib/storage';

/** spec 12：附件直传上限 100MB */
export const MAX_ATTACHMENT_SIZE = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireUserId();
  } catch (e) {
    if (e instanceof AuthorizationError) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    throw e;
  }

  // local 驱动下直传不可用：presignPut 会因 COS_* 未配置而抛 500。回客户端让它走旧 multipart 通道。
  if (!directUploadEnabled()) {
    return NextResponse.json({ error: '当前未启用直传' }, { status: 409 });
  }

  let body: { name?: unknown; size?: unknown; type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }

  const { name, size, type } = body;
  if (typeof name !== 'string' || typeof size !== 'number' || typeof type !== 'string') {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (!Number.isInteger(size) || size <= 0) {
    return NextResponse.json({ error: '参数错误' }, { status: 400 });
  }
  if (size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: '文件超过 100MB 限制' }, { status: 413 });
  }

  // 只取 basename 参与判定：用户可以传 'a/b/photo.png'，但 key 一律由 UUID 生成。
  const base = name.split(/[/\\]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const ext = dot > 0 ? base.slice(dot).toLowerCase() : '';
  if (!ext) {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  // 扩展名本身也要过 NAME_RE，否则 'a.<script>' 之类会漏进 key。
  if (!NAME_RE.test(ext)) {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  const expected = mimeForName(base);
  if (expected === 'application/octet-stream') {
    return NextResponse.json({ error: '文件类型不支持' }, { status: 400 });
  }
  if (type !== expected) {
    return NextResponse.json({ error: '文件类型不匹配' }, { status: 400 });
  }

  // 沿用 storage.ts 的 UUID 化文件名规则，且不采信用户传入的名字（spec 5.2 key 规则）
  const finalKey = randomUUID() + ext;
  const signed = presignPut(finalKey, expected);
  return NextResponse.json({
    uploadUrl: signed.url,
    key: signed.key,
    expiresAt: signed.expiresAt,
  });
}
