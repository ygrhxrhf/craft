#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/207324b7ddc004692c6be48aa22a557c977c6d038f7a1c4285763b2f04465958/contract';
import startContract from '../../snapshots/207324b7ddc004692c6be48aa22a557c977c6d038f7a1c4285763b2f04465958/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7a3412f9c8cbefe3993dd398e5abacdea70810a3dbf26c7739e4ec1a8785d4d6/contract';
import endContract from '../../snapshots/7a3412f9c8cbefe3993dd398e5abacdea70810a3dbf26c7739e4ec1a8785d4d6/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('hidePresentationMode', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('hideTableOfContents', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('showPageTitle', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('showWatermark', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
