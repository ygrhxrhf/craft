import { describe, expect, it } from 'vitest';

import {
  OPTION_THEMES,
  addOption,
  optionColor,
  readSelectOptions,
  removeOption,
  serializeOptions,
  updateOption,
} from './select-options';

/** G454：单选／多选的选项对象是 `{id, value, themeString}`（不再是本地老的 label/color）。 */
describe('the select option shape (G454)', () => {
  it('reads the official three keys', () => {
    expect(readSelectOptions([{ id: 'a', value: '进行中', themeString: 'blue' }])).toEqual([
      { id: 'a', value: '进行中', themeString: 'blue' },
    ]);
  });

  it('still reads the legacy local shape (label/color)', () => {
    expect(readSelectOptions([{ id: 'a', label: '完成', color: '#22c55e' }])).toEqual([
      { id: 'a', value: '完成', themeString: 'green' },
    ]);
  });

  it('falls back to the default theme for an unknown colour', () => {
    expect(readSelectOptions([{ id: 'a', value: 'x', themeString: 'chartreuse' }])).toEqual([
      { id: 'a', value: 'x', themeString: 'default' },
    ]);
    expect(readSelectOptions([{ id: 'a', value: 'x', color: '#123456' }])[0].themeString).toBe(
      'default',
    );
  });

  it('ignores rows without an id or a value', () => {
    expect(readSelectOptions([{ id: '', value: 'x' }, { id: 'b' }, null])).toEqual([]);
    expect(readSelectOptions('nope')).toEqual([]);
  });

  it('adds, edits and removes options', () => {
    const start = addOption([], '  进行中  ', 'blue');
    expect(start).toHaveLength(1);
    expect(start[0].value).toBe('进行中');
    expect(addOption(start, '   ', 'red')).toEqual(start); // 空文本不加

    const renamed = updateOption(start, start[0].id, { value: '已完成', themeString: 'green' });
    expect(renamed[0]).toMatchObject({ value: '已完成', themeString: 'green' });

    expect(removeOption(renamed, start[0].id)).toEqual([]);
  });

  it('writes back only the official keys', () => {
    const written = serializeOptions([{ id: 'a', value: 'x', themeString: 'pink' }]);
    expect(Object.keys(written[0])).toEqual(['id', 'value', 'themeString']);
  });

  it('maps every theme to a visible colour', () => {
    for (const theme of OPTION_THEMES) {
      expect(optionColor(theme)).toBeTruthy();
    }
    expect(optionColor(null)).toBe(OPTION_THEMES.length ? optionColor('default') : '');
  });
});
