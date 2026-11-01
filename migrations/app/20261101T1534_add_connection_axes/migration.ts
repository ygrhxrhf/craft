#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3545490dee39559b3e767f7179ac55fe31edd6349bf715e3c096672c33a4f922/contract';
import endContract from '../../snapshots/3545490dee39559b3e767f7179ac55fe31edd6349bf715e3c096672c33a4f922/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/368beaa9a20ff8ca06dd841c51a8dc67adb3eb30f953d5e1487e6bbe815cfe53/contract';
import startContract from '../../snapshots/368beaa9a20ff8ca06dd841c51a8dc67adb3eb30f953d5e1487e6bbe815cfe53/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'connections',
        column: col('permission', 'text', {
          notNull: true,
          default: lit('read-write'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'connections',
        column: col('protection', 'text', {
          notNull: true,
          default: lit('public'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'connections',
        column: col('scope', 'text', {
          notNull: true,
          default: lit('all-documents'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
