#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4be49cea398d4512ddf941bebfeb36343e91d1a483c4caa677a323d340fafbe5/contract';
import startContract from '../../snapshots/4be49cea398d4512ddf941bebfeb36343e91d1a483c4caa677a323d340fafbe5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c16fd7809f84501c3ee488355777ddfc1bd6edd757813d83fa2ef4804e06cee9/contract';
import endContract from '../../snapshots/c16fd7809f84501c3ee488355777ddfc1bd6edd757813d83fa2ef4804e06cee9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tasks',
        column: col('cancelledAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
