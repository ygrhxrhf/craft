/**
 * G305: the versioned update carousel data. Each onboarding version owns an ordered set of
 * intro pages, taken verbatim from the zh-Hans catalog (`<version>.intro.<path>.title` plus
 * its `.content`). New versions append; the carousel shows versions newer than the last one
 * this device has seen.
 */
export interface IntroPage { title: string; content: string }
export interface IntroVersion { version: string; pages: IntroPage[] }

export const INTRO_VERSIONS: IntroVersion[] = [
  { version: "v3", pages: [
    { title: "为你焕新", content: "这次更新让你处理任务更高效，合集管理更有条理，样式搭配也更有创意。" },
    { title: "完成你的任务", content: "安排任务、规划日程，一站式查看所有内容。" },
    { title: "创造你的风格", content: "从 100 多种预设样式中选择，或用涂鸦、和纸胶带、纸张和文字颜色打造你自己的风格。" },
    { title: "建立你的合集", content: "给内容分类，或在不同想法之间建立关联。" },
  ] },
  { version: "v319", pages: [
    { title: "标签、网页剪藏器、移动网页", content: "根据你的反馈进行改进。现在轮到你探索新功能了。" },
    { title: "标签", content: "标签终于来了。不只是简单添加，我们用心打磨，只为带来更顺手、简洁、快速、恰到好处的体验。" },
    { title: "网页剪藏器", content: "将你的研究直接放进你的文档或日常笔记中。" },
    { title: "安卓移动网页", content: "现在，你也可以在安卓上将你的想法转化为结构化、美观且可共享的文档！" },
  ] },
  { version: "v326", pages: [
    { title: "九月更新", content: "令人振奋的更新与焕新的界面设计，助你发挥最佳状态，并在 Craft 中保持专注与流畅。" },
    { title: "任务、标签、合集", content: "我们正在全面升级核心功能，那些你每天都依赖的功能。" },
    { title: "Web Clipper 更新", content: "将你的研究直接放入你的文档或每日笔记中。 " },
    { title: "无限畅享 Craft", content: "千万别错过我们的每周套餐优惠！解锁所有 Craft 高级功能。" },
  ] },
  { version: "v330", pages: [
    { title: "11月更新", content: "推出更智能的 AI 协作、大量改进，以及全新的方式来管理和跟进你的笔记。" },
    { title: "Android 应用测试版", content: "Craft 正式支持 Android，延续标志性的设计品质，支持无缝同步，并且现在还加入了离线模式。" },
    { title: "更智能的 AI 助手", content: "一个在你写作和搜索时帮助你保持专注的智能助手。AI 额度已添加到你的订阅中。" },
    { title: "改进的白板", content: "借助改进后的白板、合集和代码块，你现在可以充分利用你的笔记。" },
    { title: "API 和 MCP 连接器", content: "将文档连接到外部工具和 LLM。在全新的 Imagine 版块中管理权限。" },
    { title: "与我们一起庆祝", content: "限时优惠，新用户可享受 Craft Plus 和 Craft Family 40% 的折扣。" },
    { title: "冬季焕清优惠", content: "4 款精心挑选的应用，限时 60% 折扣，助你度过一个更从容、更高效的冬天。" },
  ] },
  { version: "v350", pages: [
    { title: "离线编辑", content: "离线编辑现已在浏览器和 Windows 应用中推出测试版。重新联网后，你的更改将自动同步。" },
    { title: "更流畅，更快速", content: "我们还完成了 100 多项底层优化和错误修复，带来更流畅、更快速的体验。" },
    { title: "农历新年新样式", content: "我们以全新文档样式迎接农历新年。无论是制作邀请函、共享内容还是烘托节日氛围，都再合适不过。" },
  ] },
];

export const INTRO_SEEN_KEY = 'craft.intro.seen.version';

/** Parses `v3` / `v319` into a number so "seen v319" hides v3..v319 but not v326. */
export function introVersionNumber(version: string): number {
  const match = /^v(\d+)$/.exec(version);
  return match ? Number(match[1]) : 0;
}

export function pendingIntroPages(seenVersion: string | null): IntroVersion[] {
  const seen = seenVersion ? introVersionNumber(seenVersion) : 0;
  return INTRO_VERSIONS.filter((entry) => introVersionNumber(entry.version) > seen);
}

