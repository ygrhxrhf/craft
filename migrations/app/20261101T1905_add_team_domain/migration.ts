#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/a4b7d766c86867cc2966263f08edb3ffed3676ad7bba8f760142f5d2b930ce3e/contract';
import startContract from '../../snapshots/a4b7d766c86867cc2966263f08edb3ffed3676ad7bba8f760142f5d2b930ce3e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/f4b9a80b672380f1415ed840006cc8e16ac31bb0117a11240a3806fc2676b364/contract';
import endContract from '../../snapshots/f4b9a80b672380f1415ed840006cc8e16ac31bb0117a11240a3806fc2676b364/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'teams',
        column: col('dnsRecords', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'teams',
        column: col('domain', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'teams',
        column: col('domainState', 'text', {
          notNull: true,
          default: lit('unset'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'teams',
        column: col('domainTier', 'text', {
          notNull: true,
          default: lit('defaultCraft'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
