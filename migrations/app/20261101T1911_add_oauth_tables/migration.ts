#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/06d729ed1e2ab97f59920931ba1b7c68cf106595584e4e9d01800b650705f50d/contract';
import endContract from '../../snapshots/06d729ed1e2ab97f59920931ba1b7c68cf106595584e4e9d01800b650705f50d/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/f4b9a80b672380f1415ed840006cc8e16ac31bb0117a11240a3806fc2676b364/contract';
import startContract from '../../snapshots/f4b9a80b672380f1415ed840006cc8e16ac31bb0117a11240a3806fc2676b364/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'oauth_clients',
        columns: [
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('redirectUris', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'oauth_codes',
        columns: [
          col('clientId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('code', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('consumedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('redirectUri', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
        table: 'oauth_clients',
        constraint: 'oauth_clients_clientId_key',
        columns: ['clientId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'oauth_codes',
        constraint: 'oauth_codes_code_key',
        columns: ['code'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'oauth_codes',
        index: 'oauth_codes_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'oauth_codes',
        foreignKey: {
          name: 'oauth_codes_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
