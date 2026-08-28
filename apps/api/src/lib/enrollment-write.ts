/**
 * 受講登録 (enrollment) の書き込みを 1 か所に寄せる。
 *
 * 「登録行を作る」だけなら insert 1 文だが、実際には **学習経路の `started` を同時に
 * 積む** 必要がある (`stage_path_events`)。この 2 つが離れると「登録はあるのに開始
 * イベントが無い受講者」が経路によって生まれ、モニタリングの母数が経路ごとにずれる。
 *
 * ## Phase 3b: 入口は「自己開始」だけになった
 *
 * staff の割当 (`POST /api/enrollments` / `/bulk` / プリセット適用) は退役し、登録を
 * 作るのは **受講者自身の操作** に一本化された:
 *   - 解放済みの星を自分で始める (`routes/stage-start.ts`)
 *   - 腕試しの飛び級で開いた星を、合格と同時に始める (`routes/skill-check.ts`)
 *
 * どちらも `startSelfEnrollment()` を通る。書き込みの形も 1 通りしか無い —
 * 「無ければ作る / あれば触らない (期限切れだけ再開する)」。期限 / 必須を後から直すのは
 * `PATCH /api/enrollments/:id` の仕事で、ここでは上書きしない。
 */

import { and, eq } from "drizzle-orm";

import { enrollments } from "../db/schema.js";
import type { Db } from "../db/client.js";
import type { Caller } from "./authz.js";
import { recordStagePathEvents } from "./stage-path-events.js";

/** enrollment 行の応答形 (route の一覧・単体で共通)。 */
export const ENROLLMENT_SELECT = {
  id: enrollments.id,
  tenant_id: enrollments.tenantId,
  user_id: enrollments.userId,
  stage_id: enrollments.stageId,
  assigned_by: enrollments.assignedBy,
  due_at: enrollments.dueAt,
  required: enrollments.required,
  status: enrollments.status,
  // 割当プリセット由来の登録は出所を持つ (手動割当は null)。 画面が 「どのプリセットで
  // 入った登録か」 を出せるよう一覧にも含める。
  preset_id: enrollments.presetId,
  preset_applied_at: enrollments.presetAppliedAt,
  enrolled_at: enrollments.enrolledAt,
  completed_at: enrollments.completedAt,
} as const;

/**
 * 受講者 × ステージの登録を 1 件読む (自己開始が既存行を返すために使う)。
 *
 * `(user_id, stage_id)` はグローバルに一意だが、テナントでも絞る。呼び出し元が渡すのは
 * 常に caller のテナントで、万一 (移行ミス等で) 他テナントの行が同じ組で存在しても、
 * それを自分の登録として返さないため。
 */
async function loadEnrollment(db: Db, tenantId: string, userId: string, stageId: string) {
  const rows = await db
    .select(ENROLLMENT_SELECT)
    .from(enrollments)
    .where(
      and(
        eq(enrollments.tenantId, tenantId),
        eq(enrollments.userId, userId),
        eq(enrollments.stageId, stageId),
      ),
    )
    .limit(1);
  return rows[0];
}

/** `startSelfEnrollment()` の結果。 */
export interface SelfEnrollmentResult {
  /** 登録行 (作成 / 再開 / 既存のいずれでも現在の行)。読み戻せなければ undefined。 */
  row: Awaited<ReturnType<typeof loadEnrollment>>;
  /** この呼び出しで登録が **生まれた** か。 */
  created: boolean;
  /** 期限切れだった登録を **受講中へ戻した** か。 */
  reactivated: boolean;
}

/**
 * **自分でステージを始める** (Phase 3b の唯一の登録入口)。
 *
 * 呼び出し元は 2 つとも「受講者本人の意思表示」:
 *   - 解放済みの星の「ここから始める」(`POST /api/stages/:id/start`)
 *   - 腕試しの飛び級で開いた星 (`routes/skill-check.ts`) — 合格した瞬間に始める
 *
 * **冪等**。既にある `active` / `completed` の登録は触らない — 期限や必須フラグ
 * (移行前に staff が付けたもの、あるいは `PATCH` で運用が直したもの) を、2 度目の
 * 「始める」が既定値へ戻してしまわないため。
 *
 * ただし **`expired` だけは `active` へ戻す**。自己開始のモデルでは期限切れは
 * 「もう学べない」ではなく「一度離れた」に過ぎず、戻さないと学び直しの入口が塞がる
 * (登録はあるので新規作成は弾かれ、`PUT /api/skill-map/active-stage` は期限切れを
 * 進行中にできない、という袋小路になる)。`completed_at` は触らない — 「いつ終えたか」は
 * 学び直しでは変わらない事実で、再開のたびに消すと修了の記録が失われる。
 * 復帰では `stage_path_events(started)` を積み直さない (一意索引があるので二重には
 * 積まれず、「初めて始めた日」がそのまま残る)。
 *
 * 期限は付けず必須にもしない。自分で始めた星に締切を作ると、ホームの「期限超過」に
 * 自分の意思で始めた星が並ぶ。
 */
export async function startSelfEnrollment(
  db: Db,
  caller: Caller,
  stageId: string,
): Promise<SelfEnrollmentResult> {
  const inserted = await db
    .insert(enrollments)
    .values({
      tenantId: caller.tenantId,
      userId: caller.id,
      stageId,
      // 自己開始は「自分が自分に割り当てた」と記録する (列の値域は profile id)。
      assignedBy: caller.id,
      dueAt: null,
      required: false,
    })
    .onConflictDoNothing({ target: [enrollments.userId, enrollments.stageId] })
    .returning(ENROLLMENT_SELECT);

  const created = inserted[0];
  if (created) {
    // 学習経路の統計。既に started があれば足さない (一意索引で冪等)。
    await recordStagePathEvents(db, caller.tenantId, "started", [{ userId: caller.id, stageId }]);
    return { row: created, created: true, reactivated: false };
  }

  // 既存行があって insert が弾かれた場合。読み直して状態を見る。
  const existing = await loadEnrollment(db, caller.tenantId, caller.id, stageId);
  if (existing?.status !== "expired") {
    return { row: existing, created: false, reactivated: false };
  }

  // 期限切れの再開。`status` が `expired` のままの行だけを更新する — 読んでから書くまでの
  // 間に staff が完了へ直していたら、その修正を上書きしない。
  const revived = await db
    .update(enrollments)
    .set({ status: "active" })
    .where(and(eq(enrollments.id, existing.id), eq(enrollments.status, "expired")))
    .returning(ENROLLMENT_SELECT);
  const row = revived[0];
  return row
    ? { row, created: false, reactivated: true }
    : {
        row: await loadEnrollment(db, caller.tenantId, caller.id, stageId),
        created: false,
        reactivated: false,
      };
}
