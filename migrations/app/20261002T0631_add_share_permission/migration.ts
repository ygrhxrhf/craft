#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/51be9e5814c7452c0e68fbdced58486c8ae38ac94b9c2c27575376c622d09d6f/contract';
import startContract from '../../snapshots/51be9e5814c7452c0e68fbdced58486c8ae38ac94b9c2c27575376c622d09d6f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f053adff7597b1179c3aac9fe8e50831e8235fe8c598ff320e4495b3b843a3fb/contract';
import endContract from '../../snapshots/f053adff7597b1179c3aac9fe8e50831e8235fe8c598ff320e4495b3b843a3fb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('permission', 'text', {
          notNull: true,
          default: lit('view'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('shareVersion', 'int4', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
