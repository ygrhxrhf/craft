export type StorageDriver = 'local' | 'cos';

export type CosConfig = {
  Bucket: string;
  Region: string;
  SecretId: string;
  SecretKey: string;
  Token: string;
};

let cachedDriver: StorageDriver | null = null;

/** 读一次就缓存；测试用 resetDriverForTest() 清除。 */
export function driverName(): StorageDriver {
  if (cachedDriver) return cachedDriver;
  const raw = (process.env.STORAGE_DRIVER ?? '').trim().toLowerCase();
  cachedDriver = raw === 'cos' ? 'cos' : 'local';
  return cachedDriver;
}

export function isCos(): boolean {
  return driverName() === 'cos';
}

/**
 * 手工 COS_SECRET_* 优先（本地/CI 用永久密钥）；缺则用云托管容器自动注入的临时密钥。
 * Token 非空时预签名 URL 必须带 x-cos-security-token，否则 COS 拒绝。
 */
export function cosConfig(): CosConfig {
  return {
    Bucket: process.env.COS_BUCKET ?? '',
    Region: process.env.COS_REGION ?? '',
    SecretId: process.env.COS_SECRET_ID || process.env.TENCENTCLOUD_SECRETID || '',
    SecretKey: process.env.COS_SECRET_KEY || process.env.TENCENTCLOUD_SECRETKEY || '',
    Token:
      process.env.COS_SECRET_TOKEN ||
      process.env.TENCENTCLOUD_SESSIONTOKEN ||
      process.env.TENCENTCLOUD_TOKEN ||
      '',
  };
}

export function resetDriverForTest(): void {
  cachedDriver = null;
}
