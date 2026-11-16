#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5a09311eab7488b8e30aa606e2b0c97a3b057a729390c65e10b6def21bf66876/contract';
import startContract from '../../snapshots/5a09311eab7488b8e30aa606e2b0c97a3b057a729390c65e10b6def21bf66876/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/7272ebb20e0b550811af3ec9cd4cdcc328d8edc9f5e5bf669d997ef239cc13d8/contract';
import endContract from '../../snapshots/7272ebb20e0b550811af3ec9cd4cdcc328d8edc9f5e5bf669d997ef239cc13d8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'sync_tombstones',
        columns: [
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('recordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('syncTs', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('table', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'sync_tombstones',
        constraint: 'sync_tombstones_table_recordId_userId_key',
        columns: ['table', 'recordId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'sync_tombstones',
        index: 'sync_tombstones_userId_syncTs_idx_1aa294fc',
        columns: ['userId', 'syncTs'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
