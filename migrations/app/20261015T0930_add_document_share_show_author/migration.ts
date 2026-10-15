#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/04e36ed9fee604139ed88c28057604216ca64f02294f0ee96530b3424e635001/contract';
import startContract from '../../snapshots/04e36ed9fee604139ed88c28057604216ca64f02294f0ee96530b3424e635001/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/207324b7ddc004692c6be48aa22a557c977c6d038f7a1c4285763b2f04465958/contract';
import endContract from '../../snapshots/207324b7ddc004692c6be48aa22a557c977c6d038f7a1c4285763b2f04465958/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('showAuthor', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
