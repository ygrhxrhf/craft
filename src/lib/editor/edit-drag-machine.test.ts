import { describe, expect, it } from 'vitest';

import { backupSelectionTypeOf, initialEditorMachine, reduceEditor } from './edit-drag-machine';
import { addTable, applyChanges, createDispatchTable, createRegistry, dispatch, register, tableByName } from './action-dispatch';
import { foldedLayers, implementedLayers, layerPath, SYNC_LAYERS, SYNC_LAYER_PATHS } from '@/lib/sync-core/layers';

/**
 * G591: the drag/edit action state machine, including the "block has its own drag" gate.
 */
describe('the editor action machine (G591)', () => {
  it('starts a drag and records the start point', () => {
    const next = reduceEditor(initialEditorMachine(), {
      type: 'startSelectionDragging',
      startPoint: { x: 1, y: 2 },
      startBlockId: 'b1',
      startBlockHasOwnDrag: false,
    });
    expect(next.drag.active).toBe(true);
    expect(next.drag.startBlockId).toBe('b1');
  });

  it('does not start a new drag when the start block has its own drag', () => {
    const next = reduceEditor(initialEditorMachine(), {
      type: 'startSelectionDragging',
      startPoint: { x: 1, y: 2 },
      startBlockId: 'b1',
      startBlockHasOwnDrag: true,
    });
    expect(next.drag.active).toBe(false);
  });

  it('updates the end point while dragging', () => {
    let state = reduceEditor(initialEditorMachine(), {
      type: 'startSelectionDragging',
      startPoint: { x: 0, y: 0 },
      startBlockId: 'b1',
      startBlockHasOwnDrag: false,
    });
    state = reduceEditor(state, { type: 'updateSelectionDragging', endPoint: { x: 5, y: 5 }, endBlockId: 'b2' });
    expect(state.drag.endBlockId).toBe('b2');
  });

  it('stopSelectionDragging clears the whole drag state (removeState)', () => {
    let state = reduceEditor(initialEditorMachine(), {
      type: 'startSelectionDragging',
      startPoint: { x: 0, y: 0 },
      startBlockId: 'b1',
      startBlockHasOwnDrag: false,
    });
    state = reduceEditor(state, { type: 'stopSelectionDragging' });
    expect(state.drag).toEqual(initialEditorMachine().drag);
  });

  it('tracks text vs code edit separately', () => {
    expect(reduceEditor(initialEditorMachine(), { type: 'startTextEdit', blockId: 'b1' }).edit.editingKind).toBe('text');
    expect(reduceEditor(initialEditorMachine(), { type: 'startCodeEdit', blockId: 'b1' }).edit.editingKind).toBe('code');
  });

  it('toggleBlockEditor opens and closes', () => {
    const open = reduceEditor(initialEditorMachine(), { type: 'toggleBlockEditor', blockId: 'b1', isOpen: true });
    expect(open.edit.editingBlockId).toBe('b1');
    const closed = reduceEditor(open, { type: 'toggleBlockEditor', blockId: 'b1', isOpen: false });
    expect(closed.edit.editingBlockId).toBeNull();
  });

  it('classifies the backup selection', () => {
    expect(backupSelectionTypeOf({ hasBackup: false, anchor: 0, head: 0 })).toBe('none');
    expect(backupSelectionTypeOf({ hasBackup: true, anchor: 3, head: 3 })).toBe('caret');
    expect(backupSelectionTypeOf({ hasBackup: true, anchor: 3, head: 5 })).toBe('range');
  });
});

/**
 * G594/G608: dispatch tables and the batch-change normalizer.
 */
describe('the action dispatch tables (G594)', () => {
  type State = { count: number };
  type Action = { type: string; by?: number };

  const table = createDispatchTable<State, Action>('document');
  register(table, 'increment', (state, action) => ({ count: state.count + (action.by ?? 1) }));

  it('dispatches a registered id', () => {
    expect(dispatch(table, { count: 1 }, { type: 'increment', by: 2 })).toEqual({ count: 3 });
  });

  it('returns null for an unregistered id rather than swallowing it', () => {
    expect(dispatch(table, { count: 1 }, { type: 'nope' })).toBeNull();
  });

  it('finds a table by name in the registry', () => {
    const registry = createRegistry<State, Action>();
    addTable(registry, table);
    expect(tableByName(registry, 'document')?.name).toBe('document');
    expect(tableByName(registry, 'ui-selection')).toBeNull();
  });

  it('applies a batch of changes in order over the running snapshot (G608)', () => {
    const apply = (state: State, change: Action) =>
      change.type === 'increment' ? { count: state.count + (change.by ?? 1) } : null;
    const result = applyChanges({ count: 0 }, [{ type: 'increment', by: 2 }, { type: 'increment', by: 3 }], apply);
    expect(result).toEqual({ state: { count: 5 }, applied: 2 });
  });

  it('refuses the whole batch when one change is unclaimed', () => {
    const apply = (state: State, change: Action) => (change.type === 'increment' ? { count: state.count + 1 } : null);
    expect(applyChanges({ count: 0 }, [{ type: 'increment' }, { type: 'unknown' }], apply)).toBeNull();
  });
});

/**
 * G342: every sync layer has a named path, and the module says which are implemented today.
 */
describe('the sync layer paths (G342)', () => {
  it('gives all ten layers a path', () => {
    expect(SYNC_LAYER_PATHS).toHaveLength(10);
    for (const layer of SYNC_LAYERS) {
      expect(layerPath(layer), layer).toBeTruthy();
    }
  });

  it('marks the three layers that travel as their own tables today', () => {
    expect(implementedLayers().map((l) => l.layer).sort()).toEqual(['Blocks', 'Comments', 'Requests']);
    expect(foldedLayers()).toHaveLength(7);
  });
});
