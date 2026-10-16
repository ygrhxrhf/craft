#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/2b8e7feeca15fc8349c7685b31393199d7a18fb08d26f2b67b9501c3b00a5540/contract';
import endContract from '../../snapshots/2b8e7feeca15fc8349c7685b31393199d7a18fb08d26f2b67b9501c3b00a5540/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/63e77cf2d206f65a573d9ee41fb48ddf7032a96b022260602b0de51270ed618e/contract';
import startContract from '../../snapshots/63e77cf2d206f65a573d9ee41fb48ddf7032a96b022260602b0de51270ed618e/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    // G233 同批：另外两处可空外键也是 NO ACTION，物理删除同样会撞 FK：
    //   ① collection_items.documentId —— 删一篇被收进集合的文档时撞（探针实测剩 1 行即此因）；
    //   ② folders.parentId —— `purgeTombstones` 30 天后硬删文件夹时撞。
    // 统一改成 setNull：删宿主时把引用行提升到根／留成无宿主，与同族 `folderId` 既有档位一致。
    // planner 无法自动 diff FK action，故手写。
    return [
      this.dropConstraint({
        schema: 'public',
        table: 'collection_items',
        constraint: 'collection_items_documentId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'collection_items',
        foreignKey: {
          name: 'collection_items_documentId_fkey',
          columns: ['documentId'],
          references: { schema: 'public', table: 'documents', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'folders',
        constraint: 'folders_parentId_fkey',
        kind: 'foreignKey',
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'folders',
        foreignKey: {
          name: 'folders_parentId_fkey',
          columns: ['parentId'],
          references: { schema: 'public', table: 'folders', columns: ['id'] },
          onDelete: 'setNull',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
