/**
 * G1445: 「取消发布」是 ShareSheet 里与「发布」配对的动作。官方把它做成**两个入口、共用一个
 * `onClick`**：一枚填满宽的按钮，一枚带危险档外观的列表行；危险档只在列表那一枚。本地此前
 * 只有一枚发布开关，关掉它代替取消发布。文案逐字（`unpublish`）。
 */
export const UNPUBLISH = '取消发布';
export const UNPUBLISH_KEY = 'unpublish';