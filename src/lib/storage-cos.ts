import COS from 'cos-nodejs-sdk-v5';
import { cosConfig } from './storage-driver';

export const PUT_EXPIRES_SEC = 600; // spec 12：预签名 PUT 10 分钟
export const GET_EXPIRES_SEC = 300; // spec 12：预签名 GET 5 分钟

type CosClient = {
  getAuth(p: Record<string, unknown>): string;
  putObject(p: Record<string, unknown>): Promise<unknown>;
  deleteObject(p: Record<string, unknown>): Promise<unknown>;
};

let injected: CosClient | null = null;
let real: CosClient | null = null;

/** 配置字段 → 环境变量名，报错要报运维真正要改的那个名字。 */
const ENV_NAME = {
  SecretId: 'COS_SECRET_ID（或云托管注入的 TENCENTCLOUD_SECRETID）',
  SecretKey: 'COS_SECRET_KEY（或云托管注入的 TENCENTCLOUD_SECRETKEY）',
  Bucket: 'COS_BUCKET',
  Region: 'COS_REGION',
} as const;

function client(): CosClient {
  if (injected) return injected;
  if (real) return real;
  const cfg = cosConfig();
  for (const k of ['SecretId', 'SecretKey', 'Bucket', 'Region'] as const) {
    if (!cfg[k]) throw new Error(`COS 未配置：${ENV_NAME[k]} 为空`);
  }
  real = new COS({
    SecretId: cfg.SecretId,
    SecretKey: cfg.SecretKey,
    ...(cfg.Token ? { SecurityToken: cfg.Token } : {}),
    Protocol: 'https:',
  }) as unknown as CosClient;
  return real;
}

/** 桶名必须是 <name>-<appid> 形状，否则 SDK 返回 undefined。 */
function bucketHost(): { bucket: string; host: string } {
  const cfg = cosConfig();
  if (!cfg.Bucket) throw new Error('COS 未配置：COS_BUCKET 为空');
  if (!cfg.Region) throw new Error('COS 未配置：COS_REGION 为空');
  return { bucket: cfg.Bucket, host: `${cfg.Bucket}.cos.${cfg.Region}.myqcloud.com` };
}

/** COS key 逐段编码，保留 / 作路径分隔符。 */
function encodeKey(key: string): string {
  return key.split('/').map(encodeURIComponent).join('/');
}

function presign(key: string, method: 'PUT' | 'GET', expires: number, contentType?: string): string {
  const { bucket, host } = bucketHost();
  const headers: Record<string, string> = { Host: host };
  if (contentType) headers['Content-Type'] = contentType;
  const auth = client().getAuth({
    Bucket: bucket,
    Region: cosConfig().Region,
    Key: key,
    Method: method,
    Expires: expires,
    Headers: headers,
  });
  if (!auth) throw new Error('COS 签名失败：桶名或密钥不合法');
  // 临时密钥的 token 不进签名串，跟在 auth 之后（与 SDK getObjectUrl 同形）
  const token = cosConfig().Token;
  const tokenQuery = token ? `&x-cos-security-token=${encodeURIComponent(token)}` : '';
  return `https://${host}/${encodeKey(key)}?${auth}${tokenQuery}`;
}

export function presignPut(key: string, contentType: string) {
  return {
    url: presign(key, 'PUT', PUT_EXPIRES_SEC, contentType),
    key,
    expiresAt: Math.floor(Date.now() / 1000) + PUT_EXPIRES_SEC,
  };
}

export function presignGet(key: string) {
  return {
    url: presign(key, 'GET', GET_EXPIRES_SEC),
    expiresAt: Math.floor(Date.now() / 1000) + GET_EXPIRES_SEC,
  };
}

export async function putUpload(key: string, buf: Buffer, contentType: string): Promise<void> {
  const { bucket } = bucketHost();
  const cfg = cosConfig();
  await client().putObject({
    Bucket: bucket,
    Region: cfg.Region,
    Key: key,
    Body: buf,
    ContentLength: buf.byteLength,
    ContentType: contentType,
  });
}

export async function deleteUploadFromCos(key: string): Promise<void> {
  try {
    const { bucket } = bucketHost();
    await client().deleteObject({ Bucket: bucket, Region: cosConfig().Region, Key: key });
  } catch {
    // 删除失败必须吞掉：对象本来就不存在时不是错误（spec 7.2）
  }
}

export function setCosClientForTest(c: unknown): void {
  injected = c as CosClient;
}

export function resetCosForTest(): void {
  injected = null;
  real = null;
}
