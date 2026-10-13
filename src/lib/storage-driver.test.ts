import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cosConfig, driverName, isCos, resetDriverForTest } from './storage-driver';

const KEYS = [
  'STORAGE_DRIVER',
  'COS_BUCKET',
  'COS_REGION',
  'COS_SECRET_ID',
  'COS_SECRET_KEY',
  'COS_SECRET_TOKEN',
  'TENCENTCLOUD_SECRETID',
  'TENCENTCLOUD_SECRETKEY',
  'TENCENTCLOUD_SESSIONTOKEN',
  'TENCENTCLOUD_TOKEN',
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

  it('cosConfig 在 local 驱动下也能读出五项环境变量', () => {
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
      Token: '',
    });
  });

  it('无手工密钥时回落云托管容器注入的临时密钥', () => {
    process.env.COS_BUCKET = '6161-aaa11-1356535306';
    process.env.COS_REGION = 'ap-shanghai';
    process.env.TENCENTCLOUD_SECRETID = 'AKIDinjected';
    process.env.TENCENTCLOUD_SECRETKEY = 'secretkeyinjected';
    process.env.TENCENTCLOUD_SESSIONTOKEN = 'token-injected';
    resetDriverForTest();
    expect(cosConfig()).toEqual({
      Bucket: '6161-aaa11-1356535306',
      Region: 'ap-shanghai',
      SecretId: 'AKIDinjected',
      SecretKey: 'secretkeyinjected',
      Token: 'token-injected',
    });
  });

  it('手工 COS_SECRET_* 优先于注入值', () => {
    process.env.COS_SECRET_ID = 'AKIDmanual';
    process.env.COS_SECRET_KEY = 'secretkeymanual';
    process.env.TENCENTCLOUD_SECRETID = 'AKIDinjected';
    process.env.TENCENTCLOUD_SECRETKEY = 'secretkeyinjected';
    resetDriverForTest();
    const cfg = cosConfig();
    expect(cfg.SecretId).toBe('AKIDmanual');
    expect(cfg.SecretKey).toBe('secretkeymanual');
  });

  it('Token 回落顺序：COS_SECRET_TOKEN > TENCENTCLOUD_SESSIONTOKEN > TENCENTCLOUD_TOKEN', () => {
    process.env.TENCENTCLOUD_SESSIONTOKEN = 'session';
    process.env.TENCENTCLOUD_TOKEN = 'plain';
    resetDriverForTest();
    expect(cosConfig().Token).toBe('session');
    delete process.env.TENCENTCLOUD_SESSIONTOKEN;
    resetDriverForTest();
    expect(cosConfig().Token).toBe('plain');
    process.env.COS_SECRET_TOKEN = 'manual';
    resetDriverForTest();
    expect(cosConfig().Token).toBe('manual');
  });

  it('永久密钥下 Token 为空，不污染签名串', () => {
    process.env.COS_SECRET_ID = 'AKIDtest';
    process.env.COS_SECRET_KEY = 'secretkeytest';
    resetDriverForTest();
    expect(cosConfig().Token).toBe('');
  });
});
