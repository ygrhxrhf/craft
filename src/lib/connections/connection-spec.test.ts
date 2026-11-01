import { describe, expect, it } from 'vitest';

import {
  canCreateConnection,
  connectionDetails,
  connectionForRead,
  CONNECTION_PERMISSIONS,
  CONNECTION_PROTECTIONS,
  CONNECTION_SCOPES,
  MAX_CONNECTIONS,
} from './connection-spec';

/**
 * G122: the connection entity has three axes, a one-time key, and a hard cap of ten APIs.
 */
describe('the connection three axes (G122)', () => {
  it('lists each axis', () => {
    expect(CONNECTION_PERMISSIONS).toEqual(['read-only', 'write-only', 'read-write']);
    expect(CONNECTION_PROTECTIONS).toEqual(['public', 'key', 'password']);
    expect(CONNECTION_SCOPES).toEqual(['all-documents', 'selected-documents', 'daily-notes-and-tasks']);
  });

  it('stores the permission as a preset tools object', () => {
    expect(connectionDetails({ permission: 'read-write', protection: 'key', scope: 'all-documents' })).toEqual({
      tools: { type: 'preset', presets: ['read-write'] },
      protection: 'key',
      scope: 'all-documents',
    });
  });
});

describe('the ten-connection cap (G122)', () => {
  it('allows a new API connection below the cap', () => {
    const existing = Array.from({ length: 9 }, () => ({ kind: 'api' }));
    expect(canCreateConnection(existing, 'api')).toBe(true);
  });

  it('refuses at the cap', () => {
    const existing = Array.from({ length: MAX_CONNECTIONS }, () => ({ kind: 'api' }));
    expect(canCreateConnection(existing, 'api')).toBe(false);
  });

  it('counts only API connections, not MCP ones', () => {
    const existing = Array.from({ length: MAX_CONNECTIONS }, () => ({ kind: 'mcp' }));
    expect(canCreateConnection(existing, 'api')).toBe(true);
    expect(canCreateConnection(existing, 'mcp')).toBe(true);
  });
});

describe('the one-time key (G122)', () => {
  it('a read only ever says whether a token exists', () => {
    expect(connectionForRead({ token: 'secret' })).toEqual({ hasToken: true });
    expect(connectionForRead({ token: null })).toEqual({ hasToken: false });
    expect(connectionForRead({})).toEqual({ hasToken: false });
  });
});
