#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/51be9e5814c7452c0e68fbdced58486c8ae38ac94b9c2c27575376c622d09d6f/contract';
import startContract from '../../snapshots/51be9e5814c7452c0e68fbdced58486c8ae38ac94b9c2c27575376c622d09d6f/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/d4b8989be956cdc30b0f9ff509da2b70ad06314e3784362c27ff0d700420f185/contract';
import endContract from '../../snapshots/d4b8989be956cdc30b0f9ff509da2b70ad06314e3784362c27ff0d700420f185/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

// Lazily-constructed façade: no connection opens at module scope; its `raw`
// lane authors the backfill statements and its `contract` is the validated
// end contract this.dataTransform checks plans against.
const { raw, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'sync_events',
        columns: [
          col('cursor', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('tables', 'text[]', {
            notNull: true,
            codecRef: { codecId: 'pg/text@1', many: true },
          }),
          col('ts', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'sync_events_tables_elem_not_null_fbca2284',
            'array_position("tables", NULL) IS NULL',
          ),
        ],
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection_items',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection_properties',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection_values',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'collection_views',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'comment_threads',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'comments',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_tags',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_tags',
        column: col('updatedAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'documents',
        column: col('metaUpdatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'favorites',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'favorites',
        column: col('updatedAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tags',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tags',
        column: col('updatedAt', 'timestamptz', {
          notNull: true,
          default: fn('now()'),
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'tasks',
        column: col('deletedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'whiteboards',
        column: col('metaUpdatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'sync_events',
        index: 'sync_events_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      // 回填：新列填 now()；metaUpdatedAt 对齐 updatedAt
      this.dataTransform(contract, 'backfill-tags-updated-at', {
        check: () =>
          raw.sql`SELECT "id" FROM "tags" WHERE "updatedAt" IS NULL LIMIT 1`.returnsRow({
            id: 'pg/text@1',
          }),
        run: () =>
          raw.sql`UPDATE "tags" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`.affectedCount(),
      }),
      this.dataTransform(contract, 'backfill-document-tags-updated-at', {
        check: () =>
          raw
            .sql`SELECT "documentId" FROM "document_tags" WHERE "updatedAt" IS NULL LIMIT 1`
            .returnsRow({ documentId: 'pg/text@1' }),
        run: () =>
          raw
            .sql`UPDATE "document_tags" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`
            .affectedCount(),
      }),
      this.dataTransform(contract, 'backfill-favorites-updated-at', {
        check: () =>
          raw.sql`SELECT "id" FROM "favorites" WHERE "updatedAt" IS NULL LIMIT 1`.returnsRow({
            id: 'pg/text@1',
          }),
        run: () =>
          raw
            .sql`UPDATE "favorites" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`
            .affectedCount(),
      }),
      this.dataTransform(contract, 'backfill-documents-meta-updated-at', {
        check: () =>
          raw
            .sql`SELECT "id" FROM "documents" WHERE "metaUpdatedAt" IS NULL LIMIT 1`
            .returnsRow({ id: 'pg/text@1' }),
        run: () =>
          raw
            .sql`UPDATE "documents" SET "metaUpdatedAt" = "updatedAt" WHERE "metaUpdatedAt" IS NULL`
            .affectedCount(),
      }),
      this.dataTransform(contract, 'backfill-whiteboards-meta-updated-at', {
        check: () =>
          raw
            .sql`SELECT "id" FROM "whiteboards" WHERE "metaUpdatedAt" IS NULL LIMIT 1`
            .returnsRow({ id: 'pg/text@1' }),
        run: () =>
          raw
            .sql`UPDATE "whiteboards" SET "metaUpdatedAt" = "updatedAt" WHERE "metaUpdatedAt" IS NULL`
            .affectedCount(),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
