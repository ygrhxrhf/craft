/**
 * 集合视图操作文案（G1538），每个串都停在它必须逐字匹配的 i18n key 旁边，
 * 好让 ledger-as-source 测试从 `feature-catalog.md` 读回比对——与
 * `src/lib/tag/official-copy.ts`、`src/lib/browse/official-copy.ts` 同一条规矩。
 *
 * 同族还有 `collections.rename.view`「重命名视图」、`collections.edit.view.name`「编辑视图名称」、
 * `collections.reorder.views`「重新排序视图」——本项只做删除，故不在此声明（免得声明了却没人消费）。
 */
export const DELETE_VIEW_KEY = 'collections.delete.view';
export const DELETE_VIEW = '删除视图';

/** G23: 官方视图类型互转入口。 */
export const TURN_VIEW_INTO_KEY = 'collections.views.turn.into';
export const TURN_VIEW_INTO = '将视图转换为';
