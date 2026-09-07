/**
 * 割当プリセット API — 受講登録のテンプレートの **定義** だけを持つ。
 *
 * ## Phase 3b: 適用は退役した
 *
 * 割当そのものを廃止したので (`routes/enrollments.ts` のヘッダ参照)、 プリセットを
 * 受講生へ展開する `POST /api/enrollment-presets/:id/apply` は **410 Gone** になった。
 * 定義の CRUD とテーブルは残置してある — 適用済みの登録が `enrollments.preset_id` で
 * 出自を指しており、 監査ログや過去の受講状況と突き合わせるのに要るため。
 *
 * アプリ層認可:
 *   - 定義 (作成 / 更新 / 削除) は admin 以上。 受講登録の運用ルールそのものだから
 *   - 参照は staff (instructor 以上)
 *
 * 設計の要点は `@stella/shared/enrollment/preset` のヘッダを参照。 期限は絶対日付ではなく
 * 基準日からのオフセットで持つ。
 */

import { Hono } from "hono";
import { and, asc, eq, inArray } from "drizzle-orm";

import { type PresetItemInput, validatePresetInput } from "@stella/shared/enrollment/preset";

import { stages, enrollmentPresetItems, enrollmentPresets } from "../db/schema.js";
import type { Db } from "../db/client.js";
import { ApiError, errorResponse, getCaller, requireRole, requireReturning } from "../lib/authz.js";
import { clientIp, recordAudit } from "../lib/audit.js";
import type { Caller } from "../lib/authz.js";
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
  stage_id: enrollmentPresetItems.stageId,
  required: enrollmentPresetItems.required,
  due_offset_days: enrollmentPresetItems.dueOffsetDays,
  order: enrollmentPresetItems.order,
} as const;

/** プリセットの定義を触れるのは admin 以上。 */
function requirePresetEditor(caller: Caller): void {
  requireRole(caller, "admin", "platform_admin");
}

/** 参照は受講状況を読める範囲 (staff) と揃える。 */
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
 * プリセット項目のステージが同テナントに実在するか確かめ、 未公開のものを拾う。
 *
 * 未公開 (draft / archived) でも保存 / 適用は止めない。 教材を作りながらプリセットを
 * 組む運用があるため。 ただし受講者には見えないので、 呼び出し側へ警告として返す。
 */
async function checkPresetStages(
  db: Db,
  tenantId: string,
  stageIds: string[],
): Promise<{ unpublished: string[] }> {
  if (stageIds.length === 0) return { unpublished: [] };
  const rows = await db
    .select({ id: stages.id, status: stages.status })
    .from(stages)
    .where(and(eq(stages.tenantId, tenantId), inArray(stages.id, stageIds)));
  const found = new Map(rows.map((row) => [row.id, row.status]));
  if (stageIds.some((id) => !found.has(id))) {
    throw new ApiError("同じテナントに存在しない教材が含まれています", 403);
  }
  return { unpublished: stageIds.filter((id) => found.get(id) !== "published") };
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

/** 項目を作り直す (全置換)。 差分パッチにすると 「消したはずの教材が残る」 が起きやすい。 */
function itemInserts(db: Db, presetId: string, items: PresetItemInput[]) {
  return items.map((item) =>
    db.insert(enrollmentPresetItems).values({
      presetId,
      stageId: item.stage_id,
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

    const { unpublished } = await checkPresetStages(
      db,
      caller.tenantId,
      items.map((i) => i.stage_id),
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
      unpublished_stage_ids: unpublished,
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

    const { unpublished } = await checkPresetStages(
      db,
      caller.tenantId,
      items.map((i) => i.stage_id),
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
      unpublished_stage_ids: unpublished,
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

/**
 * 退役: プリセットの適用 (Phase 3b)。
 *
 * 割当そのものを廃止したので、 「まとめて割り当てる」 適用も無くなった。 プリセットの
 * **定義** (上の CRUD) はテーブルごと残置してある — 適用済みの登録が `enrollments.preset_id`
 * で出自を指しており、 過去ログと突き合わせるのに要るため。
 *
 * 410 にするのは、 移行前のフロントや手元のスクリプトが 404 を 「パスを間違えた」 と
 * 読んで探し回るのを避けるため。
 */
enrollmentPresetsRoute.post("/api/enrollment-presets/:id/apply", (c) =>
  c.json(
    {
      error:
        "割当プリセットの適用は廃止されました (Phase 3b)。受講者が自分で開始します: POST /api/stages/:id/start",
    },
    410,
  ),
);
