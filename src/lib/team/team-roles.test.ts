import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { adminsOf, canSeeSpace, changeMemberRole, hasAdmin, TEAM_ROLE_COPY, TEAM_PERMISSION_ROLES, type TeamMember } from './team-roles';
import { greetingKey, signInCompletionMessage, signInGreeting, SIGN_IN_SUCCESS_CLOSE } from '@/lib/auth/sign-in-copy';
import { backColumnOf, relationRemove, relationWrite, TWO_WAY_COPY } from '@/lib/collection/two-way-relation';

const HARVEST = readFileSync(
  join(process.cwd(), 'docs', 'craft-ref', 'features', '_harvest', 'i18n-zh.tsv'),
  'utf8',
);

/**
 * G421: two permission roles (admins can be many), and the two lifecycle states are a different
 * axis. The subtitles are harvested verbatim.
 */
describe('the team permission roles (G421)', () => {
  it('has exactly two permission roles', () => {
    expect(TEAM_PERMISSION_ROLES).toEqual(['admin', 'member']);
  });

  it('carries the harvested subtitles verbatim', () => {
    for (const role of TEAM_PERMISSION_ROLES) {
      const copy = TEAM_ROLE_COPY[role];
      const line = HARVEST.split(/\r?\n/).find((l) => l.startsWith(`${copy.subtitleKey}\t`));
      expect(line, copy.subtitleKey).toBeTruthy();
      expect(line!.split('\t')[1]).toBe(copy.subtitle);
    }
    expect(TEAM_ROLE_COPY.admin.subtitle).toBe('可以更改团队设置、账单明细并查看所有空间。');
    expect(TEAM_ROLE_COPY.member.subtitle).toBe('无法查看设置、账单以及未加入的空间。');
  });

  it('allows more than one admin', () => {
    const members: TeamMember[] = [
      { userId: 'a', role: 'admin', state: 'active' },
      { userId: 'b', role: 'admin', state: 'active' },
      { userId: 'c', role: 'member', state: 'active' },
    ];
    expect(adminsOf(members)).toHaveLength(2);
    expect(hasAdmin(members)).toBe(true);
  });

  it('changes one member at a time', () => {
    const members: TeamMember[] = [
      { userId: 'a', role: 'admin', state: 'active' },
      { userId: 'b', role: 'member', state: 'active' },
    ];
    const next = changeMemberRole(members, 'b', 'admin');
    expect(next[0].role).toBe('admin');
    expect(next[1].role).toBe('admin');
    // The untouched member keeps its identity (not a fresh object).
    expect(next[0]).toBe(members[0]);
  });

  it('space visibility follows joined, not role', () => {
    expect(canSeeSpace(true)).toBe(true);
    expect(canSeeSpace(false)).toBe(false);
  });
});

/**
 * G227: the Sign-in-with-Craft completion copy and its two greetings.
 */
describe('the sign-in completion copy (G227)', () => {
  it('carries the harvested close sentence verbatim', () => {
    const line = HARVEST.split(/\r?\n/).find((l) => l.startsWith('login.auth.success.close\t'));
    expect(line!.split('\t')[1]).toBe(SIGN_IN_SUCCESS_CLOSE);
    expect(signInCompletionMessage()).toBe('你现在可以关闭此窗口了。');
  });

  it('greets on success and apologises on failure', () => {
    expect(signInGreeting('success', '张三')).toBe('欢迎，张三');
    expect(signInGreeting('failure', '张三')).toBe('很抱歉，张三');
    expect(greetingKey('success')).toBe('login.auth.greeting.welcome');
    expect(greetingKey('failure')).toBe('login.auth.greeting.sorry');
  });

  it('does not invent a half greeting without a name', () => {
    expect(signInGreeting('success', '')).toBeNull();
    expect(signInGreeting('success', null)).toBeNull();
  });
});

/**
 * G285: a two-way relation column creates a back column and writes both sides.
 */
describe('the two-way relation (G285)', () => {
  it('carries the harvested labels', () => {
    expect(TWO_WAY_COPY.twoWay.label).toBe('双向');
    expect(TWO_WAY_COPY.relatedField.label).toBe('关联字段');
  });

  it('derives a back column only for a two-way relation', () => {
    const spec = { collectionId: 'A', targetCollectionId: 'B', twoWay: true, backFieldName: '所属 A' };
    expect(backColumnOf(spec)).toEqual({
      collectionId: 'B',
      targetCollectionId: 'A',
      twoWay: true,
      backFieldName: '所属 A',
    });
    expect(backColumnOf({ ...spec, twoWay: false })).toBeNull();
  });

  it('writes both sides when two-way, one side when not', () => {
    const both = relationWrite({ twoWay: true, aItemId: 'a1', bItemId: 'b1', aCurrent: [], bCurrent: [] });
    expect(both).toEqual({ a: ['b1'], b: ['a1'] });
    const one = relationWrite({ twoWay: false, aItemId: 'a1', bItemId: 'b1', aCurrent: [], bCurrent: [] });
    expect(one).toEqual({ a: ['b1'], b: [] });
  });

  it('removes both sides when two-way', () => {
    const removed = relationRemove({
      twoWay: true,
      aItemId: 'a1',
      bItemId: 'b1',
      aCurrent: ['b1', 'b2'],
      bCurrent: ['a1', 'a2'],
    });
    expect(removed).toEqual({ a: ['b2'], b: ['a2'] });
  });
});
