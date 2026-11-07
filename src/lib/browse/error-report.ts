/**
 * G329 —— 应用内的**结构化崩溃报告表单**。官方 `error.report.*` 共 12 键，这里逐字落 9 键
 * （另含两枚示例占位符与两枚分平台标题）：
 *
 * - `report.error` / `report.issue` 两枚标题词；
 * - `report.issue.desc` 一句说明；
 * - **重复频率两问**（`does.it.happen.every.time` / `keeps.happening`）；
 * - **两个结构化字段**（`steps.before.it.happened` / `what.were.you.doing`）各带示例占位符；
 * - 分平台标题（`report.web` / `report.windows`）。
 *
 * 本地只有 Web 端，所以只用 `report.web`；`report.windows` 仍常量保留，供桌面壳复用。
 *
 * 表单**纯本地**：没有后端接收口，提交只在页面内记下这份草稿（`isReportSubmittable` 决定按钮是否可点）。
 */

export const REPORT_ERROR_KEY = 'error.report.error';
export const REPORT_ERROR = '报告错误';

export const REPORT_ISSUE_KEY = 'error.report.issue';
export const REPORT_ISSUE = '报告问题';

export const REPORT_ISSUE_DESC_KEY = 'error.report.issue.desc';
export const REPORT_ISSUE_DESC = '请报告此问题，以便我们确保不再发生此类问题';

export const HAPPENS_EVERY_TIME_KEY = 'error.report.does.it.happen.every.time';
export const HAPPENS_EVERY_TIME = '每次都是这样吗？';

export const KEEPS_HAPPENING_KEY = 'error.report.keeps.happening';
export const KEEPS_HAPPENING = '这个问题一直发生吗？';

export const STEPS_LABEL_KEY = 'error.report.steps.before.it.happened';
export const STEPS_LABEL = '问题发生前的步骤';
export const STEPS_EXAMPLE_KEY = 'error.report.steps.before.it.happened.example';
export const STEPS_EXAMPLE =
  '例如： 1. 打开现有文档 2. 开始编辑区块 3. 使用 / 命令菜单中的插入文件 4. 发生崩溃';

export const DOING_LABEL_KEY = 'error.report.what.were.you.doing';
export const DOING_LABEL = '你当时想要做什么？';
export const DOING_EXAMPLE_KEY = 'error.report.what.were.you.doing.example';
export const DOING_EXAMPLE = '示例：尝试插入图像';

export const REPORT_WEB_KEY = 'error.report.web';
export const REPORT_WEB = 'Web 应用错误报告';
export const REPORT_WINDOWS_KEY = 'error.report.windows';
export const REPORT_WINDOWS = 'Windows 应用错误报告';

/** 本表单不上传任何东西 —— 屏上要明说，否则「报告错误」会被读成已经发出去了。 */
export const REPORT_LOCAL_NOTE = '此表单仅在本机记录，不会上传。';

export const REPORT_SUBMIT = '提交报告';
export const REPORT_SUBMITTED = '已在本机记录这份报告。';

export type FrequencyAnswer = 'yes' | 'no' | null;

export interface ErrorReportDraft {
  happensEveryTime: FrequencyAnswer;
  keepsHappening: FrequencyAnswer;
  steps: string;
  doing: string;
}

export function emptyReportDraft(): ErrorReportDraft {
  return { happensEveryTime: null, keepsHappening: null, steps: '', doing: '' };
}

/** 至少一个结构化字段有内容才允许「提交报告」；两个频率问题可以留空。 */
export function isReportSubmittable(draft: ErrorReportDraft): boolean {
  return draft.steps.trim().length > 0 || draft.doing.trim().length > 0;
}

/** 分平台标题：Web 后端 / 桌面壳共用一份表单，只是抬头不同。 */
export function reportTitleForPlatform(platform: 'web' | 'windows'): string {
  return platform === 'windows' ? REPORT_WINDOWS : REPORT_WEB;
}