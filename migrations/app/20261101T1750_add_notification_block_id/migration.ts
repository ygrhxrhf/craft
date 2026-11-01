#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/49439db899d72c5e3038a243cb2e4710faac8f9cd343a6b9adfd8d0320f3e332/contract';
import startContract from '../../snapshots/49439db899d72c5e3038a243cb2e4710faac8f9cd343a6b9adfd8d0320f3e332/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/4b64bae7db0290e57ef6c1b7c53be64eb70ced733fd2001a7be26e6c88016941/contract';
import endContract from '../../snapshots/4b64bae7db0290e57ef6c1b7c53be64eb70ced733fd2001a7be26e6c88016941/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'notifications',
        column: col('blockId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
