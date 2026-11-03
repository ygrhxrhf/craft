#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/36d374b237927c1a3e204ef0017372973f4a2c617b426a19539464c539a85a56/contract';
import startContract from '../../snapshots/36d374b237927c1a3e204ef0017372973f4a2c617b426a19539464c539a85a56/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/43243b37083d4aa99e64c08764dde6c6ba190dbaefb29763d18ec398e304d8f7/contract';
import endContract from '../../snapshots/43243b37083d4aa99e64c08764dde6c6ba190dbaefb29763d18ec398e304d8f7/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'collections',
        column: col('titleColumn', 'text', {
          notNull: true,
          default: lit('Title'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
