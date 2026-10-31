#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/bd0e6de84898ccbdafc22218a2c2c4d5b42a3a70723a1cd91dffa59e13b8b8f0/contract';
import endContract from '../../snapshots/bd0e6de84898ccbdafc22218a2c2c4d5b42a3a70723a1cd91dffa59e13b8b8f0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/e1428a9d00780a3e64ffc155986dd3aa3be1e4398a69d40a2ab4fc6d60ef39dd/contract';
import startContract from '../../snapshots/e1428a9d00780a3e64ffc155986dd3aa3be1e4398a69d40a2ab4fc6d60ef39dd/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'connections',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('endpoint', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('kind', 'text', {
            notNull: true,
            default: lit('mcp'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('token', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'connections',
        index: 'connections_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'connections',
        foreignKey: {
          name: 'connections_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
