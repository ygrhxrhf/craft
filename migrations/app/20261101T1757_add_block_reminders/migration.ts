#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4b64bae7db0290e57ef6c1b7c53be64eb70ced733fd2001a7be26e6c88016941/contract';
import startContract from '../../snapshots/4b64bae7db0290e57ef6c1b7c53be64eb70ced733fd2001a7be26e6c88016941/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d82ae04d9c8b52a5c03ab33683dc35809b772c506ae146f6e3dd82ddd36ffadc/contract';
import endContract from '../../snapshots/d82ae04d9c8b52a5c03ab33683dc35809b772c506ae146f6e3dd82ddd36ffadc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'block_reminders',
        columns: [
          col('blockId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('completionDate', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isCompleted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('remindAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'block_reminders',
        constraint: 'block_reminders_blockId_remindAt_key',
        columns: ['blockId', 'remindAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block_reminders',
        index: 'block_reminders_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block_reminders',
        index: 'block_reminders_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'block_reminders',
        index: 'block_reminders_userId_isCompleted_idx_6840072e',
        columns: ['userId', 'isCompleted'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'block_reminders',
        foreignKey: {
          name: 'block_reminders_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'block_reminders',
        foreignKey: {
          name: 'block_reminders_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'documents', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
