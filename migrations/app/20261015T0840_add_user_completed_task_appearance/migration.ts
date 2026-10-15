#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/04e36ed9fee604139ed88c28057604216ca64f02294f0ee96530b3424e635001/contract';
import endContract from '../../snapshots/04e36ed9fee604139ed88c28057604216ca64f02294f0ee96530b3424e635001/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c16fd7809f84501c3ee488355777ddfc1bd6edd757813d83fa2ef4804e06cee9/contract';
import startContract from '../../snapshots/c16fd7809f84501c3ee488355777ddfc1bd6edd757813d83fa2ef4804e06cee9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('completedTaskAppearance', 'text', {
          notNull: true,
          default: lit('strike'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
