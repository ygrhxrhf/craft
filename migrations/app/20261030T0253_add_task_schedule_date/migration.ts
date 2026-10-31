#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/0b0378ba105e999d92934c6d1711195629ebdf9b6e34df22dbd284699ec5f47f/contract';
import startContract from '../../snapshots/0b0378ba105e999d92934c6d1711195629ebdf9b6e34df22dbd284699ec5f47f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e1428a9d00780a3e64ffc155986dd3aa3be1e4398a69d40a2ab4fc6d60ef39dd/contract';
import endContract from '../../snapshots/e1428a9d00780a3e64ffc155986dd3aa3be1e4398a69d40a2ab4fc6d60ef39dd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tasks',
        column: col('scheduleDate', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
