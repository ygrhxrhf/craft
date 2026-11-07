/**
 * G330: the official copy carries a **separate error source per failing reader** —
 * `error.reading.blocklink`「读取 blocklink 时出错」 and `error.document.short.link`
 *「读取文档短链接时出错」. Two sources mean two independent parse paths that can fail
 * independently, so a block link whose target cannot be read reports its own sentence instead of
 * borrowing a generic one (or, worse, returning silently).
 *
 * Key and sentence are copied verbatim from `feature-catalog.md:3676`.
 */

/** `error.reading.blocklink` — 读取 blocklink 时出错 */
export const BLOCK_LINK_READ_ERROR = '读取 blocklink 时出错';
export const BLOCK_LINK_READ_ERROR_KEY = 'error.reading.blocklink';