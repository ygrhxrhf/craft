import { describe, expect, it } from 'vitest';
import { isReactionOnlyPatch, mergeReactionWrite, readReactionEntries } from './reaction-merge';

/**
 * `gap.md` G1636 —— 表情是多人的共同产物，但 `comment.reactions` 是**一行一列**：客户端每次
 * 提交的都是"我看到的那份整数组"，两个人同时各加一枚时，按整条数组 LWW 会互相覆盖掉对方。
 * 服务端的形状＝**按人切片**：存量里别人的条目原样保留，只替换调用者自己那一段。
 * 这里逐条钉住"切片的边界在哪"——尤其是"提交里夹带别人条目"必须被丢掉。
 */
const stored = [
  { glyph: '🎉', userId: 'author', name: '作者' },
];

describe('G1636：表情按人切片合并', () => {
  it('别人已加的表情保留，我这一枚追加在后', () => {
    expect(mergeReactionWrite(stored, [{ glyph: '👍', userId: 'me', name: '我' }], { id: 'me' }))
      .toEqual([...stored, { glyph: '👍', userId: 'me', name: '我' }]);
  });

  it('提交里夹带「别人」的条目一律丢弃（伪造不生效）', () => {
    expect(mergeReactionWrite(stored, [
      { glyph: '👍', userId: 'me', name: '我' },
      { glyph: '🔥', userId: 'author', name: '伪造' },
    ], { id: 'me' })).toEqual([...stored, { glyph: '👍', userId: 'me', name: '我' }]);
  });

  it('取消自己的表情：存量里我自己那段整段消失，别人的不动', () => {
    const mineFirst = [
      { glyph: '👍', userId: 'me', name: '我' },
      { glyph: '🎉', userId: 'author', name: '作者' },
    ];
    expect(mergeReactionWrite(mineFirst, [], { id: 'me' }))
      .toEqual([{ glyph: '🎉', userId: 'author', name: '作者' }]);
  });

  it('同一枚 glyph 只留第一条（重复提交不叠份）', () => {
    expect(mergeReactionWrite([], [
      { glyph: '👍', userId: 'me', name: '我' },
      { glyph: '👍', userId: 'me', name: '我' },
    ], { id: 'me' })).toEqual([{ glyph: '👍', userId: 'me', name: '我' }]);
  });

  it('存量为 null／坏形状时读成空表（旧载荷不至于把合并打崩）', () => {
    expect(readReactionEntries(null)).toEqual([]);
    expect(readReactionEntries('👍')).toEqual([]);
    expect(readReactionEntries([{ glyph: '👍' }, null, { glyph: '👍', userId: 'me' }])).toEqual([]);
  });

  it('reactions 不是数组 ⇒ 返回 null（调用方按 invalid 拒收）', () => {
    expect(mergeReactionWrite(stored, '👍', { id: 'me' })).toBeNull();
    expect(mergeReactionWrite(stored, { glyph: '👍' }, { id: 'me' })).toBeNull();
  });

  it('没带 reactions（undefined）⇒ 原样返回存量（不误删）', () => {
    expect(mergeReactionWrite(stored, undefined, { id: 'me' })).toEqual(stored);
  });

  it('name 截到 80 字（显示名不该把整列撑爆）', () => {
    const long = '名'.repeat(120);
    const merged = mergeReactionWrite([], [{ glyph: '👍', userId: 'me', name: long }], { id: 'me' });
    expect(merged![0]!.name).toHaveLength(80);
  });

  it('glyph 形状闸：空串／超 32 字的 glyph 不算有效条目', () => {
    expect(mergeReactionWrite([], [{ glyph: '', userId: 'me', name: '我' }], { id: 'me' })).toEqual([]);
    expect(mergeReactionWrite([], [{ glyph: 'x'.repeat(33), userId: 'me', name: '我' }], { id: 'me' })).toEqual([]);
  });
});

describe('G1636：只改表情的判据', () => {
  it('只有 reactions 一枚键 ⇒ 是（走多人共写那支）', () => {
    expect(isReactionOnlyPatch({ reactions: [] })).toBe(true);
  });

  it('带任何别的列 ⇒ 不是（仍按"只能写自己的行"）', () => {
    expect(isReactionOnlyPatch({ reactions: [], body: 'x' })).toBe(false);
    expect(isReactionOnlyPatch({ reactions: [], threadId: 't' })).toBe(false);
  });

  it('空 data／undefined ⇒ 不是', () => {
    expect(isReactionOnlyPatch({})).toBe(false);
    expect(isReactionOnlyPatch(undefined)).toBe(false);
  });
});
