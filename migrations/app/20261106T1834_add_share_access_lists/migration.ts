#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/84d5c32bb73cbbbd7358fba9b91a0e5f7900481eeb8a02275bf9b44c05072a09/contract';
import startContract from '../../snapshots/84d5c32bb73cbbbd7358fba9b91a0e5f7900481eeb8a02275bf9b44c05072a09/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/a06395d7ad3617c2b18d353e80c8876ed805db51dcd7affe26a952f55c18c400/contract';
import endContract from '../../snapshots/a06395d7ad3617c2b18d353e80c8876ed805db51dcd7affe26a952f55c18c400/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('allowedDomains', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('allowedEmails', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
