#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/499195a540f8cb093b6989fecbc411fadb0db0d6d4acfcfd5b5d738a850b58e1/contract';
import startContract from '../../snapshots/499195a540f8cb093b6989fecbc411fadb0db0d6d4acfcfd5b5d738a850b58e1/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/63e77cf2d206f65a573d9ee41fb48ddf7032a96b022260602b0de51270ed618e/contract';
import endContract from '../../snapshots/63e77cf2d206f65a573d9ee41fb48ddf7032a96b022260602b0de51270ed618e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    // G233：`documents.parentId` 的自引用 FK 此前是 NO ACTION（PG confdeltype='a'），
    // 于是**任何有子文档的文档都物理删不掉**——`permanentDeleteDocument` 与「清空最近删除」
    // 都会撞 `documents_parentId_fkey`。改成 setNull：删父时把子文档提升到根，
    // 与同表 `folderId` 的既有档位一致。planner 无法自动 diff FK action，故手写本迁移。
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'documents',
        constraint: 'documents_parentId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'documents',
        foreignKey: {
          name: 'documents_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'documents', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
