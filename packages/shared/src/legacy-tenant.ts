/**
 * 組織を廃止する前の唯一の組織の ID。既に保存された値と同じ必要があるところでだけ使う
 * (R2 のキー、DB の物理列がまだ NOT NULL である間の値)。新しい機能の判定には使わない。
 */
export const LEGACY_TENANT_ID = "ses";
