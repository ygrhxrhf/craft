#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/21b916cf122af802519a957f2cd0621be38ad8b5b4c73dffd63dcb14d8e36058/contract';
import startContract from '../../snapshots/21b916cf122af802519a957f2cd0621be38ad8b5b4c73dffd63dcb14d8e36058/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/fea70330558ce9de70d9bc650709da70aff718e1063e847dc778e204a326e1b8/contract';
import endContract from '../../snapshots/fea70330558ce9de70d9bc650709da70aff718e1063e847dc778e204a326e1b8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'tags',
        column: col('pinned', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
