/**
 * G1180：官方在没有 grammar 的语言上**整块单色**（同屏六个围栏实测：无 grammar 的五档
 * 零 token、有 grammar 的 python 正常上色）。本地 lowlight 对未注册语言的默认行为是
 * `highlightAuto`——自动检测会把用户选的语言顶掉，两侧形态不同。
 *
 * 这个包装把 lowlight 声称「都已注册」：注册过的照常高亮，未注册的按**纯文本**返回
 * （hast 单 text 节点）⇒ 选中语言不被改写、无 grammar 就单色，与官方同形。
 */
export interface LowlightLike {
  registered: (name: string) => boolean;
  highlight: (name: string, value: string) => unknown;
  [key: string]: unknown;
}

export function plainFallbackLowlight<T extends LowlightLike>(lowlight: T): T {
  return new Proxy(lowlight, {
    get(target, property, receiver) {
      if (property === 'registered') return () => true;
      if (property === 'highlight') {
        return (language: string, value: string) =>
          target.registered(language) ? target.highlight(language, value) : { children: value ? [{ type: 'text', value }] : [] };
      }
      const resolved = Reflect.get(target, property, target);
      return typeof resolved === 'function' ? (resolved as (...args: unknown[]) => unknown).bind(target) : resolved;
    },
  });
}