import { Extension } from '@tiptap/react';
import { ANCHORABLE_TYPES } from '@/lib/search/anchors';

/**
 * G252 —— 提醒可挂在**任意区块**上，不只任务块。
 *
 * 任务块的 `remindAt` 由 `TaskItem.extend` 那支声明（它随任务行投影走）。这里补的是**其余可寻址块**
 * （`paragraph`／`heading`，见 `ANCHORABLE_TYPES`）：同一枚属性名，同一套解析/渲染，于是
 * 「提醒我…」在两处写出来的都是 `remindAt`，正文里的那一份始终是真源。
 *
 * 为什么不与 `blockId` 合成一支：`blockId` 是**身份**（深链与锚点靠它寻址），`remindAt` 是**时间**。
 * 两者都恰好落在同一组类型上，但各自的读方（锚点跳转 vs 提醒投递）互不依赖，分开才好单测。
 */
export const BlockReminderAttr = Extension.create({
  name: 'blockReminderAttr',

  addGlobalAttributes() {
    return [
      {
        types: ANCHORABLE_TYPES,
        attributes: {
          remindAt: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-remind-at'),
            renderHTML: (attributes) =>
              attributes.remindAt ? { 'data-remind-at': attributes.remindAt } : {},
          },
        },
      },
    ];
  },
});
