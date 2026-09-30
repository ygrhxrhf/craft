import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cosConfig, driverName, isCos, resetDriverForTest } from './storage-driver';

const KEYS = [
  'STORAGE_DRIVER',
  'COS_BUCKET',
  'COS_REGION',
  'COS_SECRET_ID',
  'COS_SECRET_KEY',
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  resetDriverForTest();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetDriverForTest();
});

describe('storage-driver', () => {
  it('未设置 STORAGE_DRIVER 时默认 local', () => {
    expect(driverName()).toBe('local');
    expect(isCos()).toBe(false);
  });

  it('STORAGE_DRIVER=local 显式走本地', () => {
    process.env.STORAGE_DRIVER = 'local';
    resetDriverForTest();
    expect(driverName()).toBe('local');
  });

  it('STORAGE_DRIVER=cos 走 COS', () => {
    process.env.STORAGE_DRIVER = 'cos';
    resetDriverForTest();
    expect(driverName()).toBe('cos');
    expect(isCos()).toBe(true);
  });

  it('STORAGE_DRIVER 非法值回落 local 而不是抛错', () => {
    process.env.STORAGE_DRIVER = 's3';
    resetDriverForTest();
    expect(driverName()).toBe('local');
  });

  it('cosConfig 在 local 驱动下也能读出四项环境变量', () => {
    process.env.COS_BUCKET = 'crafty-1250000000';
    process.env.COS_REGION = 'ap-guangzhou';
    process.env.COS_SECRET_ID = 'AKIDtest';
    process.env.COS_SECRET_KEY = 'secretkeytest';
    resetDriverForTest();
    expect(cosConfig()).toEqual({
      Bucket: 'crafty-1250000000',
      Region: 'ap-guangzhou',
      SecretId: 'AKIDtest',
      SecretKey: 'secretkeytest',
    });
  });
});
