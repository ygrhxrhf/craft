#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4be49cea398d4512ddf941bebfeb36343e91d1a483c4caa677a323d340fafbe5/contract';
import endContract from '../../snapshots/4be49cea398d4512ddf941bebfeb36343e91d1a483c4caa677a323d340fafbe5/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/5780740deeff3569dde3a020c845af348aec5d574b0e5607a6b8146f8efac338/contract';
import startContract from '../../snapshots/5780740deeff3569dde3a020c845af348aec5d574b0e5607a6b8146f8efac338/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'comments',
        column: col('reactions', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
