#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/96531d333eeca0c4ca17467558a679a049c77e8e6529ec55e09c8ccfc6e7571a/contract';
import endContract from '../../snapshots/96531d333eeca0c4ca17467558a679a049c77e8e6529ec55e09c8ccfc6e7571a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/d4b8989be956cdc30b0f9ff509da2b70ad06314e3784362c27ff0d700420f185/contract';
import startContract from '../../snapshots/d4b8989be956cdc30b0f9ff509da2b70ad06314e3784362c27ff0d700420f185/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropDefault({ schema: 'public', table: 'document_tags', column: 'updatedAt' }),
      this.dropDefault({ schema: 'public', table: 'favorites', column: 'updatedAt' }),
      this.dropDefault({ schema: 'public', table: 'tags', column: 'updatedAt' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
