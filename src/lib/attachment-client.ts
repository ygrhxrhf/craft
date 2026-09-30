'use client';

/**
 * 客户端直传（spec 5.2 / ch.7）：向服务端换一个 10 分钟有效的预签名 PUT，
 * 再把字节直投 COS —— 附件不经过应用服务器，offline 时由 attachment-queue 兜住重试。
 *
 * 抛错是刻意的：任何一步失败都原样冒泡，让队列把它归为 network 并按退避阶梯重排。
 * 所以这里**不要**吞错、也不要返回 `{ok:false}` 之类的软失败形状。
 */

export type PutResult = { ok: boolean; status: number };
export type PutImpl = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: Blob },
) => Promise<PutResult>;

export type DirectUploadDeps = { fetchImpl?: typeof fetch; putImpl?: PutImpl };

const defaultPut: PutImpl = async (url, init) => {
  const res = await fetch(url, init as unknown as RequestInit);
  return { ok: res.ok, status: res.status };
};

export async function directUpload(file: File, deps: DirectUploadDeps = {}) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const putImpl = deps.putImpl ?? defaultPut;

  const signRes = await fetchImpl('/api/v1/attachments/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: file.name, size: file.size, type: file.type }),
  });
  // 网关返 HTML、连接被掐断都会让 json() 抛 —— 退化成通用错误，别把解析异常当成上传失败堆栈。
  const body = (await signRes.json().catch(() => ({}))) as {
    uploadUrl?: string; key?: string; error?: string;
  };
  // 200 但缺 uploadUrl/key 同样算失败：拿着半个响应去 PUT 只会浪费一轮往返。
  if (!signRes.ok || !body.uploadUrl || !body.key) {
    throw new Error(body.error ?? '获取上传地址失败');
  }

  const putRes = await putImpl(body.uploadUrl, {
    method: 'PUT',
    // 必须与 sign 时声明的类型一致：服务端已强制 type === mimeForName(name)，
    // 这里改成 octet-stream 会让 COS 存下一个与扩展名不符的 Content-Type。
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!putRes.ok) throw new Error(`上传失败（${putRes.status}）`);

  // DB 里存的是 COS key，url 仍走应用自己的读接口（local 驱动读磁盘、cos 驱动 302）。
  return { url: `/api/files/${body.key}`, name: body.key, size: file.size, type: file.type };
}
