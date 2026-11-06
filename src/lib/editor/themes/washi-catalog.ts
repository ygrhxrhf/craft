/**
 * G210：官方「和纸胶带」图库——第 3g 批从 `res.craft.do/themes/presets.json` 的
 * `washiPresets`（96 档）生成，图片已下载到 `public/washi/<key>.jpg`
 * （672×160 JPEG，合计约 3.2 MB）。列表顺序照官方。
 */
export interface WashiTapePreset {
  key: string;
  label: string;
}

export const WASHI_TAPE_PRESETS: readonly WashiTapePreset[] = [
  { key: "childhood", label: "Childhood" },
  { key: "groovy-water", label: "Groovy Water" },
  { key: "peachy-peach", label: "Peachy Peach" },
  { key: "mint-pixels", label: "Mint Pixels" },
  { key: "blueberry-basket", label: "Blueberry Basket" },
  { key: "colorama", label: "Colorama" },
  { key: "swoopy-orange", label: "Swoopy Orange" },
  { key: "beige-paper", label: "Beige Paper" },
  { key: "daisy-season", label: "Daisy Season" },
  { key: "golden-blooms", label: "Golden Blooms" },
  { key: "frosted-petals", label: "Frosted Petals" },
  { key: "lemon-fields", label: "Lemon Fields" },
  { key: "bubble-cells", label: "Bubble Cells" },
  { key: "pyjama-pink", label: "Pyjama Pink" },
  { key: "lavender-dream", label: "Lavender Dream" },
  { key: "caramel-picnic", label: "Caramel Picnic" },
  { key: "olive-cloth", label: "Olive Cloth" },
  { key: "cranberry-wool", label: "Cranberry Wool" },
  { key: "terrazzo", label: "Terrazzo" },
  { key: "mt-fuji", label: "Mt. Fuji" },
  { key: "spring-whisper", label: "Spring Whisper" },
  { key: "handle-with-care", label: "Handle with Care" },
  { key: "work-in-progress", label: "Work in Progress" },
  { key: "taro-paradise", label: "Taro Paradise" },
  { key: "flora-fauna", label: "Flora Fauna" },
  { key: "folk-art-blue", label: "Folk Art Blue" },
  { key: "outline-flowers", label: "Outline Flowers" },
  { key: "imprint-flower", label: "Imprint Flower" },
  { key: "flat-pastels", label: "Flat Pastels" },
  { key: "sunny-seville", label: "Sunny Seville" },
  { key: "red-orchid", label: "Red Orchid" },
  { key: "ocean-mosaic", label: "Ocean Mosaic" },
  { key: "golden-palace", label: "Golden Palace" },
  { key: "two-tone-leaf", label: "Two Tone Leaf" },
  { key: "summer-napkin ", label: "Summer Napkin " },
  { key: "flower-feast", label: "Flower Feast" },
  { key: "azulejo", label: "Azulejo" },
  { key: "mediterranean-bloom", label: "Mediterranean Bloom" },
  { key: "old-town-tile", label: "Old Town Tile" },
  { key: "radiants", label: "Radiants" },
  { key: "kids-room", label: "Kid’s Room" },
  { key: "cuddly-bears", label: "Cuddly Bears" },
  { key: "stick-it", label: "Stick It" },
  { key: "eye-spy", label: "Eye Spy" },
  { key: "old-money", label: "Old Money" },
  { key: "cosmic-signs", label: "Cosmic Signs" },
  { key: "bibbidi-bobbidi-boo", label: "Bibbidi Bobbidi Boo" },
  { key: "magical-forest", label: "Magical Forest" },
  { key: "andy-banana", label: "Andy Banana" },
  { key: "sheeptation", label: "Sheeptation" },
  { key: "doggy-power", label: "Doggy Power" },
  { key: "cowabanga", label: "Cowabanga" },
  { key: "frogalicious", label: "Frogalicious" },
  { key: "purr-statement", label: "Purr Statement" },
  { key: "pattern-cats", label: "Pattern Cats" },
  { key: "foliage-season", label: "Foliage Season" },
  { key: "zoo-wash", label: "Zoo Wash" },
  { key: "to-pug-or-not-to-pug", label: "To Pug, or Not to Pug" },
  { key: "unamused-dogs", label: "Unamused Dogs" },
  { key: "skate-dog", label: "Skate Dog" },
  { key: "kitty-meal", label: "Kitty Meal" },
  { key: "puffs-and-cream", label: "Puffs and Cream" },
  { key: "cotton-meow", label: "Cotton Meow" },
  { key: "dino-parade", label: "Dino Parade" },
  { key: "fruity-season", label: "Fruity Season" },
  { key: "edible-plushi", label: "Edible Plushi" },
  { key: "sushi-sketch", label: "Sushi Sketch" },
  { key: "donut-or-teddy", label: "Donut or Teddy" },
  { key: "donut-hearts", label: "Donut Hearts" },
  { key: "secret-garden", label: "Secret Garden" },
  { key: "nomadic-bloom", label: "Nomadic Bloom" },
  { key: "savoire-faire", label: "Savoire-Faire" },
  { key: "le-mans", label: "Le Mans" },
  { key: "finish-line", label: "Finish Line" },
  { key: "tartan-beige", label: "Tartan Beige" },
  { key: "handmade", label: "Handmade" },
  { key: "spooky", label: "Spooky" },
  { key: "early-bird", label: "Early Bird" },
  { key: "emotional-support", label: "Emotional Support" },
  { key: "improvise", label: "Improvise" },
  { key: "input-needed", label: "Input Needed" },
  { key: "just-weird", label: "Just Weird" },
  { key: "let-it-go", label: "Let It Go" },
  { key: "cap", label: "Cap" },
  { key: "no-cap", label: "No Cap" },
  { key: "time-box", label: "Time Box" },
  { key: "tldr", label: "TL;DR" },
  { key: "very-nice", label: "Very Nice" },
  { key: "want", label: "Want" },
  { key: "the-notebook", label: "The Notebook" },
  { key: "play-mode", label: "Play Mode" },
  { key: "lab-notes", label: "Lab Notes" },
  { key: "atomic-grid", label: "Atomic Grid" },
  { key: "christmas-glow", label: "Christmas Glow" },
  { key: "winter-charm", label: "Winter Charm" },
  { key: "new-years-resolutions", label: "New Year’s Resolutions" },
] as const;

export function washiTapeSrc(key: string | null | undefined): string | null {
  if (!key || !WASHI_TAPE_PRESETS.some((preset) => preset.key === key)) return null;
  return `/washi/${key}.jpg`;
}

/** 页面分隔符三档（G210：线 / 和纸胶带 / 涂鸦）。 */
export type SeparatorStyle = "line" | "washi" | "doodle";

export function normalizeSeparatorStyle(value: unknown): SeparatorStyle | undefined {
  return value === "line" || value === "washi" || value === "doodle" ? value : undefined;
}

/**
 * 涂鸦分隔符：官方是内置手绘线（`separator-style: doodle` 无参数）。本地用一枚平铺的
 * 手绘波浪 SVG 近似（观察面＝页顶一条手绘感横带；素材本体未采）。
 */
export const DOODLE_SEPARATOR_CSS =
  "repeat-x center / 72px 14px url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2772%27 height=%2714%27%3E%3Cpath d=%27M2 8 q 9 -8 18 0 t 18 0 t 18 0 t 14 0%27 fill=%27none%27 stroke=%27%23555%27 stroke-width=%271.6%27 stroke-linecap=%27round%27 stroke-dasharray=%27140%27/%3E%3C/svg%3E\")";
