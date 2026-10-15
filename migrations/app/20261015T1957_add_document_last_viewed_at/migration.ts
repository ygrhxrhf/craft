#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/499195a540f8cb093b6989fecbc411fadb0db0d6d4acfcfd5b5d738a850b58e1/contract';
import endContract from '../../snapshots/499195a540f8cb093b6989fecbc411fadb0db0d6d4acfcfd5b5d738a850b58e1/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f21e8df1d0a22d1a34aa4d71f12a6b6817c93f578add0dd64b5c4921e6223f04/contract';
import startContract from '../../snapshots/f21e8df1d0a22d1a34aa4d71f12a6b6817c93f578add0dd64b5c4921e6223f04/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('lastViewedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
