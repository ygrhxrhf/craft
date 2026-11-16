#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/5a09311eab7488b8e30aa606e2b0c97a3b057a729390c65e10b6def21bf66876/contract';
import endContract from '../../snapshots/5a09311eab7488b8e30aa606e2b0c97a3b057a729390c65e10b6def21bf66876/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/a06395d7ad3617c2b18d353e80c8876ed805db51dcd7affe26a952f55c18c400/contract';
import startContract from '../../snapshots/a06395d7ad3617c2b18d353e80c8876ed805db51dcd7affe26a952f55c18c400/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

// G1640：旧表情是一枚 JSON 数组挂在 comments.reactions 上，拆表前先逐枚搬进新行表
// （每人每枚一行）。raw 通道只为这一条搬运服务；check 用「还有没搬完的旧数组」定义。
const { raw, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'comment_reactions',
        columns: [
          col('commentId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('deletedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('glyph', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            default: lit(''),
            codecRef: { codecId: 'pg/text@1' },
          }),
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
        table: 'comment_reactions',
        constraint: 'comment_reactions_commentId_userId_glyph_key',
        columns: ['commentId', 'userId', 'glyph'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment_reactions',
        index: 'comment_reactions_commentId_idx_b5a4f615',
        columns: ['commentId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'comment_reactions',
        index: 'comment_reactions_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment_reactions',
        foreignKey: {
          name: 'comment_reactions_commentId_fkey',
          columns: ['commentId'],
          references: { schema: 'public', table: 'comments', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'comment_reactions',
        foreignKey: {
          name: 'comment_reactions_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.dataTransform(contract, 'migrate-comments-reactions-rows', {
        check: () =>
          raw
            .sql`SELECT "id" FROM "comments" WHERE "reactions" IS NOT NULL AND json_typeof("reactions") = 'array' AND json_array_length("reactions") > 0 LIMIT 1`
            .returnsRow({ id: 'pg/text@1' }),
        // 两步一趟：先逐枚搬进行表，再把旧数组清掉——check 判的是"还有没搬完的旧数组"，
        // 只搬不清会让 postcheck 永远看到违例行（首跑就是撞在这上面）。
        run: [
          () =>
            raw
              .sql`INSERT INTO "comment_reactions" ("id", "commentId", "userId", "glyph", "name", "createdAt", "updatedAt")
                SELECT gen_random_uuid()::text,
                       c."id",
                       e->>'userId',
                       e->>'glyph',
                       COALESCE(e->>'name', ''),
                       c."createdAt",
                       c."updatedAt"
                  FROM "comments" c
                  CROSS JOIN LATERAL json_array_elements(c."reactions") AS e
                 WHERE c."reactions" IS NOT NULL
                   AND json_typeof(c."reactions") = 'array'
                   AND e->>'userId' IS NOT NULL
                   AND e->>'glyph' IS NOT NULL
                ON CONFLICT ("commentId", "userId", "glyph") DO NOTHING`
              .affectedCount(),
          () =>
            raw
              .sql`UPDATE "comments" SET "reactions" = NULL WHERE "reactions" IS NOT NULL`
              .affectedCount(),
        ],
      }),
      this.dropColumn({ schema: 'public', table: 'comments', column: 'reactions' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
