#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/e7b3df90b4d20d945a3ab1258ef01fc1be72f0a43cdb9dacc77dfd72f3a65146/contract';
import startContract from '../../snapshots/e7b3df90b4d20d945a3ab1258ef01fc1be72f0a43cdb9dacc77dfd72f3a65146/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f21e8df1d0a22d1a34aa4d71f12a6b6817c93f578add0dd64b5c4921e6223f04/contract';
import endContract from '../../snapshots/f21e8df1d0a22d1a34aa4d71f12a6b6817c93f578add0dd64b5c4921e6223f04/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('expiresAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
