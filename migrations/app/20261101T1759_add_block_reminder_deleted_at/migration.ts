#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/d05d8075f6fdb949add0b0e744e13faf695bff5c6498f728fc1cb6f5cf5abaf1/contract';
import endContract from '../../snapshots/d05d8075f6fdb949add0b0e744e13faf695bff5c6498f728fc1cb6f5cf5abaf1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d82ae04d9c8b52a5c03ab33683dc35809b772c506ae146f6e3dd82ddd36ffadc/contract';
import startContract from '../../snapshots/d82ae04d9c8b52a5c03ab33683dc35809b772c506ae146f6e3dd82ddd36ffadc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'block_reminders',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
