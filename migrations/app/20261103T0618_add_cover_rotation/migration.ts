#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/43243b37083d4aa99e64c08764dde6c6ba190dbaefb29763d18ec398e304d8f7/contract';
import startContract from '../../snapshots/43243b37083d4aa99e64c08764dde6c6ba190dbaefb29763d18ec398e304d8f7/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/da995c0c19e139e6d1f89563c917eae71461ffacbf1223fe796f9cb2297f980a/contract';
import endContract from '../../snapshots/da995c0c19e139e6d1f89563c917eae71461ffacbf1223fe796f9cb2297f980a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverImages', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('coverShuffle', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
