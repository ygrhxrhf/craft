#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/31d233f1070ee773e774e25926bf993d51edce2ed2c24084ca83ab9abe3a3679/contract';
import startContract from '../../snapshots/31d233f1070ee773e774e25926bf993d51edce2ed2c24084ca83ab9abe3a3679/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/49439db899d72c5e3038a243cb2e4710faac8f9cd343a6b9adfd8d0320f3e332/contract';
import endContract from '../../snapshots/49439db899d72c5e3038a243cb2e4710faac8f9cd343a6b9adfd8d0320f3e332/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tasks',
        column: col('seriesId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
