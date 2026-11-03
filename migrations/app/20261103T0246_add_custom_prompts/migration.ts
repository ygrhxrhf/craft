#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/50eec0623a669005e4d5bb21f73836c2d0b44adeace9c2111972238ae843d4f5/contract';
import startContract from '../../snapshots/50eec0623a669005e4d5bb21f73836c2d0b44adeace9c2111972238ae843d4f5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/95ba9546b2426c2b966209310566077bb802a0a34aa72dc120d8fb1b12aeb402/contract';
import endContract from '../../snapshots/95ba9546b2426c2b966209310566077bb802a0a34aa72dc120d8fb1b12aeb402/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('promptObjects', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('prompts', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
