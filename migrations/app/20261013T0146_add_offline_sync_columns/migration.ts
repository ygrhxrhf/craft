#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5780740deeff3569dde3a020c845af348aec5d574b0e5607a6b8146f8efac338/contract';
import endContract from '../../snapshots/5780740deeff3569dde3a020c845af348aec5d574b0e5607a6b8146f8efac338/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/da51105384aa592c56bc82b6570a31b8f25e056b2e5e35910789c9c23e511338/contract';
import startContract from '../../snapshots/da51105384aa592c56bc82b6570a31b8f25e056b2e5e35910789c9c23e511338/contract.json' with { type: 'json' };
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
// lane authors the backfill statements and its `contract` is the validated end
// contract this.dataTransform checks plans against.
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
        table: 'tags',
        column: col('deletedAt', 'timestamptz', {
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
      this.addColumn({
        schema: 'public',
        table: 'document_tags',
        column: col('updatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.dataTransform(contract, 'backfill-document_tags-updatedAt', {
        check: () =>
          raw
            .sql`SELECT "documentId" FROM "document_tags" WHERE "updatedAt" IS NULL LIMIT 1`
            .returnsRow({ documentId: 'pg/text@1' }),
        run: () =>
          raw
            .sql`UPDATE "document_tags" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`
            .affectedCount(),
      }),
      this.setNotNull({ schema: 'public', table: 'document_tags', column: 'updatedAt' }),
      this.addColumn({
        schema: 'public',
        table: 'favorites',
        column: col('updatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.dataTransform(contract, 'backfill-favorites-updatedAt', {
        check: () =>
          raw.sql`SELECT "id" FROM "favorites" WHERE "updatedAt" IS NULL LIMIT 1`.returnsRow({
            id: 'pg/text@1',
          }),
        run: () =>
          raw
            .sql`UPDATE "favorites" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`
            .affectedCount(),
      }),
      this.setNotNull({ schema: 'public', table: 'favorites', column: 'updatedAt' }),
      this.addColumn({
        schema: 'public',
        table: 'tags',
        column: col('updatedAt', 'timestamptz', {
          codecRef: { codecId: 'pg/timestamptz-string@1' },
        }),
      }),
      this.dataTransform(contract, 'backfill-tags-updatedAt', {
        check: () =>
          raw.sql`SELECT "id" FROM "tags" WHERE "updatedAt" IS NULL LIMIT 1`.returnsRow({
            id: 'pg/text@1',
          }),
        run: () =>
          raw.sql`UPDATE "tags" SET "updatedAt" = now() WHERE "updatedAt" IS NULL`.affectedCount(),
      }),
      this.setNotNull({ schema: 'public', table: 'tags', column: 'updatedAt' }),
      this.createIndex({
        schema: 'public',
        table: 'sync_events',
        index: 'sync_events_userId_idx_a489d58a',
        columns: ['userId'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
