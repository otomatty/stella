/**
 * 割当プリセット API — 受講登録のテンプレートを定義し、 受講生へまとめて適用する。
 *
 * アプリ層認可:
 *   - 定義 (作成 / 更新 / 削除) は admin 以上。 受講登録の運用ルールそのものだから
 *   - 参照 / 適用 は staff (instructor 以上)。 `/api/enrollments` の書き込みと同じ範囲に揃える
 *
 * 設計の要点は `@falcon/shared/enrollment/preset` のヘッダを参照。 期限は絶対日付ではなく
 * 基準日からのオフセットで持ち、 既存登録の扱い (`conflict`) は呼び出し側が明示する。
 */

import { Hono } from "hono";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

import {
  type PresetApplyDetail,
  type PresetConflictPolicy,
  type PresetItemInput,
  isDateKey,
  isPresetConflictPolicy,
  planPresetApply,
  validatePresetInput,
} from "@falcon/shared/enrollment/preset";

import { courses, enrollmentPresetItems, enrollmentPresets, enrollments } from "../db/schema.js";
import type { Db } from "../db/client.js";
import { ApiError, errorResponse, getCaller, requireRole, requireReturning } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Caller } from "../lib/authz.js";
import {
  MAX_PAIRS,
  MAX_USER_IDS,
  assertTenantTargets,
  chunk,
  rowsPerInsert,
  uniqueIds,
} from "../lib/enrollment-bulk.js";
import type { Env } from "../env.js";

export const enrollmentPresetsRoute = new Hono<{ Bindings: Env }>();

const PRESET_SELECT = {
  id: enrollmentPresets.id,
  tenant_id: enrollmentPresets.tenantId,
  name: enrollmentPresets.name,
  description: enrollmentPresets.description,
  archived: enrollmentPresets.archived,
  created_by: enrollmentPresets.createdBy,
  created_at: enrollmentPresets.createdAt,
  updated_at: enrollmentPresets.updatedAt,
} as const;

const ITEM_SELECT = {
  id: enrollmentPresetItems.id,
  preset_id: enrollmentPresetItems.presetId,
  course_id: enrollmentPresetItems.courseId,
  required: enrollmentPresetItems.required,
  due_offset_days: enrollmentPresetItems.dueOffsetDays,
  order: enrollmentPresetItems.order,
} as const;

/** プリセットの定義を触れるのは admin 以上。 */
function requirePresetEditor(caller: Caller): void {
  requireRole(caller, "admin", "platform_admin");
}

/** 参照 / 適用は受講登録を書ける範囲 (staff) と揃える。 */
function requirePresetUser(caller: Caller): void {
  requireRole(caller, "instructor", "admin", "platform_admin");
}

/** 対象プリセットが caller と同テナントであることを保証して返す。 */
async function loadPreset(db: Db, id: string, tenantId: string) {
  const rows = await db
    .select(PRESET_SELECT)
    .from(enrollmentPresets)
    .where(eq(enrollmentPresets.id, id))
    .limit(1);
  const preset = rows[0];
  if (!preset) throw new ApiError("プリセットが見つかりません", 404);
  if (preset.tenant_id !== tenantId) {
    throw new ApiError("他テナントのプリセットは操作できません", 403);
  }
  return preset;
}

/**
 * プリセット項目のコースが同テナントに実在するか確かめ、 未公開のものを拾う。
 *
 * 未公開 (draft / archived) でも保存 / 適用は止めない。 教材を作りながらプリセットを
 * 組む運用があるため。 ただし受講者には見えないので、 呼び出し側へ警告として返す。
 */
async function checkPresetCourses(
  db: Db,
  tenantId: string,
  courseIds: string[],
): Promise<{ unpublished: string[] }> {
  if (courseIds.length === 0) return { unpublished: [] };
  const rows = await db
    .select({ id: courses.id, status: courses.status })
    .from(courses)
    .where(and(eq(courses.tenantId, tenantId), inArray(courses.id, courseIds)));
  const found = new Map(rows.map((row) => [row.id, row.status]));
  if (courseIds.some((id) => !found.has(id))) {
    throw new ApiError("同じテナントに存在しない教材が含まれています", 403);
  }
  return { unpublished: courseIds.filter((id) => found.get(id) !== "published") };
}

/** SQLite の一意制約違反か (名前の競合を 409 に変えるために使う)。 */
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Error && /UNIQUE constraint failed/i.test(err.message);
}

/**
 * 保存済みの項目を読み戻す (order 昇順)。
 *
 * 変更系の応答は入力そのままではなく DB の行を返す。 入力には `id` / `preset_id` が無く、
 * 応答型 (`EnrollmentPresetWithItems`) を満たさないため、 項目を id で扱うクライアントが壊れる。
 */
async function loadPresetItems(db: Db, presetId: string) {
  return db
    .select(ITEM_SELECT)
    .from(enrollmentPresetItems)
    .where(eq(enrollmentPresetItems.presetId, presetId))
    .orderBy(asc(enrollmentPresetItems.order));
}

/**
 * 適用のために、 プリセットの見出しと項目を **1 クエリ** で取る。
 *
 * 見出し (版の判定に使う `updated_at`) と項目を別々に読むと、 その隙に編集が入った場合に
 * 「古い版だと判定したのに新しい項目で割り当てる」 が起きる。 更新は 1 トランザクション
 * (見出しの update + 項目の入れ替え) なので、 join した 1 文で読めば必ずどちらか一方の版に揃う。
 */
async function loadPresetForApply(db: Db, id: string) {
  const rows = await db
    .select({
      tenant_id: enrollmentPresets.tenantId,
      name: enrollmentPresets.name,
      archived: enrollmentPresets.archived,
      updated_at: enrollmentPresets.updatedAt,
      course_id: enrollmentPresetItems.courseId,
      required: enrollmentPresetItems.required,
      due_offset_days: enrollmentPresetItems.dueOffsetDays,
      order: enrollmentPresetItems.order,
    })
    .from(enrollmentPresets)
    .leftJoin(enrollmentPresetItems, eq(enrollmentPresetItems.presetId, enrollmentPresets.id))
    .where(eq(enrollmentPresets.id, id))
    .orderBy(asc(enrollmentPresetItems.order));

  const head = rows[0];
  if (!head) throw new ApiError("プリセットが見つかりません", 404);

  // 項目が 0 件のときは left join が 1 行だけ (項目列は null) 返る。
  const items: PresetItemInput[] = [];
  for (const row of rows) {
    if (row.course_id === null || row.required === null || row.order === null) continue;
    items.push({
      course_id: row.course_id,
      required: row.required,
      due_offset_days: row.due_offset_days,
      order: row.order,
    });
  }
  return {
    tenantId: head.tenant_id,
    name: head.name,
    archived: head.archived,
    updatedAt: head.updated_at,
    items,
  };
}

/** 項目を作り直す (全置換)。 差分パッチにすると 「消したはずの教材が残る」 が起きやすい。 */
function itemInserts(db: Db, presetId: string, items: PresetItemInput[]) {
  return items.map((item) =>
    db.insert(enrollmentPresetItems).values({
      presetId,
      courseId: item.course_id,
      required: item.required,
      dueOffsetDays: item.due_offset_days,
      order: item.order,
    }),
  );
}

// ---------------------------------------------------------------
// 一覧
// ---------------------------------------------------------------

/**
 * staff: 同テナントのプリセット一覧 (項目込み)。
 *
 * 件数はテナントあたり数十を想定しているので、 プリセットと項目を 2 クエリで取って
 * メモリ上で組み立てる (N+1 を避ける)。 退役済みは既定で返さない。
 */
enrollmentPresetsRoute.get("/api/enrollment-presets", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requirePresetUser(caller);
    const includeArchived = c.req.query("includeArchived") === "1";

    const presetRows = await db
      .select(PRESET_SELECT)
      .from(enrollmentPresets)
      .where(
        includeArchived
          ? eq(enrollmentPresets.tenantId, caller.tenantId)
          : and(
              eq(enrollmentPresets.tenantId, caller.tenantId),
              eq(enrollmentPresets.archived, false),
            ),
      )
      .orderBy(asc(enrollmentPresets.name));

    if (presetRows.length === 0) return c.json({ rows: [] });

    // 項目は id を列挙せず join で引く (プリセット数が増えてもバインド数が膨らまない)。
    // 見出し側と同じ条件で絞る。 削除は論理削除なので、 絞らないと退役済みプリセットの項目
    // (1 件あたり最大 50) まで毎回読んで捨てることになる。
    const itemRows = await db
      .select(ITEM_SELECT)
      .from(enrollmentPresetItems)
      .innerJoin(enrollmentPresets, eq(enrollmentPresetItems.presetId, enrollmentPresets.id))
      .where(
        includeArchived
          ? eq(enrollmentPresets.tenantId, caller.tenantId)
          : and(
              eq(enrollmentPresets.tenantId, caller.tenantId),
              eq(enrollmentPresets.archived, false),
            ),
      )
      .orderBy(asc(enrollmentPresetItems.order));

    const byPreset = new Map<string, typeof itemRows>();
    for (const item of itemRows) {
      const list = byPreset.get(item.preset_id) ?? [];
      list.push(item);
      byPreset.set(item.preset_id, list);
    }

    return c.json({
      rows: presetRows.map((preset) => ({ ...preset, items: byPreset.get(preset.id) ?? [] })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 作成 / 更新 / 削除
// ---------------------------------------------------------------

/** admin: プリセットを作成する。 */
enrollmentPresetsRoute.post("/api/enrollment-presets", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requirePresetEditor(caller);
    const validated = validatePresetInput(await c.req.json().catch(() => null));
    if (!validated.ok) throw new ApiError(validated.message, 400);
    const { name, description, items } = validated.value;

    const { unpublished } = await checkPresetCourses(
      db,
      caller.tenantId,
      items.map((i) => i.course_id),
    );

    // 名前はテナント内で一意 (退役していないものに限る)。 重複は入力の問題なので 409 で返す。
    const sameName = await db
      .select({ id: enrollmentPresets.id })
      .from(enrollmentPresets)
      .where(
        and(
          eq(enrollmentPresets.tenantId, caller.tenantId),
          eq(enrollmentPresets.name, name),
          eq(enrollmentPresets.archived, false),
        ),
      )
      .limit(1);
    if (sameName[0]) {
      throw new ApiError("同じ名前のプリセットが既にあります", 409);
    }

    // 見出しと項目は 1 トランザクション (D1 batch) で入れる。 見出しを先に確定させると、
    // 項目の insert が失敗したとき (検証と書き込みの間に教材が消えた等) に 「項目が 0 件の
    // プリセット」 が残る。 それが名前を予約してしまい、 作り直そうとしても 409 になる。
    const presetId = crypto.randomUUID();
    try {
      await db.batch([
        db.insert(enrollmentPresets).values({
          id: presetId,
          tenantId: caller.tenantId,
          name,
          description,
          createdBy: caller.id,
        }),
        ...itemInserts(db, presetId, items),
      ]);
    } catch (err) {
      // 事前チェックと書き込みの間に同名が作られた場合。 一意インデックスが弾く。
      if (isUniqueViolation(err)) {
        throw new ApiError("同じ名前のプリセットが既にあります", 409);
      }
      throw err;
    }

    const preset = requireReturning(
      await db
        .select(PRESET_SELECT)
        .from(enrollmentPresets)
        .where(eq(enrollmentPresets.id, presetId))
        .limit(1),
      "プリセットの作成",
    );

    await recordAudit(db, caller, {
      action: "enrollment_preset_create",
      targetType: "enrollment_preset",
      targetId: preset.id,
      ip: clientIp(c),
      metadata: { name, item_count: items.length },
    });

    return c.json({
      row: { ...preset, items: await loadPresetItems(db, presetId) },
      unpublished_course_ids: unpublished,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** admin: プリセットを更新する (項目は全置換)。 */
enrollmentPresetsRoute.patch("/api/enrollment-presets/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requirePresetEditor(caller);
    const id = c.req.param("id");
    await loadPreset(db, id, caller.tenantId);

    const validated = validatePresetInput(await c.req.json().catch(() => null));
    if (!validated.ok) throw new ApiError(validated.message, 400);
    const { name, description, items } = validated.value;

    const { unpublished } = await checkPresetCourses(
      db,
      caller.tenantId,
      items.map((i) => i.course_id),
    );

    // 名前の重複は unique index が弾く。 SQLite のエラーメッセージをそのまま出さず、
    // 事前に同名の別プリセットを引いて 409 にする。
    const sameName = await db
      .select({ id: enrollmentPresets.id })
      .from(enrollmentPresets)
      .where(
        and(
          eq(enrollmentPresets.tenantId, caller.tenantId),
          eq(enrollmentPresets.name, name),
          // 一意制約は退役していないものに限るので、 ここでも退役済みは無視する
          // (消した名前を再利用できる)。
          eq(enrollmentPresets.archived, false),
        ),
      )
      .limit(1);
    if (sameName[0] && sameName[0].id !== id) {
      throw new ApiError("同じ名前のプリセットが既にあります", 409);
    }

    // 項目の入れ替えと本体の更新を 1 トランザクション (D1 batch) で流す。
    // 片方だけ通ると 「名前は新しいが中身は古い」 プリセットが残る。
    try {
      await db.batch([
        db.update(enrollmentPresets).set({ name, description }).where(eq(enrollmentPresets.id, id)),
        db.delete(enrollmentPresetItems).where(eq(enrollmentPresetItems.presetId, id)),
        ...itemInserts(db, id, items),
      ]);
    } catch (err) {
      // 2 人の管理者が別々のプリセットを同じ空き名へ同時に改名すると、 双方の事前チェックが
      // 通ったあとに一意インデックスが片方を弾く。 想定内の衝突なので 500 ではなく 409 で返す。
      if (isUniqueViolation(err)) {
        throw new ApiError("同じ名前のプリセットが既にあります", 409);
      }
      throw err;
    }

    await recordAudit(db, caller, {
      action: "enrollment_preset_update",
      targetType: "enrollment_preset",
      targetId: id,
      ip: clientIp(c),
      metadata: { name, item_count: items.length },
    });

    const row = requireReturning(
      await db
        .select(PRESET_SELECT)
        .from(enrollmentPresets)
        .where(eq(enrollmentPresets.id, id))
        .limit(1),
      "プリセットの更新",
    );
    return c.json({
      row: { ...row, items: await loadPresetItems(db, id) },
      unpublished_course_ids: unpublished,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * admin: プリセットを退役させる (論理削除)。
 *
 * 物理削除しないのは、 監査ログや `enrollments.preset_id` が指す先を失わせないため。
 * 一覧からは既定で消えるので、 運用上は削除と同じに見える。
 */
enrollmentPresetsRoute.delete("/api/enrollment-presets/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requirePresetEditor(caller);
    const id = c.req.param("id");
    const preset = await loadPreset(db, id, caller.tenantId);

    await db.update(enrollmentPresets).set({ archived: true }).where(eq(enrollmentPresets.id, id));

    await recordAudit(db, caller, {
      action: "enrollment_preset_delete",
      targetType: "enrollment_preset",
      targetId: id,
      ip: clientIp(c),
      metadata: { name: preset.name },
    });

    return c.json({ ok: true });
  } catch (err) {
    return errorResponse(c, err);
  }
});

// ---------------------------------------------------------------
// 適用
// ---------------------------------------------------------------

interface ApplyBody {
  userIds?: string[];
  /** 期限の基準日 (`YYYY-MM-DD`)。 必須 — 既定値は置かない (呼び出し側の暦日で決める)。 */
  baseDate?: string;
  conflict?: PresetConflictPolicy;
  dryRun?: boolean;
  /**
   * 呼び出し側が見ていたプリセットの版 (`updated_at` の ISO 文字列)。
   *
   * 省略も許すが、 渡された場合は一致を確かめて、 ずれていれば 409 を返す。
   */
  expectedUpdatedAt?: string;
}

/**
 * staff: プリセットを受講生へ適用する。
 *
 * `dryRun: true` なら DB を触らず件数だけ返す。 プレビューと本適用が同じ
 * `planPresetApply()` を通ることで、 「98 件と出たのに 120 件入った」 というズレを防ぐ。
 *
 * 期限の基準日 (`baseDate`) は必須で、 呼び出し側の暦日を受け取る。 省略時にサーバ (UTC) の
 * 日付で代用すると、 JST の利用者は日付の変わり目に 1 日ずれた期限が入るため。
 *
 * 大人数への適用は呼び出し側が分割して複数回叩く。 その途中で他の管理者がプリセットを編集すると、
 * 前半の受講生には旧内容、 後半には新内容が入る。 見積もり後の編集も同じで、 確認していない
 * 割当がそのまま通る。 `expectedUpdatedAt` で版を留め、 変わっていたら 409 で止める。
 * 版の判定と項目の取得は 1 クエリにまとめてあり、 その隙に編集が入っても食い違わない。
 */
enrollmentPresetsRoute.post("/api/enrollment-presets/:id/apply", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requirePresetUser(caller);
    const id = c.req.param("id");
    // 版の判定と項目の取得は同じ 1 回の読み取りから行う (途中の編集で食い違わないように)。
    const preset = await loadPresetForApply(db, id);
    if (preset.tenantId !== caller.tenantId) {
      throw new ApiError("他テナントのプリセットは操作できません", 403);
    }
    if (preset.archived) {
      throw new ApiError("退役したプリセットは適用できません", 400);
    }

    const body = ((await c.req.json().catch(() => ({}))) ?? {}) as ApplyBody;
    // 見積もり時 / 分割の 1 回目に見ていた版から変わっていないことを確かめる。
    // 比較する `updated_at` は、 これから使う項目と同じ読み取りから来ている。
    if (body.expectedUpdatedAt !== undefined) {
      const expected = Date.parse(body.expectedUpdatedAt);
      if (Number.isNaN(expected) || expected !== preset.updatedAt.getTime()) {
        throw new ApiError(
          "プリセットが更新されています。 画面を再読み込みしてから適用し直してください",
          409,
        );
      }
    }
    const userIds = uniqueIds(body.userIds);
    if (userIds.length === 0) throw new ApiError("userIds が必要です", 400);
    if (userIds.length > MAX_USER_IDS) {
      throw new ApiError(`userIds は最大 ${MAX_USER_IDS} 件です`, 400);
    }
    // 基準日は必須。 サーバ (UTC) の日付で代用すると、 JST なら日付の変わり目からの 9 時間は
    // 全ての期限が 1 日早く入る。 サーバは呼び出し側のタイムゾーンを知らないので、
    // 暦日は呼び出し側に決めさせる。
    const baseDate = body.baseDate;
    if (!isDateKey(baseDate)) {
      throw new ApiError("baseDate は実在する日付を YYYY-MM-DD 形式で指定してください", 400);
    }
    const conflict: PresetConflictPolicy = isPresetConflictPolicy(body.conflict)
      ? body.conflict
      : "skip";
    const dryRun = body.dryRun === true;

    const items = preset.items;
    if (items.length === 0) {
      throw new ApiError("このプリセットには教材が登録されていません", 400);
    }
    if (userIds.length * items.length > MAX_PAIRS) {
      throw new ApiError(
        `一度に扱えるのは ${MAX_PAIRS} 組までです (受講生 ${userIds.length} 名 × 教材 ${items.length} 件)`,
        400,
      );
    }

    const courseIds = items.map((item) => item.course_id);
    await assertTenantTargets(db, caller.tenantId, userIds, []);
    const { unpublished } = await checkPresetCourses(db, caller.tenantId, courseIds);

    // 既存の登録を先に引いて 「新規 / 上書き / スキップ」 を決める。
    // 組数は MAX_PAIRS で頭打ちなので、 バインド数 (1 + 受講生 + 教材) は D1 の上限に収まる。
    const existingRows = await db
      .select({ user_id: enrollments.userId, course_id: enrollments.courseId })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.tenantId, caller.tenantId),
          inArray(enrollments.userId, userIds),
          inArray(enrollments.courseId, courseIds),
        ),
      );
    const existing = new Set(existingRows.map((row) => `${row.user_id}\u0000${row.course_id}`));

    const plan = planPresetApply(items, userIds, baseDate, conflict, (userId, courseId) =>
      existing.has(`${userId}\u0000${courseId}`),
    );

    if (dryRun) {
      return c.json({
        dry_run: true,
        assigned: plan.assigned,
        overwritten: plan.overwritten,
        skipped: plan.skipped,
        details: plan.details,
        unpublished_course_ids: unpublished,
      });
    }

    const appliedAt = new Date();
    const values = plan.rows.map((row) => ({
      tenantId: caller.tenantId,
      userId: row.user_id,
      courseId: row.course_id,
      assignedBy: caller.id,
      dueAt: row.due_at === null ? null : new Date(row.due_at),
      required: row.required,
      presetId: id,
      presetAppliedAt: appliedAt,
    }));

    let assigned = plan.assigned;
    let skipped = plan.skipped;

    if (values.length > 0) {
      /**
       * `skip` は競合を何もしない (既存の期限 / 必須を守る)。
       * `overwrite` は行ごとに期限が違うため、 固定の SET 値ではなく `excluded` を参照する。
       * 固定値にすると (期限, 必須) の組み合わせごとに SQL 文を分ける羽目になる。
       */
      // 「どの組が実際に入ったか」 で数え直せるよう、 id ではなく組を返す。
      const RETURNING = {
        user_id: enrollments.userId,
        course_id: enrollments.courseId,
      } as const;
      const buildInsert = (rowsChunk: typeof values) => {
        const insert = db.insert(enrollments).values(rowsChunk);
        return conflict === "skip"
          ? insert.onConflictDoNothing().returning(RETURNING)
          : insert
              .onConflictDoUpdate({
                target: [enrollments.userId, enrollments.courseId],
                // `preset_id` / `preset_applied_at` は **更新しない**。 これらは
                // 「この登録を作ったプリセット」 を表すので、 既にある登録に別のプリセットを
                // 被せても出自は変わらない (新規挿入時だけ values 側の値が入る)。
                set: {
                  assignedBy: caller.id,
                  dueAt: sql`excluded.due_at`,
                  required: sql`excluded.required`,
                },
              })
              .returning(RETURNING);
      };
      const statements = chunk(
        values,
        rowsPerInsert((rows) => buildInsert(values.slice(0, rows))),
      ).map(buildInsert);
      const [first, ...rest] = statements;
      const written = first
        ? rest.length === 0
          ? [await first]
          : await db.batch([first, ...rest])
        : [];

      if (conflict === "skip") {
        // 計画を立ててから書き込むまでの間に他の管理者が同じ組を登録すると、 DO NOTHING で
        // 弾かれる。 件数だけ直すと details と食い違うため、 実際に入った組で両方を直す。
        const insertedPairs = new Set(
          written.flat().map((row) => `${row.user_id} ${row.course_id}`),
        );
        for (const detail of plan.details) {
          if (detail.action !== "assigned") continue;
          if (insertedPairs.has(`${detail.user_id} ${detail.course_id}`)) continue;
          detail.action = "skipped";
        }
        assigned = insertedPairs.size;
        skipped = plan.details.filter((detail) => detail.action === "skipped").length;
      }
    }

    await recordAudit(db, caller, {
      action: "enrollment_preset_apply",
      targetType: "enrollment_preset",
      targetId: id,
      ip: clientIp(c),
      metadata: {
        preset_name: preset.name,
        user_ids: userIds,
        course_ids: courseIds,
        base_date: baseDate,
        conflict,
        assigned,
        overwritten: plan.overwritten,
        skipped,
      },
    });

    return c.json({
      dry_run: false,
      assigned,
      overwritten: plan.overwritten,
      skipped,
      details: plan.details satisfies PresetApplyDetail[],
      unpublished_course_ids: unpublished,
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
