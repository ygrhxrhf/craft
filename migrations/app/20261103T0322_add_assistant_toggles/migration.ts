#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/36d374b237927c1a3e204ef0017372973f4a2c617b426a19539464c539a85a56/contract';
import endContract from '../../snapshots/36d374b237927c1a3e204ef0017372973f4a2c617b426a19539464c539a85a56/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/95ba9546b2426c2b966209310566077bb802a0a34aa72dc120d8fb1b12aeb402/contract';
import startContract from '../../snapshots/95ba9546b2426c2b966209310566077bb802a0a34aa72dc120d8fb1b12aeb402/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('assistantDisabledSpaces', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('assistantEnabled', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
