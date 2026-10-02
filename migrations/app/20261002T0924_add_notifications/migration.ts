#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/2182bd06858f002d0c32ad287b5836647b58720e627fb3044b3a6f4c3ed0566e/contract';
import startContract from '../../snapshots/2182bd06858f002d0c32ad287b5836647b58720e627fb3044b3a6f4c3ed0566e/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/da51105384aa592c56bc82b6570a31b8f25e056b2e5e35910789c9c23e511338/contract';
import endContract from '../../snapshots/da51105384aa592c56bc82b6570a31b8f25e056b2e5e35910789c9c23e511338/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'notifications',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('documentId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('isResolved', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('kind', 'text', {
            notNull: true,
            default: lit('taskReminder'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('remindAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('resolvedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('taskId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'notifications',
        constraint: 'notifications_taskId_remindAt_key',
        columns: ['taskId', 'remindAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_documentId_idx_825ef746',
        columns: ['documentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_taskId_idx_4965c936',
        columns: ['taskId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'notifications',
        index: 'notifications_userId_isResolved_idx_f4797344',
        columns: ['userId', 'isResolved'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_taskId_fkey',
          columns: ['taskId'],
          references: { schema: 'public', table: 'tasks', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'notifications',
        foreignKey: {
          name: 'notifications_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'documents', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
