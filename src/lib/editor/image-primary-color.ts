/**
 * G504 —— 图片主色的存储形状。官方把它存成**整型**（读取是 `"#" + c.toString(16)`），
 * 默认常量是 `#f2f2f2`。
 *
 * ⚠ 官方那条写法是缺陷候选：`toString(16)` 不补前导零，R 通道高位为 0 时会得到 4～5 位
 * hex（`0x0a1b2c` → `#a1b2c`，浏览器读不出这一串）。**静态推断，未实测**，所以本地一律
 * `padStart(6, '0')`——存储仍是整型，只有显示时才转 hex。
 */

export const DEFAULT_PRIMARY_COLOR = '#f2f2f2';
export const DEFAULT_PRIMARY_COLOR_INT = 0xf2f2f2;

/** 24 位整型（0x000000–0xffffff）才认；其余一律落回默认主色。 */
export function primaryColorFromInt(value: unknown): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 0xffffff) {
    return DEFAULT_PRIMARY_COLOR;
  }
  return `#${value.toString(16).padStart(6, '0')}`;
}

/** `#rrggbb` → 整型；不合法返回 `null`（不猜）。 */
export function primaryColorToInt(hex: unknown): number | null {
  if (typeof hex !== 'string') return null;
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  return Number.parseInt(match[1], 16);
}

/**
 * 从 `getImageData` 的 RGBA 一维数组算平均色（跳过全透明像素）。
 * 空集合或全透明返回 `null`，让调用方保持"没有主色"这个状态而不是编一个。
 */
export function averagePrimaryColor(rgba: ArrayLike<number>): number | null {
  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index + 3 < rgba.length; index += 4) {
    if (rgba[index + 3] === 0) continue;
    red += rgba[index];
    green += rgba[index + 1];
    blue += rgba[index + 2];
    count += 1;
  }
  if (count === 0) return null;
  const channel = (sum: number) => Math.round(sum / count);
  return (channel(red) << 16) | (channel(green) << 8) | channel(blue);
}

/**
 * 客户端采样：把图缩到 1×1 再读那一枚像素。跨域图会污染 canvas，`getImageData` 抛错时
 * 返回 `null`——主色是锦上添花，不该把图片块本身弄红。
 */
export function samplePrimaryColor(image: HTMLImageElement): number | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(image, 0, 0, 1, 1);
    return averagePrimaryColor(context.getImageData(0, 0, 1, 1).data);
  } catch {
    return null;
  }
}
