/**
 * 受講登録 API (旧 enrollments テーブル直アクセス + RLS の置き換え / Issue #20)。
 *
 * アプリ層認可 (旧 RLS の置き換え):
 *   - 受講者は自分の enrollment のみ read … GET /api/enrollments/mine
 *   - instructor/admin は同テナントを read/write … 他ルートは requireRole + tenant 突合
 */

import { Hono } from "hono";
import { and, asc, count, eq, inArray, sql } from "drizzle-orm";

import { courses, enrollments, profiles } from "../db/schema.js";
import { errorResponse, getCaller, requireRole, ApiError } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Env } from "../env.js";

export const enrollmentsRoute = new Hono<{ Bindings: Env }>();

const SELECT = {
  id: enrollments.id,
  tenant_id: enrollments.tenantId,
  user_id: enrollments.userId,
  course_id: enrollments.courseId,
  assigned_by: enrollments.assignedBy,
  due_at: enrollments.dueAt,
  required: enrollments.required,
  status: enrollments.status,
  enrolled_at: enrollments.enrolledAt,
  completed_at: enrollments.completedAt,
} as const;

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

/**
 * 割当対象の受講者 / コースが caller と同テナントに実在することを確かめる。
 *
 * enrollments の外部キーは 「存在するか」 しか見ず、 テナントは見ない。 検証せずに insert すると、
 * 他テナントの受講者 / コースを指す行を自テナントの tenant_id で作れてしまい、
 * 受講者本人の一覧 (`/api/enrollments/mine` は user_id だけで引く) に他テナントのコースが出る。
 * また (user_id, course_id) はグローバルに一意なので、 他テナントの既存登録の期限 / 必須を
 * upsert で書き換えられてしまう。
 */
async function assertTenantTargets(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  tenantId: string,
  userIds: string[],
  courseIds: string[],
): Promise<void> {
  if (userIds.length > 0) {
    const rows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(eq(profiles.tenantId, tenantId), inArray(profiles.id, userIds)));
    const found = new Set(rows.map((row) => row.id));
    if (userIds.some((id) => !found.has(id))) {
      throw new ApiError("同じテナントに存在しない受講者が含まれています", 403);
    }
  }
  if (courseIds.length > 0) {
    const rows = await db
      .select({ id: courses.id })
      .from(courses)
      .where(and(eq(courses.tenantId, tenantId), inArray(courses.id, courseIds)));
    const found = new Set(rows.map((row) => row.id));
    if (courseIds.some((id) => !found.has(id))) {
      throw new ApiError("同じテナントに存在しないコースが含まれています", 403);
    }
  }
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
    return c.json({ rows });
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

/** `userIds` に渡せる受講者 id の上限。 1 リクエストの応答量を抑えるためのガード。 */
const MAX_USER_IDS = 50;

/**
 * staff: enrollment 一覧 (常に同テナントに限定)。
 *
 * `courseId` / `userId` / `userIds` (カンマ区切り, 最大 50) のいずれかが必須。
 * 無条件の全件取得は、 テナントが育つと受講者数 × コース数に比例して応答が膨らむため許さない
 * (受講者一覧の件数表示は `/api/enrollments/summary` を使う)。
 */
enrollmentsRoute.get("/api/enrollments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const courseId = c.req.query("courseId");
    const userIds = (c.req.query("userIds") ?? c.req.query("userId") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (!courseId && userIds.length === 0) {
      throw new ApiError("courseId または userId が必要です", 400);
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
          ...(courseId ? [eq(enrollments.courseId, courseId)] : []),
          ...(userIds.length > 0 ? [inArray(enrollments.userId, userIds)] : []),
        ),
      )
      .orderBy(asc(enrollments.enrolledAt));
    return c.json({ rows });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** staff: 受講者にコースを割り当てる (upsert で二重登録防止)。 */
enrollmentsRoute.post("/api/enrollments", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const body = (await c.req.json()) as {
      userId: string;
      courseId: string;
      dueAt?: string | null;
      required?: boolean;
    };
    if (!body.userId || !body.courseId) {
      throw new ApiError("userId / courseId が必要です", 400);
    }
    await assertTenantTargets(db, caller.tenantId, [body.userId], [body.courseId]);
    const dueAt = parseTimestamp(body.dueAt, "dueAt");
    const required = body.required ?? true;
    const rows = await db
      .insert(enrollments)
      .values({
        tenantId: caller.tenantId,
        userId: body.userId,
        courseId: body.courseId,
        assignedBy: caller.id,
        dueAt,
        required,
      })
      .onConflictDoUpdate({
        target: [enrollments.userId, enrollments.courseId],
        set: { assignedBy: caller.id, dueAt, required },
      })
      .returning(SELECT);
    await recordAudit(db, caller, {
      action: "enrollment_create",
      targetType: "enrollment",
      targetId: rows[0]?.id ?? null,
      ip: clientIp(c),
      metadata: {
        user_id: body.userId,
        course_id: body.courseId,
        required,
        due_at: body.dueAt ?? null,
      },
    });
    return c.json({ row: rows[0] });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 1 リクエストで扱える コース id の上限。 */
const MAX_COURSE_IDS = 50;
/** 1 リクエストで扱える 受講者 × コース の組み合わせ上限。 */
const MAX_PAIRS = 500;
/**
 * D1 の 1 クエリあたりのバインド変数上限。 これを超えると
 * `D1_ERROR: too many SQL variables` で失敗するため、 SQL 文をこの範囲に分けて batch で流す。
 */
const D1_MAX_BOUND_PARAMS = 100;
/**
 * 1 文に載せられる upsert 行数を、 実際に組み立てた SQL のバインド数から求める。
 *
 * 列を数え上げるとズレる (`id` / `enrolled_at` は `$defaultFn` のため、 スキーマ上は既定値でも
 * 値がバインドされる)。 1 行版と 2 行版のバインド数の差を 1 行あたりのコストとして測り、
 * 残りを固定オーバーヘッド (SET 句) とみなす。 スキーマに列が増えても自動で追随する。
 */
function rowsPerInsert(build: (rows: number) => { toSQL: () => { params: unknown[] } }): number {
  const one = build(1).toSQL().params.length;
  const two = build(2).toSQL().params.length;
  const perRow = Math.max(1, two - one);
  const overhead = Math.max(0, one - perRow);
  return Math.max(1, Math.floor((D1_MAX_BOUND_PARAMS - overhead) / perRow));
}

/** 配列を `size` 件ずつに分ける。 */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += Math.max(1, size)) out.push(items.slice(i, i + size));
  return out;
}

/** カンマ区切り / 配列いずれでも受け取り、 空要素を落として重複を除く。 */
function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is string => typeof v === "string" && v.trim() !== ""))];
}

/**
 * staff: 受講者 × コースをまとめて割当 / 解除する (Issue #20 / 受講登録画面の一括操作)。
 *
 * 組み合わせの数だけ個別 API を並べて叩くと、 50 名 × 20 コースで 1000 リクエストになり
 * スロットリングや部分適用を招く。 1 文の upsert / delete にまとめ、 監査も 1 件で残す。
 * 上限を超える指定は呼び出し側で分割する (`MAX_PAIRS`)。
 */
enrollmentsRoute.post("/api/enrollments/bulk", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const body = (await c.req.json()) as {
      action?: "assign" | "unassign";
      userIds?: string[];
      courseIds?: string[];
      dueAt?: string | null;
      required?: boolean;
    };
    const action = body.action ?? "assign";
    if (action !== "assign" && action !== "unassign") {
      throw new ApiError("action は assign / unassign のいずれかです", 400);
    }
    const userIds = uniqueIds(body.userIds);
    const courseIds = uniqueIds(body.courseIds);
    if (userIds.length === 0 || courseIds.length === 0) {
      throw new ApiError("userIds / courseIds が必要です", 400);
    }
    if (userIds.length > MAX_USER_IDS) {
      throw new ApiError(`userIds は最大 ${MAX_USER_IDS} 件です`, 400);
    }
    if (courseIds.length > MAX_COURSE_IDS) {
      throw new ApiError(`courseIds は最大 ${MAX_COURSE_IDS} 件です`, 400);
    }
    if (userIds.length * courseIds.length > MAX_PAIRS) {
      throw new ApiError(`一度に扱えるのは ${MAX_PAIRS} 組までです`, 400);
    }

    if (action === "unassign") {
      // delete のバインドは tenant 1 + userIds + courseIds。 上限に収まるようコースを刻む。
      const coursesPerStatement = D1_MAX_BOUND_PARAMS - 1 - userIds.length;
      const statements = chunk(courseIds, coursesPerStatement).map((courses) =>
        db
          .delete(enrollments)
          .where(
            and(
              eq(enrollments.tenantId, caller.tenantId),
              inArray(enrollments.userId, userIds),
              inArray(enrollments.courseId, courses),
            ),
          )
          .returning({ id: enrollments.id }),
      );
      const [firstDelete, ...restDeletes] = statements;
      // 複数文になる場合は D1 batch (1 トランザクション) で流す。
      const deleted = firstDelete
        ? restDeletes.length === 0
          ? [await firstDelete]
          : await db.batch([firstDelete, ...restDeletes])
        : [];
      const removed = deleted.reduce((n, rows) => n + rows.length, 0);
      await recordAudit(db, caller, {
        action: "enrollment_bulk_delete",
        targetType: "enrollment",
        ip: clientIp(c),
        metadata: { user_ids: userIds, course_ids: courseIds, removed },
      });
      return c.json({ removed });
    }

    await assertTenantTargets(db, caller.tenantId, userIds, courseIds);
    const dueAt = parseTimestamp(body.dueAt, "dueAt");
    const required = body.required ?? true;
    const values = userIds.flatMap((userId) =>
      courseIds.map((courseId) => ({
        tenantId: caller.tenantId,
        userId,
        courseId,
        assignedBy: caller.id,
        dueAt,
        required,
      })),
    );
    const buildInsert = (rowsChunk: typeof values) =>
      db
        .insert(enrollments)
        .values(rowsChunk)
        .onConflictDoUpdate({
          target: [enrollments.userId, enrollments.courseId],
          set: { assignedBy: caller.id, dueAt, required },
        })
        .returning({ id: enrollments.id });
    const statements = chunk(
      values,
      rowsPerInsert((rows) => buildInsert(values.slice(0, rows))),
    ).map(buildInsert);
    const [firstInsert, ...restInserts] = statements;
    // 複数文になる場合は D1 batch (1 トランザクション) で流す。
    const inserted = firstInsert
      ? restInserts.length === 0
        ? [await firstInsert]
        : await db.batch([firstInsert, ...restInserts])
      : [];
    const assigned = inserted.reduce((n, rows) => n + rows.length, 0);
    await recordAudit(db, caller, {
      action: "enrollment_bulk_create",
      targetType: "enrollment",
      ip: clientIp(c),
      metadata: {
        user_ids: userIds,
        course_ids: courseIds,
        assigned,
        required,
        due_at: body.dueAt ?? null,
      },
    });
    return c.json({ assigned });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 対象 enrollment が caller と同テナントであることを保証し、 監査ログ用に
 * 対象の受講者 / コースを返す。
 */
async function assertSameTenant(
  db: Awaited<ReturnType<typeof getCaller>>["db"],
  id: string,
  tenantId: string,
): Promise<{ userId: string; courseId: string }> {
  const rows = await db
    .select({
      tenant_id: enrollments.tenantId,
      user_id: enrollments.userId,
      course_id: enrollments.courseId,
    })
    .from(enrollments)
    .where(eq(enrollments.id, id))
    .limit(1);
  if (!rows[0]) throw new ApiError("対象が見つかりません", 404);
  if (rows[0].tenant_id !== tenantId) {
    throw new ApiError("他テナントの登録は操作できません", 403);
  }
  return { userId: rows[0].user_id, courseId: rows[0].course_id };
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
    await recordAudit(db, caller, {
      action: "enrollment_update",
      targetType: "enrollment",
      targetId: id,
      ip: clientIp(c),
      metadata: { user_id: target.userId, course_id: target.courseId, patch },
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
      metadata: { user_id: target.userId, course_id: target.courseId },
    });
    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});
