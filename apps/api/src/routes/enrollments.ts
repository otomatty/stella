/**
 * 受講登録 API (旧 enrollments テーブル直アクセス + RLS の置き換え / Issue #20)。
 *
 * アプリ層認可 (旧 RLS の置き換え):
 *   - 受講者は自分の enrollment のみ read … GET /api/enrollments/mine
 *   - instructor/admin は同テナントを read … 他ルートは requireRole + tenant 突合
 *
 * ## Phase 3b: 割当は退役した
 *
 * 管理者がステージを割り当てる運用を廃止し、受講者が自分で始める自律モデルへ移行した。
 * 登録を **作る** 口は `POST /api/stages/:id/start` (`routes/stage-start.ts`) だけで、
 * このファイルに残っているのは読み取りと、運用のための後始末だけ:
 *
 *   - `POST /api/enrollments` / `POST /api/enrollments/bulk` … **410 Gone**。
 *     404 にしないのは、綴り違いを疑って探し回らせないため (退役したことを伝える)
 *   - `PATCH /api/enrollments/:id` … 残す。期限切れ処理・完了の手動修正に使う
 *   - `DELETE /api/enrollments/:id` … 残す。誤って始めた星の取り消しに使う
 *   - `GET` 系 … 残す。管理画面は「受講状況」(読み取り専用) になった
 */

import { Hono } from "hono";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { enrollments } from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import { MAX_USER_IDS } from "../lib/enrollment-bulk.js";
import { ENROLLMENT_SELECT } from "../lib/enrollment-write.js";
import { recordStagePathEvents } from "../lib/stage-path-events.js";
import type { Env } from "../env.js";

export const enrollmentsRoute = new Hono<{ Bindings: Env }>();

/**
 * 退役した割当 API の文言。
 *
 * 代わりの入口をそのまま書いておく — 呼び出し側 (古いフロント / 手元のスクリプト) が
 * 410 を見たときに、次にどこを叩けばよいかがレスポンスだけで分かるようにする。
 */
const ASSIGNMENT_RETIRED_MESSAGE =
  "受講登録の割当は廃止されました (Phase 3b)。受講者が自分で開始します: POST /api/stages/:id/start";

/** 行の応答形は書き込み側 (`lib/enrollment-write.ts`) と共有する。 */
const SELECT = ENROLLMENT_SELECT;

/**
 * リクエストの日時文字列を Date にする。 空 / 未指定は null。
 *
 * 不正な文字列をそのまま Date にすると Invalid Date のまま drizzle の timestamp_ms へ渡り、
 * DB 層のエラー (500) になる。 入力の問題は 400 で返す。
 */
function parseTimestamp(value: string | null | undefined, field: string): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new ApiError(`${field} の日時が不正です`, 400);
  return date;
}

/** 受講者本人の enrollment 一覧 (登録日昇順)。 */
enrollmentsRoute.get("/api/enrollments/mine", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const rows = await db
      .select(SELECT)
      .from(enrollments)
      .where(eq(enrollments.userId, caller.id))
      .orderBy(asc(enrollments.enrolledAt));
    // TODO(stage-rename-compat): 旧拡張(<=0.1.0)互換。 拡張更新の浸透後に削除
    // 旧拡張は受講中ステージを `course_id` で読む。 これが無いと空カタログになり、
    // `/api/cms/courses/:id` のエイリアスまで届かない。 このエンドポイントに限定。
    return c.json({ rows: rows.map((row) => ({ ...row, course_id: row.stage_id })) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * staff: 受講者ごとの割当件数サマリ (同テナント)。
 *
 * 受講登録画面の受講者一覧はバッジ (割当 n 件 / 期限超過 n 件) しか要らないので、
 * enrollment 行を全部返さず集計だけ返す。 行数は「登録のある受講者数」で頭打ちになる。
 */
enrollmentsRoute.get("/api/enrollments/summary", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    // 期限は日付として扱う (`due_at` は入力日の UTC 0 時)。 期限当日はまだ超過ではないので、
    // 「今日より前の日付」 を超過とする。 受講者ダッシュボードの 「本日まで」 と揃える。
    //
    // 「今日」 は呼び出し側の暦日 (`today=YYYY-MM-DD`) を使う。 サーバ (UTC) の日付で判定すると、
    // JST など UTC 以外の利用者は日付が変わる前後で画面側の判定 (ローカル暦日) とずれる。
    const todayParam = c.req.query("today");
    const today =
      todayParam && /^\d{4}-\d{2}-\d{2}$/.test(todayParam)
        ? todayParam
        : new Date().toISOString().slice(0, 10);
    const todayStartUtc = Date.parse(`${today}T00:00:00.000Z`);
    const rows = await db
      .select({
        user_id: enrollments.userId,
        total: count(),
        overdue: sql<number>`sum(case when ${enrollments.dueAt} is not null
          and ${enrollments.dueAt} < ${todayStartUtc}
          and ${enrollments.status} <> 'completed' then 1 else 0 end)`,
      })
      .from(enrollments)
      .where(eq(enrollments.tenantId, caller.tenantId))
      .groupBy(enrollments.userId);
    return c.json({
      rows: rows.map((row) => ({
        user_id: row.user_id,
        total: Number(row.total ?? 0),
        overdue: Number(row.overdue ?? 0),
      })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * staff: enrollment 一覧 (常に同テナントに限定)。
 *
 * `stageId` / `userId` / `userIds` (カンマ区切り, 最大 50) のいずれかが必須。
 * 無条件の全件取得は、 テナントが育つと受講者数 × ステージ数に比例して応答が膨らむため許さない
 * (受講者一覧の件数表示は `/api/enrollments/summary` を使う)。
 */
enrollmentsRoute.get("/api/enrollments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const stageId = c.req.query("stageId");
    const userIds = (c.req.query("userIds") ?? c.req.query("userId") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!stageId && userIds.length === 0) {
      throw new ApiError("stageId または userId が必要です", 400);
    }
    if (userIds.length > MAX_USER_IDS) {
      throw new ApiError(`userIds は最大 ${MAX_USER_IDS} 件です`, 400);
    }
    const rows = await db
      .select(SELECT)
      .from(enrollments)
      .where(
        and(
          eq(enrollments.tenantId, caller.tenantId),
          ...(stageId ? [eq(enrollments.stageId, stageId)] : []),
          ...(userIds.length > 0 ? [inArray(enrollments.userId, userIds)] : []),
        ),
      )
      .orderBy(asc(enrollments.enrolledAt));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 退役: 個別割当 (Phase 3b)。
 *
 * ルートを消さずに 410 を返すのは、 移行前のフロントや手元のスクリプトが 404 を
 * 「パスを間違えた」 と読んで探し回るのを避けるため。 認可も見ずに即 410 にする —
 * 「権限があれば通る」 と誤解させないことと、 退役の事実はロール依存の秘密ではないため。
 */
enrollmentsRoute.post("/api/enrollments", (c) =>
  c.json({ error: ASSIGNMENT_RETIRED_MESSAGE }, 410),
);

/** 退役: 一括割当 / 一括解除 (Phase 3b)。 個別割当と同じ扱い。 */
enrollmentsRoute.post("/api/enrollments/bulk", (c) =>
  c.json({ error: ASSIGNMENT_RETIRED_MESSAGE }, 410),
);

/**
 * 対象 enrollment が caller と同テナントであることを保証し、 監査ログ用に
 * 対象の受講者 / ステージを返す。
 */
async function assertSameTenant(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  id: string,
  tenantId: string,
): Promise<{ userId: string; stageId: string }> {
  const rows = await db
    .select({
      tenant_id: enrollments.tenantId,
      user_id: enrollments.userId,
      stage_id: enrollments.stageId,
    })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);
  if (!rows[0]) throw new ApiError("対象が見つかりません", 404);
  if (rows[0].tenant_id !== tenantId) {
    throw new ApiError("他テナントの登録は操作できません", 403);
  }
  return { userId: rows[0].user_id, stageId: rows[0].stage_id };
}

/** staff: 期限 / 必須 / ステータスを更新する。 */
enrollmentsRoute.patch("/api/enrollments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    const target = await assertSameTenant(db, id, caller.tenantId);
    const patch = (await c.req.json()) as {
      due_at?: string | null;
      required?: boolean;
      status?: "active" | "completed" | "expired";
      completed_at?: string | null;
    };
    await db
      .update(enrollments)
      .set({
        ...(patch.due_at !== undefined ? { dueAt: parseTimestamp(patch.due_at, "due_at") } : {}),
        ...(patch.required !== undefined ? { required: patch.required } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.completed_at !== undefined
          ? { completedAt: parseTimestamp(patch.completed_at, "completed_at") }
          : {}),
      })
      .where(eq(enrollments.id, id));
    // staff が手で修了にした場合も 「星が点いた」 に含める (修了証の発行を伴わないため、
    // certificates 側の記録では拾えない)。
    if (patch.status === "completed") {
      await recordStagePathEvents(db, caller.tenantId, "cleared", [
        { userId: target.userId, stageId: target.stageId },
      ]);
    }
    await recordAudit(db, caller, {
      action: "enrollment_update",
      targetType: "enrollment",
      targetId: id,
      ip: clientIp(c),
      metadata: { user_id: target.userId, stage_id: target.stageId, patch },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 割当を解除する。 */
enrollmentsRoute.delete("/api/enrollments/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const id = c.req.param("id");
    const target = await assertSameTenant(db, id, caller.tenantId);
    await db.delete(enrollments).where(eq(enrollments.id, id));
    await recordAudit(db, caller, {
      action: "enrollment_delete",
      targetType: "enrollment",
      targetId: id,
      ip: clientIp(c),
      metadata: { user_id: target.userId, stage_id: target.stageId },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
