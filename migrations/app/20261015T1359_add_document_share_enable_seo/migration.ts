#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7a3412f9c8cbefe3993dd398e5abacdea70810a3dbf26c7739e4ec1a8785d4d6/contract';
import startContract from '../../snapshots/7a3412f9c8cbefe3993dd398e5abacdea70810a3dbf26c7739e4ec1a8785d4d6/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e7b3df90b4d20d945a3ab1258ef01fc1be72f0a43cdb9dacc77dfd72f3a65146/contract';
import endContract from '../../snapshots/e7b3df90b4d20d945a3ab1258ef01fc1be72f0a43cdb9dacc77dfd72f3a65146/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('enableSeo', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
