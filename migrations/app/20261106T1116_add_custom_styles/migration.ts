#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/014b0070093120244dd4539997489b5bf794564e996340d05bb7e2a84a2a0021/contract';
import startContract from '../../snapshots/014b0070093120244dd4539997489b5bf794564e996340d05bb7e2a84a2a0021/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/84d5c32bb73cbbbd7358fba9b91a0e5f7900481eeb8a02275bf9b44c05072a09/contract';
import endContract from '../../snapshots/84d5c32bb73cbbbd7358fba9b91a0e5f7900481eeb8a02275bf9b44c05072a09/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'custom_styles',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isDefault', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('order', 'float8', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/float8@1' },
          }),
          col('style', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'users',
        column: col('tagIgnoreRules', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'custom_styles',
        index: 'custom_styles_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'custom_styles',
        foreignKey: {
          name: 'custom_styles_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
