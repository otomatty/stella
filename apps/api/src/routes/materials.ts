/**
 * レッスン配布資料の閲覧・配信管理 API。
 *
 * Cloudflare R2 バインディング (`MATERIALS_BUCKET`) 経由で GET する。
 * 配布資料は教材リポジトリを正本として seed が登録する。
 *
 * - GET    /api/materials?lessonId=...  … レッスンの配布資料一覧。
 *                                         受講者は published + active enrollment (quiz と同基準)。
 * - GET    /api/materials?stageId=...   … ステージ全体の配布資料一覧 (Issue #77 —
 *                                         ステージ詳細「教材をダウンロード」)。 認可は同上。
 *   どちらも教材から作らなくなった資料・staff が配信から外した資料 (`archived_at`) は外す。staff は
 *   `includeArchived=1` で含められる (配布資料の管理画面で旧版をたどるため)。
 * - PATCH  /api/materials/:id           … 手動アップロード資料の配信から外す / 戻す (staff のみ)。
 * - GET    /api/materials/:id/download  … R2 からのプロキシダウンロード (認可は一覧と同じ。
 *                                         `archived_at` のある資料は staff だけ)。
 *
 * R2 の `path` はクライアントへ返さない (バケットが公開 URL を持つ場合の直リンク緩和)。
 * ダウンロードは常に id ベースのプロキシ経由。
 *
 * R2 バインディング未設定時は 503 を返す (wrangler.toml の `[[r2_buckets]]` を参照)。
 */

import { Hono } from "hono";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { READABLE_ENROLLMENT_STATUSES } from "@stella/shared/enrollment/access";

import {
  stages,
  enrollments,
  lessonMaterialVersions,
  lessonMaterials,
  lessons,
  sections,
} from "../db/schema.js";
import { errorResponse, getCaller, isStaffRole, requireRole, ApiError } from "../lib/authz.js";
import { auditLogInsert, clientIp } from "../lib/audit.js";
import type { Caller } from "../lib/authz.js";
import type { Db } from "../db/client.js";
import type { Env } from "../env.js";

export const materialsRoute = new Hono<{ Bindings: Env }>();

type MaterialSel = typeof lessonMaterials.$inferSelect;

// `path` は意図的に返さない (公開バケット直リンクの緩和 — ダウンロードは id ベースのプロキシ)。
const materialToRow = (m: MaterialSel) => ({
  id: m.id,
  lesson_id: m.lessonId,
  file_name: m.fileName,
  size_bytes: m.sizeBytes,
  mime_type: m.mimeType,
  source: m.source,
  created_by: m.createdBy,
  created_at: m.createdAt,
  archived_at: m.archivedAt,
});

/**
 * 一覧に出す資料。教材から作らなくなった資料・staff が配信から外した資料 (`archived_at`) は外し、staff が
 * `includeArchived=1` を付けたとき (配布資料の管理画面) だけ含める — 旧版を版履歴から取るため。
 */
function listedMaterials(caller: Caller, includeArchived: string | undefined) {
  return includeArchived === "1" && isStaffRole(caller.role)
    ? undefined
    : isNull(lessonMaterials.archivedAt);
}

/** レッスンのステージ公開状態 / ステージ ID を join で解決する。 */
async function lessonStageInfo(
  db: Db,
  lessonId: string,
): Promise<{ stageStatus: string; stageId: string } | null> {
  const rows = await db
    .select({
      stageStatus: stages.status,
      stageId: stages.id,
    })
    .from(lessons)
    .innerJoin(sections, eq(sections.id, lessons.sectionId))
    .innerJoin(stages, eq(stages.id, sections.stageId))
    .where(eq(lessons.id, lessonId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * 配布資料の閲覧認可。
 * - staff: レッスンが存在すれば可
 * - student: published かつ当該ステージに閲覧可能な enrollment
 *   (`active` に加えて `completed`。 修了済みステージも受講者のステージ一覧に並ぶため、
 *    `active` だけにすると一覧に出ているステージの資料が 404 になる)
 */
async function assertMaterialReadable(db: Db, caller: Caller, lessonId: string): Promise<void> {
  const info = await lessonStageInfo(db, lessonId);
  if (!info) {
    throw new ApiError("レッスンが見つかりません", 404);
  }
  if (isStaffRole(caller.role)) return;
  if (info.stageStatus !== "published") {
    throw new ApiError("レッスンが見つかりません", 404);
  }
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.stageId, info.stageId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .limit(1);
  if (!enrolled[0]) throw new ApiError("レッスンが見つかりません", 404);
}

function requireBucket(env: Env): NonNullable<Env["MATERIALS_BUCKET"]> {
  const bucket = env.MATERIALS_BUCKET;
  if (!bucket) {
    throw new ApiError("教材ストレージ (R2 バインディング MATERIALS_BUCKET) が未設定です", 503);
  }
  return bucket;
}

/**
 * ステージ全体の配布資料の閲覧認可。 レッスン単位 (`assertMaterialReadable`) と同基準を
 * ステージ行に対して直接適用する。
 */
async function assertStageMaterialsReadable(
  db: Db,
  caller: Caller,
  stageId: string,
): Promise<void> {
  const rows = await db
    .select({ status: stages.status })
    .from(stages)
    .where(eq(stages.id, stageId))
    .limit(1);
  const stage = rows[0];
  if (!stage) {
    throw new ApiError("ステージが見つかりません", 404);
  }
  if (isStaffRole(caller.role)) return;
  if (stage.status !== "published") {
    throw new ApiError("ステージが見つかりません", 404);
  }
  const enrolled = await db
    .select({ id: enrollments.id })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.userId, caller.id),
        eq(enrollments.stageId, stageId),
        inArray(enrollments.status, [...READABLE_ENROLLMENT_STATUSES]),
      ),
    )
    .limit(1);
  if (!enrolled[0]) throw new ApiError("ステージが見つかりません", 404);
}

materialsRoute.get("/api/materials", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const lessonId = c.req.query("lessonId");
    const stageId = c.req.query("stageId");
    const listed = listedMaterials(caller, c.req.query("includeArchived"));

    // ステージ単位: レッスン → セクション → ステージの join で束ねて返す (Issue #77)。
    if (stageId) {
      await assertStageMaterialsReadable(db, caller, stageId);
      const rows = await db
        .select({
          material: lessonMaterials,
          lessonTitle: lessons.title,
          sectionTitle: sections.title,
        })
        .from(lessonMaterials)
        .innerJoin(lessons, eq(lessons.id, lessonMaterials.lessonId))
        .innerJoin(sections, eq(sections.id, lessons.sectionId))
        .where(and(eq(sections.stageId, stageId), listed))
        .orderBy(asc(sections.order), asc(lessons.order), asc(lessonMaterials.createdAt));
      return c.json({
        rows: rows.map((r) => ({
          ...materialToRow(r.material),
          lesson_title: r.lessonTitle,
          section_title: r.sectionTitle,
        })),
      });
    }

    if (!lessonId) throw new ApiError("lessonId または stageId が必要です", 400);

    await assertMaterialReadable(db, caller, lessonId);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(and(eq(lessonMaterials.lessonId, lessonId), listed))
      .orderBy(asc(lessonMaterials.createdAt));
    return c.json({ rows: rows.map(materialToRow) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 手動アップロード資料の配信を切り替える。行と R2 のファイルは残す。 */
materialsRoute.patch("/api/materials/:id", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const body: unknown = await c.req.json().catch(() => null);
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      Object.keys(body).length !== 1 ||
      !("archived" in body) ||
      typeof body.archived !== "boolean"
    ) {
      throw new ApiError("archived に真偽値を指定してください", 400);
    }
    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material || !(await lessonStageInfo(db, material.lessonId))) {
      throw new ApiError("資料が見つかりません", 404);
    }
    if (material.source === "auto") {
      throw new ApiError("教材から作る資料は教材の変更で配信が決まります", 400);
    }
    if ((material.archivedAt !== null) === body.archived) {
      return c.json({ row: materialToRow(material) });
    }
    const archivedAt = body.archived ? new Date() : null;
    await db.batch([
      db.update(lessonMaterials).set({ archivedAt }).where(eq(lessonMaterials.id, material.id)),
      auditLogInsert(db, caller, {
        action: body.archived ? "material_withdraw" : "material_restore",
        targetType: "lesson_material",
        targetId: material.id,
        metadata: { lesson_id: material.lessonId, file_name: material.fileName },
        ip: clientIp(c),
      }),
    ]);
    return c.json({ row: materialToRow({ ...material, archivedAt }) });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/**
 * 自動生成資料 (source=auto) の版履歴。**staff のみ** — 旧版は「編集前の文面の
 * 読み上げ」と同じ理屈で受講者には渡さない (受講者は常に最新版のみ)。
 * R2 キー (path) は返さない — ダウンロードは常に id + version のプロキシ経由。
 */
materialsRoute.get("/api/materials/:id/versions", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material) throw new ApiError("資料が見つかりません", 404);
    const info = await lessonStageInfo(db, material.lessonId);
    if (!info) {
      throw new ApiError("資料が見つかりません", 404);
    }

    const versions = await db
      .select({
        version: lessonMaterialVersions.version,
        sourceHash: lessonMaterialVersions.sourceHash,
        lessonRevision: lessonMaterialVersions.lessonRevision,
        sizeBytes: lessonMaterialVersions.sizeBytes,
        createdAt: lessonMaterialVersions.createdAt,
      })
      .from(lessonMaterialVersions)
      .where(eq(lessonMaterialVersions.materialId, material.id))
      .orderBy(desc(lessonMaterialVersions.version));
    return c.json({
      rows: versions.map((v) => ({
        version: v.version,
        source_hash: v.sourceHash,
        lesson_revision: v.lessonRevision,
        size_bytes: v.sizeBytes,
        created_at: v.createdAt,
      })),
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

/** 指定した版のダウンロード (staff のみ)。旧版の R2 オブジェクトは全版残っている。 */
materialsRoute.get("/api/materials/:id/versions/:version/download", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    requireRole(caller, "instructor", "admin", "platform_admin");
    const bucket = requireBucket(c.env);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material) throw new ApiError("資料が見つかりません", 404);
    const info = await lessonStageInfo(db, material.lessonId);
    if (!info) {
      throw new ApiError("資料が見つかりません", 404);
    }

    const versionNo = Number(c.req.param("version"));
    if (!Number.isInteger(versionNo) || versionNo < 1) {
      throw new ApiError("版番号が不正です", 400);
    }
    const versions = await db
      .select()
      .from(lessonMaterialVersions)
      .where(
        and(
          eq(lessonMaterialVersions.materialId, material.id),
          eq(lessonMaterialVersions.version, versionNo),
        ),
      )
      .limit(1);
    const version = versions[0];
    if (!version) throw new ApiError("指定した版が見つかりません", 404);

    const object = await bucket.get(version.path);
    if (!object) throw new ApiError("資料の実体が見つかりません", 404);

    // ファイル名に版番号を差し込む (`1-1 まとめ (v2).pdf`)。
    const versionedName = material.fileName.replace(/(\.[^.]+)?$/, ` (v${version.version})$1`);
    const encoded = encodeURIComponent(versionedName).replace(/'/g, "%27");
    return new Response(object.body, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Length": String(object.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});

materialsRoute.get("/api/materials/:id/download", async (c) => {
  try {
    const { caller, db } = await getCaller(c);
    const bucket = requireBucket(c.env);

    const rows = await db
      .select()
      .from(lessonMaterials)
      .where(eq(lessonMaterials.id, c.req.param("id")))
      .limit(1);
    const material = rows[0];
    if (!material) throw new ApiError("資料が見つかりません", 404);

    await assertMaterialReadable(db, caller, material.lessonId);
    // 作らなくなった資料・staff が配信から外した資料は受講者に渡さない (旧版と同じく staff だけが取れる)。
    if (material.archivedAt && !isStaffRole(caller.role))
      throw new ApiError("資料が見つかりません", 404);

    const object = await bucket.get(material.path);
    if (!object) throw new ApiError("資料の実体が見つかりません", 404);

    // 日本語ファイル名は RFC 5987 (filename*) でエンコードして返す。
    const encoded = encodeURIComponent(material.fileName).replace(/'/g, "%27");
    return new Response(object.body, {
      headers: {
        "Content-Type": material.mimeType || "application/octet-stream",
        "Content-Length": String(object.size),
        "Content-Disposition": `attachment; filename*=UTF-8''${encoded}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(c, err);
  }
});
