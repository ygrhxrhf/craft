#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/077d6fd86f3039b9f2685ec460bd99f31429456a1ed5fa5a60959e8056e17219/contract';
import endContract from '../../snapshots/077d6fd86f3039b9f2685ec460bd99f31429456a1ed5fa5a60959e8056e17219/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da995c0c19e139e6d1f89563c917eae71461ffacbf1223fe796f9cb2297f980a/contract';
import startContract from '../../snapshots/da995c0c19e139e6d1f89563c917eae71461ffacbf1223fe796f9cb2297f980a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverAspect', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverCropMask', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverFrame', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverRawAspect', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverRawWidth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverWidth', 'float8', { codecRef: { codecId: 'pg/float8@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
