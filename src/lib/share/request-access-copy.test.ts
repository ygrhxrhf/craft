import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  EDIT_REQUEST_LABEL,
  REQUEST_ACCESS_FAILED,
  REQUEST_ACCESS_FAILED_KEY,
  REQUEST_ACCESS_SUBTITLE,
  REQUEST_ACCESS_SUBTITLE_KEY,
  REQUEST_ACCESS_TITLE,
  REQUEST_ACCESS_TITLE_KEY,
  VIEW_REQUEST_LABEL,
  VIEW_REQUEST_TITLE_KEY,
  viewRequestApprovedTitle,
  viewRequestDeclinedTitle,
  viewRequestTitle,
} from './request-access-copy';

const catalog = readFileSync(join(process.cwd(), 'docs/craft-ref/features/feature-catalog.md'), 'utf8');

describe('the view request copy (G75)', () => {
  it('uses the collected sentence shape', () => {
    const line = catalog.split('\n').find((row) => row.includes(` \`${VIEW_REQUEST_TITLE_KEY}\``));
    expect(line).toBeTruthy();
    expect(line).toContain('<username>[0]</username>想要查看文档“[1]”');
    expect(viewRequestTitle('小周', '周报')).toBe('小周 想要查看文档“周报”');
  });

  it('names both request kinds in the pending list', () => {
    expect(VIEW_REQUEST_LABEL).toBe('想要查看');
    expect(EDIT_REQUEST_LABEL).toBe('想要编辑');
  });

  it('answers the requester in the same shape as the edit flow', () => {
    expect(viewRequestApprovedTitle('周报')).toBe('「周报」的查看请求已批准');
    expect(viewRequestDeclinedTitle('周报')).toBe('「周报」的查看请求被拒绝');
  });

  it('takes the gate heading, subtitle and failure line from the catalog', () => {
    const value = (key: string) => {
      const line = catalog.split('\n').find((row) => row.includes(` \`${key}\``));
      return line ? /^-\s+(.+?)\s+`/.exec(line.trim())?.[1] ?? null : null;
    };
    expect(value(REQUEST_ACCESS_TITLE_KEY)).toBe(REQUEST_ACCESS_TITLE);
    expect(value(REQUEST_ACCESS_SUBTITLE_KEY)).toBe(REQUEST_ACCESS_SUBTITLE);
    expect(value(REQUEST_ACCESS_FAILED_KEY)).toBe(REQUEST_ACCESS_FAILED);
  });
});
