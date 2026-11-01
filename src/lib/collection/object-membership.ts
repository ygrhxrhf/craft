/**
 * G427/G428 —— 一个记录对象可**同时属于多个集合**，删除只清归属、不删对象。
 *
 * 官方那两件（`model.md` §一之十 3）：
 *   - `object` 块的 `objectData.schemas` 是**数组**，块级另有 `objectSchemaId`；
 *   - 归属判定是**宽松匹配**：`objectSchemaId == null || schemas == null → true`，
 *     否则 `schemas.includes(objectSchemaId)`。
 *
 * G428 是同一原则的删除面：对象不属于某集合时**对象本身仍在**（`schemas` 只是归属数组）——
 * 与 `features.md` §五之三「删组只清该字段的值、不删行」是同一条原则的两个面。
 *
 * 本地 `CollectionItem.collectionId` 是**单值外键**，表达不出一物多集合；本模块给出数组归属的
 * 形状与"删集合只摘一项"的语义，供读侧与将来的迁移使用。
 */

export interface ObjectMembership {
  /** 这个对象所属的集合 id 数组（官方 `objectData.schemas`）。 */
  schemas: string[];
  /** 块级指定的集合（官方 `objectSchemaId`）；`null`＝块没指定。 */
  objectSchemaId: string | null;
}

/**
 * 官方那条宽松匹配（`model.md` §一之十 3）：判定"这个对象是否属于 `schemaId`"时，
 * `objectSchemaId == null || schemas == null → true`（宽松：没指定就算属于），
 * 否则看 `schemas.includes(schemaId)`。
 */
export function belongsToSchema(membership: ObjectMembership, schemaId: string): boolean {
  if (membership.objectSchemaId === null) return true;
  if (!Array.isArray(membership.schemas)) return true;
  return membership.schemas.includes(schemaId);
}

/** 该对象是否出现在某集合里（读侧过滤用）。归属数组缺失时宽松地算属于。 */
export function isMemberOf(membership: ObjectMembership, schemaId: string): boolean {
  if (!Array.isArray(membership.schemas)) return true;
  return membership.schemas.includes(schemaId);
}

/**
 * G428：删集合时**只从归属数组里摘掉这一项**，对象本身不动。数组里没有这一项 ⇒ 原样返回。
 */
export function removeMembership(membership: ObjectMembership, schemaId: string): ObjectMembership {
  if (!Array.isArray(membership.schemas)) return membership;
  const next = membership.schemas.filter((id) => id !== schemaId);
  if (next.length === membership.schemas.length) return membership;
  return { ...membership, schemas: next };
}

/** 加一项归属（已存在则原样，不产生重复）。 */
export function addMembership(membership: ObjectMembership, schemaId: string): ObjectMembership {
  const schemas = Array.isArray(membership.schemas) ? membership.schemas : [];
  if (schemas.includes(schemaId)) return { ...membership, schemas };
  return { ...membership, schemas: [...schemas, schemaId] };
}
