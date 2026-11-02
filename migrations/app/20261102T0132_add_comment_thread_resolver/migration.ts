#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/06d729ed1e2ab97f59920931ba1b7c68cf106595584e4e9d01800b650705f50d/contract';
import startContract from '../../snapshots/06d729ed1e2ab97f59920931ba1b7c68cf106595584e4e9d01800b650705f50d/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d0aae764fce61369b8894038490e844f5e67b0fe2f311255af6a413e2568cd39/contract';
import endContract from '../../snapshots/d0aae764fce61369b8894038490e844f5e67b0fe2f311255af6a413e2568cd39/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'comment_threads',
        column: col('resolvedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'comment_threads',
        column: col('resolvedBy', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
