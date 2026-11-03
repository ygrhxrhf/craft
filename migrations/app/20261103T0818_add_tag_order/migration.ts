#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/077d6fd86f3039b9f2685ec460bd99f31429456a1ed5fa5a60959e8056e17219/contract';
import startContract from '../../snapshots/077d6fd86f3039b9f2685ec460bd99f31429456a1ed5fa5a60959e8056e17219/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/21b916cf122af802519a957f2cd0621be38ad8b5b4c73dffd63dcb14d8e36058/contract';
import endContract from '../../snapshots/21b916cf122af802519a957f2cd0621be38ad8b5b4c73dffd63dcb14d8e36058/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tags',
        column: col('order', 'float8', {
          notNull: true,
          default: lit(0),
          codecRef: { codecId: 'pg/float8@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
