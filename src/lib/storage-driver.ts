export type StorageDriver = 'local' | 'cos';

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

export function cosConfig(): { Bucket: string; Region: string; SecretId: string; SecretKey: string } {
  return {
    Bucket: process.env.COS_BUCKET ?? '',
    Region: process.env.COS_REGION ?? '',
    SecretId: process.env.COS_SECRET_ID ?? '',
    SecretKey: process.env.COS_SECRET_KEY ?? '',
  };
}

export function resetDriverForTest(): void {
  cachedDriver = null;
}
