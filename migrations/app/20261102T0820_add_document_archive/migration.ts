#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/62c3132b216c21d2ecb4eca11f038e05d00807247f86bd85a2fe637b8de66700/contract';
import endContract from '../../snapshots/62c3132b216c21d2ecb4eca11f038e05d00807247f86bd85a2fe637b8de66700/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d0aae764fce61369b8894038490e844f5e67b0fe2f311255af6a413e2568cd39/contract';
import startContract from '../../snapshots/d0aae764fce61369b8894038490e844f5e67b0fe2f311255af6a413e2568cd39/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('isArchived', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
