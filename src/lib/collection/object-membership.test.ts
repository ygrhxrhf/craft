import { describe, expect, it } from 'vitest';

import {
  addMembership,
  belongsToSchema,
  isMemberOf,
  removeMembership,
  type ObjectMembership,
} from './object-membership';

/**
 * G427/G428: an object can belong to several schemas at once, and deleting a collection clears the
 * membership only — the object itself stays.
 */
describe('multi-schema membership (G427)', () => {
  it('an object can belong to several schemas', () => {
    const membership: ObjectMembership = { schemas: ['s1', 's2'], objectSchemaId: 's1' };
    expect(isMemberOf(membership, 's1')).toBe(true);
    expect(isMemberOf(membership, 's2')).toBe(true);
    expect(isMemberOf(membership, 's3')).toBe(false);
  });

  it('a null objectSchemaId matches loosely', () => {
    expect(belongsToSchema({ schemas: ['s1'], objectSchemaId: null }, 's3')).toBe(true);
  });

  it('a missing schemas array also matches loosely', () => {
    expect(belongsToSchema({ schemas: null as never, objectSchemaId: 's1' }, 's3')).toBe(true);
  });

  it('with both present it is a plain includes check', () => {
    const membership: ObjectMembership = { schemas: ['s1', 's2'], objectSchemaId: 's1' };
    expect(belongsToSchema(membership, 's2')).toBe(true);
    expect(belongsToSchema(membership, 's3')).toBe(false);
  });
});

describe('deleting a collection clears the membership only (G428)', () => {
  it('removes just the one schema and leaves the object', () => {
    const membership: ObjectMembership = { schemas: ['s1', 's2'], objectSchemaId: null };
    const after = removeMembership(membership, 's1');
    expect(after.schemas).toEqual(['s2']);
    // The object still belongs to s2 — it was not destroyed with s1.
    expect(isMemberOf(after, 's2')).toBe(true);
  });

  it('is a no-op when the schema is not a member', () => {
    const membership: ObjectMembership = { schemas: ['s1'], objectSchemaId: null };
    expect(removeMembership(membership, 's9')).toBe(membership);
  });

  it('adding a membership does not duplicate', () => {
    const membership: ObjectMembership = { schemas: ['s1'], objectSchemaId: null };
    expect(addMembership(membership, 's1').schemas).toEqual(['s1']);
    expect(addMembership(membership, 's2').schemas).toEqual(['s1', 's2']);
  });
});
