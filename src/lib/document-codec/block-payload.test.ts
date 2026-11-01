import { describe, expect, it } from 'vitest';

import {
  checkPayloadPlacement,
  containerForType,
  isContainerAllowed,
  PAYLOAD_CONTAINERS,
  projectPayload,
} from './block-payload';

describe('containerForType (G400)', () => {
  it('sends table data to pluginData', () => {
    expect(containerForType('table')).toBe('pluginData');
  });

  it('sends object and objectList to objectData', () => {
    expect(containerForType('object')).toBe('objectData');
    expect(containerForType('objectList')).toBe('objectData');
  });

  it('sends code body and whiteboard data to blob', () => {
    expect(containerForType('codeBlock')).toBe('blob');
    expect(containerForType('whiteboard')).toBe('blob');
  });

  it('everything else is text, so content', () => {
    expect(containerForType('paragraph')).toBe('content');
    expect(containerForType('heading')).toBe('content');
    expect(containerForType(undefined)).toBe('content');
  });

  it('there are exactly four containers', () => {
    expect(PAYLOAD_CONTAINERS).toEqual(['content', 'pluginData', 'objectData', 'blob']);
  });
});

describe('projectPayload', () => {
  it('puts text in content and the payload in its own container', () => {
    const projection = projectPayload({ type: 'table', payload: { rows: 2 }, text: '表' });
    expect(projection.content).toBe('表');
    expect(projection.pluginData).toEqual({ rows: 2 });
    expect(projection.objectData).toBeNull();
    expect(projection.blob).toBeNull();
  });

  it('a text-only block has no structured payload anywhere', () => {
    const projection = projectPayload({ type: 'paragraph', text: '你好' });
    expect(projection).toEqual({ content: '你好', pluginData: null, objectData: null, blob: null });
  });

  it('code goes to blob', () => {
    expect(projectPayload({ type: 'codeBlock', payload: 'let a = 1' }).blob).toBe('let a = 1');
  });
});

describe('isContainerAllowed (position gate)', () => {
  it('content is allowed on anything', () => {
    for (const type of ['table', 'object', 'codeBlock', 'paragraph']) {
      expect(isContainerAllowed(type, 'content'), type).toBe(true);
    }
  });

  it('a structured container is only allowed on its own type', () => {
    expect(isContainerAllowed('table', 'pluginData')).toBe(true);
    expect(isContainerAllowed('table', 'blob')).toBe(false);
    expect(isContainerAllowed('codeBlock', 'blob')).toBe(true);
    expect(isContainerAllowed('codeBlock', 'pluginData')).toBe(false);
  });
});

describe('checkPayloadPlacement', () => {
  it('accepts a correctly placed projection', () => {
    expect(checkPayloadPlacement('table', projectPayload({ type: 'table', payload: { rows: 1 } }))).toEqual({
      ok: true,
    });
  });

  it('rejects blob data on a table, naming the official error', () => {
    const result = checkPayloadPlacement('table', { content: '', blob: { stray: true } });
    expect(result).toEqual({ ok: false, error: 'Unexpected blob data for block type table' });
  });

  it('ignores empty containers', () => {
    expect(checkPayloadPlacement('paragraph', { content: 'x', blob: null, objectData: undefined })).toEqual({
      ok: true,
    });
  });
});
