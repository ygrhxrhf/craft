#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0b0378ba105e999d92934c6d1711195629ebdf9b6e34df22dbd284699ec5f47f/contract';
import endContract from '../../snapshots/0b0378ba105e999d92934c6d1711195629ebdf9b6e34df22dbd284699ec5f47f/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/2b8e7feeca15fc8349c7685b31393199d7a18fb08d26f2b67b9501c3b00a5540/contract';
import startContract from '../../snapshots/2b8e7feeca15fc8349c7685b31393199d7a18fb08d26f2b67b9501c3b00a5540/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_versions',
        column: col('meta', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
