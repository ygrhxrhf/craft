#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2182bd06858f002d0c32ad287b5836647b58720e627fb3044b3a6f4c3ed0566e/contract';
import endContract from '../../snapshots/2182bd06858f002d0c32ad287b5836647b58720e627fb3044b3a6f4c3ed0566e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f053adff7597b1179c3aac9fe8e50831e8235fe8c598ff320e4495b3b843a3fb/contract';
import startContract from '../../snapshots/f053adff7597b1179c3aac9fe8e50831e8235fe8c598ff320e4495b3b843a3fb/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('notifyComments', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('notifyDaily', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('notifyReminders', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
