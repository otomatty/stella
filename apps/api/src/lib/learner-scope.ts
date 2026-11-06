import { type AnyColumn, type SQL, sql } from "drizzle-orm";
import { profiles } from "../db/schema.js";

/**
 * 受講者向けの数・一覧に入れる人 (`profiles.role = 'student'`)。
 * 講師・管理者が受講者の画面で確かめるために作った受講登録・進捗・提出を数えないための条件。
 * 無効化された受講者の過去の記録は数える (外すのはロールだけ)。
 */
export function learnerOnly(userId: AnyColumn | SQL): SQL {
  return sql`${userId} in (select ${profiles.id} from ${profiles} where ${profiles.role} = 'student')`;
}

/** `learnerOnly` と同じだが、受講者 id が null の行 (旧形式・デモ由来の提出) は残す。 */
export function learnerOrUnknown(userId: AnyColumn | SQL): SQL {
  return sql`(${userId} is null or ${userId} in (select ${profiles.id} from ${profiles} where ${profiles.role} = 'student'))`;
}
