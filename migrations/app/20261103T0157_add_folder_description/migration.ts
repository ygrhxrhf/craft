#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/50eec0623a669005e4d5bb21f73836c2d0b44adeace9c2111972238ae843d4f5/contract';
import endContract from '../../snapshots/50eec0623a669005e4d5bb21f73836c2d0b44adeace9c2111972238ae843d4f5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/62c3132b216c21d2ecb4eca11f038e05d00807247f86bd85a2fe637b8de66700/contract';
import startContract from '../../snapshots/62c3132b216c21d2ecb4eca11f038e05d00807247f86bd85a2fe637b8de66700/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'folders',
        column: col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
