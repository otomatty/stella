/**
 * 割当プリセットの不変条件を保つためのヘルパ。
 *
 * プリセット API は 「項目 1 件以上」 を入力バリデーションで担保しているが、 教材の削除は
 * その外側から項目を消す (`enrollment_preset_items.course_id` は cascade)。 最後の 1 件が
 * 消えると、 一覧には出るが適用は必ず失敗する空のプリセットが残る。 しかも教材の削除は
 * instructor でもできる一方、 プリセットの編集 / 削除は admin 以上なので、 壊した本人が
 * 直せない。 教材の削除と同じトランザクションで畳んでおく。
 */

import { and, eq, exists, notExists, sql } from "drizzle-orm";

import type { Db } from "../db/client.js";
import { enrollmentPresetItems, enrollmentPresets } from "../db/schema.js";

export interface ArchivedEmptyPreset {
  id: string;
  name: string;
}

/**
 * 項目が 0 件になった有効なプリセットを退役させる文を組み立てる (実行はしない)。
 *
 * 実行を呼び出し側に任せるのは、 教材の削除と **同じ D1 batch** に載せるため。 別々に流すと、
 * 教材の削除だけ確定してこちらが失敗したときに空のプリセットが恒久的に残り、 再実行しても
 * 教材はもう無い (404) ので直せない。 1 トランザクションなら、 どちらも通るか両方戻るかになる。
 *
 * バッチ内では文が順に実行されるので、 教材の削除 → cascade で項目が消える → この文が
 * 「項目が無い」 と判定する、 という順序が保証される。
 *
 * `returning` で畳んだプリセットを返すため、 呼び出し側は事前の SELECT なしで監査に残せる。
 */
export function archiveEmptiedPresetsStatement(db: Db, tenantId: string) {
  const hasNoItems = notExists(
    db
      .select({ one: sql`1` })
      .from(enrollmentPresetItems)
      .where(eq(enrollmentPresetItems.presetId, enrollmentPresets.id)),
  );
  return db
    .update(enrollmentPresets)
    .set({ archived: true })
    .where(
      and(
        eq(enrollmentPresets.tenantId, tenantId),
        eq(enrollmentPresets.archived, false),
        hasNoItems,
      ),
    )
    .returning({ id: enrollmentPresets.id, name: enrollmentPresets.name });
}

/**
 * 指定した教材を含むプリセットの版 (`updated_at`) を進める文を組み立てる (実行はしない)。
 *
 * 適用 API は `expectedUpdatedAt` で版を留め、 内容が変わっていたら 409 で止める。 ところが
 * 教材の削除は cascade で項目だけを消すため、 これが無いと 「項目は減ったのに版は据え置き」
 * になり、 分割送信の後半チャンクが 「約束した 409 を出さずに減った内容で適用する」。
 *
 * **教材を削除する文より前** に流すこと。 削除後は cascade で項目が消えており、
 * どのプリセットが影響を受けたのか引けなくなる。
 */
export function touchPresetsContainingCourseStatement(db: Db, tenantId: string, courseId: string) {
  return db
    .update(enrollmentPresets)
    .set({ updatedAt: new Date() })
    .where(
      and(
        eq(enrollmentPresets.tenantId, tenantId),
        exists(
          db
            .select({ one: sql`1` })
            .from(enrollmentPresetItems)
            .where(
              and(
                eq(enrollmentPresetItems.presetId, enrollmentPresets.id),
                eq(enrollmentPresetItems.courseId, courseId),
              ),
            ),
        ),
      ),
    );
}

/** 監査ログの metadata に載せるプリセット数の上限 (1 行が膨らみすぎないように)。 */
export const MAX_ARCHIVED_PRESETS_IN_AUDIT = 20;
