#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/bd0e6de84898ccbdafc22218a2c2c4d5b42a3a70723a1cd91dffa59e13b8b8f0/contract';
import startContract from '../../snapshots/bd0e6de84898ccbdafc22218a2c2c4d5b42a3a70723a1cd91dffa59e13b8b8f0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f9a343758e9ea2d004796891353bb8a48c8fab8c56a375845fba52c55d157cb5/contract';
import endContract from '../../snapshots/f9a343758e9ea2d004796891353bb8a48c8fab8c56a375845fba52c55d157cb5/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'notifications',
        column: col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
