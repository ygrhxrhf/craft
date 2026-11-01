#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/368beaa9a20ff8ca06dd841c51a8dc67adb3eb30f953d5e1487e6bbe815cfe53/contract';
import endContract from '../../snapshots/368beaa9a20ff8ca06dd841c51a8dc67adb3eb30f953d5e1487e6bbe815cfe53/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f9a343758e9ea2d004796891353bb8a48c8fab8c56a375845fba52c55d157cb5/contract';
import startContract from '../../snapshots/f9a343758e9ea2d004796891353bb8a48c8fab8c56a375845fba52c55d157cb5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'collection_items',
        column: col('schemas', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
