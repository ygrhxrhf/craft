#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/31d233f1070ee773e774e25926bf993d51edce2ed2c24084ca83ab9abe3a3679/contract';
import endContract from '../../snapshots/31d233f1070ee773e774e25926bf993d51edce2ed2c24084ca83ab9abe3a3679/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/3545490dee39559b3e767f7179ac55fe31edd6349bf715e3c096672c33a4f922/contract';
import startContract from '../../snapshots/3545490dee39559b3e767f7179ac55fe31edd6349bf715e3c096672c33a4f922/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('commentLevel', 'text', {
          notNull: true,
          default: lit('add'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('defaultDomain', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('emailBasedAccessEnabled', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('enableObjectLinks', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('hideHashTagWords', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'document_shares',
        column: col('showDuplicateAsTemplate', 'bool', {
          notNull: true,
          default: lit(false),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
