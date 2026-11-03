#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/014b0070093120244dd4539997489b5bf794564e996340d05bb7e2a84a2a0021/contract';
import endContract from '../../snapshots/014b0070093120244dd4539997489b5bf794564e996340d05bb7e2a84a2a0021/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/fea70330558ce9de70d9bc650709da70aff718e1063e847dc778e204a326e1b8/contract';
import startContract from '../../snapshots/fea70330558ce9de70d9bc650709da70aff718e1063e847dc778e204a326e1b8/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'folders',
        column: col('pinnedDocumentIds', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
