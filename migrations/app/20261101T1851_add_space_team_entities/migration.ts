#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/a4b7d766c86867cc2966263f08edb3ffed3676ad7bba8f760142f5d2b930ce3e/contract';
import endContract from '../../snapshots/a4b7d766c86867cc2966263f08edb3ffed3676ad7bba8f760142f5d2b930ce3e/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d05d8075f6fdb949add0b0e744e13faf695bff5c6498f728fc1cb6f5cf5abaf1/contract';
import startContract from '../../snapshots/d05d8075f6fdb949add0b0e744e13faf695bff5c6498f728fc1cb6f5cf5abaf1/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'space_members',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('joined', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('role', 'text', {
            notNull: true,
            default: lit('member'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('spaceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'spaces',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('icon', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            default: lit('我的空间'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('teamId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'team_members',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('member'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('state', 'text', {
            notNull: true,
            default: lit('active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('teamId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'teams',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', {
            notNull: true,
            default: lit('我的团队'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('ownerId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('settings', 'json', { codecRef: { codecId: 'pg/json@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'space_members',
        constraint: 'space_members_spaceId_userId_key',
        columns: ['spaceId', 'userId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'team_members',
        constraint: 'team_members_teamId_userId_key',
        columns: ['teamId', 'userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'space_members',
        index: 'space_members_spaceId_idx_bb21015f',
        columns: ['spaceId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'space_members',
        index: 'space_members_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'spaces',
        index: 'spaces_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'spaces',
        index: 'spaces_teamId_idx_f2b72ab3',
        columns: ['teamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'team_members',
        index: 'team_members_teamId_idx_f2b72ab3',
        columns: ['teamId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'team_members',
        index: 'team_members_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'teams',
        index: 'teams_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'space_members',
        foreignKey: {
          name: 'space_members_spaceId_fkey',
          columns: ['spaceId'],
          references: { schema: 'public', table: 'spaces', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'space_members',
        foreignKey: {
          name: 'space_members_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'spaces',
        foreignKey: {
          name: 'spaces_teamId_fkey',
          columns: ['teamId'],
          references: { schema: 'public', table: 'teams', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'spaces',
        foreignKey: {
          name: 'spaces_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'team_members',
        foreignKey: {
          name: 'team_members_teamId_fkey',
          columns: ['teamId'],
          references: { schema: 'public', table: 'teams', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'team_members',
        foreignKey: {
          name: 'team_members_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'teams',
        foreignKey: {
          name: 'teams_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'users', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
