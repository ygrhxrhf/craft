export type LwwDecision = 'apply' | 'reject';

export function decideLww(
  op: 'upsert' | 'delete',
  tCli: string,
  tSrv: string | null,
): LwwDecision {
  if (tSrv === null) return 'apply';           // op 语义在调用处保证幂等
  return tCli > tSrv ? 'apply' : 'reject';     // ISO 定长毫秒字符串可直接比较
}
